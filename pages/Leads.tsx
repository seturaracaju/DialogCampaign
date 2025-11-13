import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useSync } from '../App';
import * as XLSX from 'xlsx';
import EyeIcon from '../components/icons/EyeIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import Modal from '../components/Modal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { InputField, SelectField, DatalistInputField } from '../components/FormControls';
import ViewLeadModal from '../components/ViewLeadModal';
import { StatusBadge, TagBadge } from '../components/Badges';
import DAIActionsModal from '../components/DAIActionsModal';

// --- Helper Components ---

const EmptyCell = () => <div className="flex justify-center items-center h-full"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div></div>;

const formatDateForInput = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Adjust for timezone offset to prevent date shifting
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() + tzOffset);
        return localDate.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

// --- Modals ---

const AddEditLeadModal = ({ lead, isOpen, onClose, onSave, availableTags }: { lead: Lead | Partial<Lead> | null, isOpen: boolean, onClose: () => void, onSave: (leadData: Partial<Lead>) => Promise<void>, availableTags: string[] }) => {
    const [formData, setFormData] = useState<Partial<Lead> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const initialData = lead || {};
            if (!initialData.id && !initialData.data_origem) {
                // Default date for new leads
                initialData.data_origem = new Date().toISOString().split('T')[0];
            }
            setFormData(initialData);
        } else {
            setFormData(null);
        }
    }, [isOpen, lead]);

    if (!formData) return null;

    const isEditing = 'id' in formData && formData.id;

    const handleChange = (field: keyof Lead, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Lead" : "Adicionar Novo Lead"}>
             <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <InputField label="Nome Completo" value={formData.nome || ''} onChange={val => handleChange('nome', val)} />
                <InputField label="Email" type="email" value={formData.email || ''} onChange={val => handleChange('email', val)} />
                <InputField label="Telefone" value={formData.telefone || ''} onChange={val => handleChange('telefone', val)} />
                <InputField label="Data de Origem" type="date" value={formatDateForInput(formData.data_origem)} onChange={val => handleChange('data_origem', val)} />
                <DatalistInputField label="Plano de Interesse (Tag)" value={formData.tag_plano_de_interesse || ''} onChange={val => handleChange('tag_plano_de_interesse', val)} options={availableTags} />
                <InputField label="Origem" value={formData.origem || ''} onChange={val => handleChange('origem', val)} />
                <InputField label="Unidade de Origem" value={formData.unidade_origem || ''} onChange={val => handleChange('unidade_origem', val)} />
                <InputField label="Área de Atuação" value={formData.atuacao || ''} onChange={val => handleChange('atuacao', val)} />
                <SelectField label="Status" value={formData.status || 'Novo Lead'} onChange={val => handleChange('status', val as Lead['status'])} options={[
                    { value: 'Novo Lead', label: 'Novo Lead' },
                    { value: 'Atendimento Humano', label: 'Atendimento Humano' },
                    { value: 'active', label: 'Ativo' }, 
                    { value: 'inactive', label: 'Inativo' }
                ]} />
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600">Cancelar</button>
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#D99B54] text-black font-bold hover:opacity-90 disabled:opacity-50">
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </Modal>
    );
};


// --- Main View Component ---

const ViewLeads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { syncTrigger } = useSync();

  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [atuacaoFilter, setAtuacaoFilter] = useState('');
  const [unidadeOrigemFilter, setUnidadeOrigemFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  
  const [sortColumn, setSortColumn] = useState<'nome' | 'data_origem'>('data_origem');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalState, setModalState] = useState<'view' | 'edit' | 'delete' | 'add' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set<number>());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDAIActionsModalOpen, setIsDAIActionsModalOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const LEADS_PER_PAGE = 100;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) { setError("Cliente Supabase não configurado."); setLoading(false); return; }
    
    const { data, error } = await supabase.from('leads').select('*');
    if (error) { setError(error.message); } else { setLeads(data as Lead[]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase.channel('public:leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads, syncTrigger]);
  
  const filterOptions = useMemo(() => {
    const tags = [...new Set(leads.map(lead => lead.tag_plano_de_interesse).filter(Boolean).sort())] as string[];
    const origins = [...new Set(leads.map(lead => lead.origem).filter(Boolean).sort())];
    const atuacoes = [...new Set(leads.map(lead => lead.atuacao).filter(Boolean).sort())];
    const unidadesOrigem = [...new Set(leads.map(lead => lead.unidade_origem).filter(Boolean).sort())] as string[];
    const months = [...new Set(leads.map(lead => lead.data_origem ? lead.data_origem.substring(0, 7) : null).filter(Boolean))].sort().reverse() as string[];
    const statuses = [
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
      { value: 'Novo Lead', label: 'Novo Lead' },
      { value: 'Atendimento Humano', label: 'Atendimento Humano' }
    ];
    return { tags, origins, statuses, atuacoes, unidadesOrigem, months };
  }, [leads]);

  const sortedAndFilteredLeads = useMemo(() => {
    let processedLeads = leads.filter(lead => {
        const searchMatch = (lead.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter ? lead.status === statusFilter : true;
        const tagMatch = tagFilter ? lead.tag_plano_de_interesse === tagFilter : true;
        const originMatch = originFilter ? lead.origem === originFilter : true;
        const atuacaoMatch = atuacaoFilter ? lead.atuacao === atuacaoFilter : true;
        const unidadeOrigemMatch = unidadeOrigemFilter ? lead.unidade_origem === unidadeOrigemFilter : true;
        const monthMatch = monthFilter ? (lead.data_origem || '').startsWith(monthFilter) : true;
        return searchMatch && statusMatch && tagMatch && originMatch && atuacaoMatch && unidadeOrigemMatch && monthMatch;
    });

    processedLeads.sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        if (sortColumn === 'nome') {
            return (a.nome || '').localeCompare(b.nome || '') * direction;
        }
        if (sortColumn === 'data_origem') {
            const dateA = a.data_origem ? new Date(a.data_origem).getTime() : 0;
            const dateB = b.data_origem ? new Date(b.data_origem).getTime() : 0;
            return (dateA - dateB) * direction;
        }
        return 0;
    });

    return processedLeads;
  }, [leads, searchTerm, statusFilter, tagFilter, originFilter, atuacaoFilter, unidadeOrigemFilter, monthFilter, sortColumn, sortDirection]);
  
  const selectedLeadsData = useMemo(() => {
    return leads.filter(lead => selectedLeadIds.has(lead.id));
  }, [leads, selectedLeadIds]);


  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tagFilter, originFilter, atuacaoFilter, unidadeOrigemFilter, monthFilter]);

  const { paginatedLeads, pageCount, totalFilteredLeads } = useMemo(() => {
    const total = sortedAndFilteredLeads.length;
    const pages = Math.ceil(total / LEADS_PER_PAGE);
    const startIndex = (currentPage - 1) * LEADS_PER_PAGE;
    const paginated = sortedAndFilteredLeads.slice(startIndex, startIndex + LEADS_PER_PAGE);
    return { paginatedLeads: paginated, pageCount: pages, totalFilteredLeads: total };
  }, [sortedAndFilteredLeads, currentPage]);


  const handleSaveLead = async (leadData: Partial<Lead>) => {
    if (!supabase) return;
    const isEditing = 'id' in leadData;
    const { id, ...updateData } = leadData;

    const query = isEditing
        ? supabase.from('leads').update(updateData).eq('id', id)
        : supabase.from('leads').insert([updateData]);

    const { error } = await query;
    if (error) { alert(`Erro ao salvar lead: ${error.message}`); } 
    else { setModalState(null); }
  };

  const handleDeleteLead = async () => {
    if (!supabase || !selectedLead) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id);
    if (error) { alert(`Erro ao excluir lead: ${error.message}`); } 
    else { setModalState(null); }
    setIsSubmitting(false);
  };
  
  const handleSelect = (leadId: number) => {
    setSelectedLeadIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(leadId)) {
            newSet.delete(leadId);
        } else {
            newSet.add(leadId);
        }
        return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        const allIds = new Set(sortedAndFilteredLeads.map(l => l.id));
        setSelectedLeadIds(allIds);
    } else {
        setSelectedLeadIds(new Set());
    }
  };
  
  const handleBulkDelete = async () => {
    if (!supabase || selectedLeadIds.size === 0) return;
    setIsSubmitting(true);
    const idsToDelete = Array.from(selectedLeadIds);
    const { error } = await supabase.from('leads').delete().in('id', idsToDelete);
    if (error) {
        alert(`Erro ao excluir leads: ${error.message}`);
    } else {
        setSelectedLeadIds(new Set());
        setIsBulkDeleteModalOpen(false);
    }
    setIsSubmitting(false);
  };
  
  const handleSort = (column: 'nome' | 'data_origem') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const isAllSelected = sortedAndFilteredLeads.length > 0 && selectedLeadIds.size === sortedAndFilteredLeads.length;

  const FilterSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: (string | {value: string, label: string})[], placeholder: string }) => (
    <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full sm:w-auto px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54] text-sm"
    >
        <option value="">{placeholder}</option>
        {options.map(opt => 
            typeof opt === 'string' 
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
    </select>
  );
  
  const SortableHeader = ({ title, columnId }: { title: string; columnId: 'nome' | 'data_origem' }) => (
      <th className="p-3 cursor-pointer select-none" onClick={() => handleSort(columnId)}>
          <div className="flex items-center">
            <span>{title}</span>
            {sortColumn === columnId && (
                <span className="ml-2 text-xs">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
            )}
          </div>
      </th>
  );

  if (loading) return <div className="bg-[#191919] rounded-xl p-8 text-center text-[#A1A1AA]">Carregando leads...</div>;
  if (error) return <div className="bg-[#191919] rounded-xl p-8 text-center text-red-400">Erro ao carregar leads: {error}</div>;

  return (
    <>
      <div className="bg-[#191919] p-2 sm:p-4 md:p-6 rounded-xl">
        {selectedLeadIds.size > 0 ? (
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-[#2a2a2a] p-3 rounded-lg">
              <span className="font-semibold">{selectedLeadIds.size} lead(s) selecionado(s)</span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                   <button onClick={() => setIsDAIActionsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity text-sm">
                      <SparklesIcon className="w-4 h-4" />
                      Ações com DAI
                  </button>
                  <button onClick={() => setIsBulkDeleteModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-opacity text-sm">
                      <TrashIcon className="w-4 h-4" />
                      Deletar Selecionados
                  </button>
                  <button onClick={() => setSelectedLeadIds(new Set())} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-opacity text-sm">
                      Cancelar
                  </button>
              </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full">
                  <input
                      type="text"
                      placeholder="Buscar por nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:max-w-xs px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]"
                  />
                  <FilterSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.statuses} placeholder="Filtrar por Status" />
                  <FilterSelect value={tagFilter} onChange={setTagFilter} options={filterOptions.tags} placeholder="Filtrar por Tag" />
                  <FilterSelect value={originFilter} onChange={setOriginFilter} options={filterOptions.origins} placeholder="Filtrar por Origem" />
                  <FilterSelect value={atuacaoFilter} onChange={setAtuacaoFilter} options={filterOptions.atuacoes} placeholder="Filtrar por Área" />
                  <FilterSelect value={unidadeOrigemFilter} onChange={setUnidadeOrigemFilter} options={filterOptions.unidadesOrigem} placeholder="Filtrar por Unidade" />
                  <FilterSelect value={monthFilter} onChange={setMonthFilter} options={filterOptions.months} placeholder="Filtrar por Mês" />
              </div>
               <button onClick={() => setModalState('add')} className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity">
                  Adicionar Lead
              </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-gray-700 text-[#A1A1AA] uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3 w-4">
                    <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 bg-[#0A0A0A] border-gray-600 text-[#D99B54] focus:ring-offset-0 focus:ring-2 focus:ring-[#D99B54] rounded"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        // Fix: The ref callback should not return a value. Wrap the logic in braces to fix the TypeScript error.
                        ref={el => { if (el) { el.indeterminate = selectedLeadIds.size > 0 && !isAllSelected; } }}
                    />
                </th>
                <SortableHeader title="Nome" columnId="nome" />
                <th className="p-3">Plano de Interesse</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Unidade de Origem</th>
                <SortableHeader title="Data de Origem" columnId="data_origem" />
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="text-[#F5F5F5] text-sm">
              {paginatedLeads.map(lead => (
                <tr key={lead.id} className={`border-b border-gray-800 transition-colors ${selectedLeadIds.has(lead.id) ? 'bg-[#D99B54]/10' : 'hover:bg-gray-800/50'}`}>
                  <td className="p-3 w-4">
                      <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 bg-[#0A0A0A] border-gray-600 text-[#D99B54] focus:ring-offset-0 focus:ring-2 focus:ring-[#D99B54] rounded"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => handleSelect(lead.id)}
                      />
                  </td>
                  <td className="p-3 font-medium cursor-pointer" onClick={() => { setSelectedLead(lead); setModalState('view'); }}>{lead.nome || 'N/A'}</td>
                  <td className="p-3">{lead.tag_plano_de_interesse ? <TagBadge>{lead.tag_plano_de_interesse}</TagBadge> : <EmptyCell/>}</td>
                  <td className="p-3 text-[#A1A1AA]">{lead.telefone || <EmptyCell/>}</td>
                  <td className="p-3 text-[#A1A1AA]">{lead.unidade_origem || <EmptyCell/>}</td>
                   <td className="p-3 text-[#A1A1AA]">{lead.data_origem ? new Date(`${lead.data_origem}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : <EmptyCell />}</td>
                  <td className="p-3"><StatusBadge status={lead.status} /></td>
                  <td className="p-3">
                      <div className="flex items-center gap-4 text-[#A1A1AA]">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setModalState('view'); }} className="hover:text-[#D99B54] transition-colors"><EyeIcon className="w-5 h-5"/></button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setModalState('edit'); }} className="hover:text-[#D99B54] transition-colors"><PencilIcon className="w-5 h-5"/></button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setModalState('delete'); }} className="hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {pageCount > 1 && (
            <div className="flex justify-between items-center mt-6 text-sm">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-[#2a2a2a] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                    Anterior
                </button>
                <span className="text-[#A1A1AA]">
                    Página {currentPage} de {pageCount} ({totalFilteredLeads} leads)
                </span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount}
                    className="px-4 py-2 bg-[#2a2a2a] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                    Próxima
                </button>
            </div>
        )}
      </div>

      <ViewLeadModal lead={selectedLead} isOpen={modalState === 'view'} onClose={() => setModalState(null)} />
      <AddEditLeadModal lead={modalState === 'add' ? {} : selectedLead} isOpen={modalState === 'add' || modalState === 'edit'} onClose={() => setModalState(null)} onSave={handleSaveLead} availableTags={filterOptions.tags} />
      <DeleteConfirmModal isOpen={modalState === 'delete'} onClose={() => setModalState(null)} onConfirm={handleDeleteLead} isDeleting={isSubmitting}>
        <p className="text-gray-300">Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>
      </DeleteConfirmModal>
      <DeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        isDeleting={isSubmitting}
        title={`Excluir ${selectedLeadIds.size} Lead(s)`}
      >
        <p className="text-gray-300">Tem certeza que deseja excluir os leads selecionados? Esta ação não pode ser desfeita.</p>
      </DeleteConfirmModal>
       <DAIActionsModal 
        isOpen={isDAIActionsModalOpen}
        onClose={() => setIsDAIActionsModalOpen(false)}
        selectedLeads={selectedLeadsData}
      />
    </>
  );
};

const ImportLeads = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const { triggerSync } = useSync();
    const [importMode, setImportMode] = useState<'new' | 'update'>('new');


    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile) {
            if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx')) {
                setFile(selectedFile);
                setFeedback(null);
            } else {
                setFeedback({ type: 'error', message: 'Formato de arquivo inválido. Por favor, envie um arquivo .xlsx' });
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['nome', 'email', 'telefone', 'tag_plano_de_interesse', 'origem', 'atuacao', 'data_origem', 'unidade_origem'];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Modelo Leads');
        XLSX.writeFile(wb, 'modelo_leads.xlsx');
    };

    const handleProcessFile = async () => {
        if (!file) {
            setFeedback({ type: 'error', message: 'Por favor, selecione um arquivo.' });
            return;
        }
        if (!supabase) {
            setFeedback({ type: 'error', message: 'Conexão com o banco de dados não configurada.' });
            return;
        }

        setIsProcessing(true);
        setFeedback(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonDataRaw = XLSX.utils.sheet_to_json<any>(worksheet, { defval: null });

                if (jsonDataRaw.length === 0) throw new Error("A planilha está vazia.");
                
                const jsonData = jsonDataRaw.map(row => {
                    const cleanedRow: {[key: string]: any} = {};
                    for (const key in row) {
                        cleanedRow[key.trim().toLowerCase()] = row[key];
                    }
                    return cleanedRow;
                });
                
                if (importMode === 'new') {
                    await handleImportNew(jsonData);
                } else {
                    await handleUpdateExisting(jsonData);
                }

            } catch (err: any) {
                setFeedback({ type: 'error', message: err.message || 'Ocorreu um erro ao processar o arquivo.' });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
             setFeedback({ type: 'error', message: 'Não foi possível ler o arquivo.' });
             setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    };
    
    const handleImportNew = async (jsonData: any[]) => {
        if (!supabase) throw new Error("Supabase client not available.");
        
        const { data: existingLeads, error: fetchError } = await supabase.from('leads').select('telefone');
        if (fetchError) throw fetchError;
        
        const existingPhones = new Set(existingLeads.map(lead => lead.telefone ? String(lead.telefone).replace(/\D/g, '') : ''));
        const processedInThisFile = new Set<string>();
        
        const leadsToInsert = [];
        let skippedCount = 0;

        for (const row of jsonData) {
            const rowPhone = row.telefone ? String(row.telefone).replace(/\D/g, '') : null;
            
            if (!rowPhone || existingPhones.has(rowPhone) || processedInThisFile.has(rowPhone)) {
                skippedCount++;
                continue;
            }
            processedInThisFile.add(rowPhone);

            leadsToInsert.push({
                nome: row.nome || `Lead ${rowPhone}`,
                email: row.email || null,
                telefone: rowPhone,
                tag_plano_de_interesse: row.tag_plano_de_interesse || null,
                origem: row.origem || null,
                atuacao: row.atuacao || null,
                unidade_origem: row.unidade_origem || null,
                data_origem: row.data_origem instanceof Date 
                    ? row.data_origem.toISOString().split('T')[0] 
                    : new Date().toISOString().split('T')[0],
                status: 'Novo Lead' as const
            });
        }
        
        if (leadsToInsert.length > 0) {
            const { error: insertError } = await supabase.from('leads').insert(leadsToInsert);
            if (insertError) {
                if (insertError.code === '23505') {
                     throw new Error(`Erro de duplicidade: ${insertError.message}`);
                }
                throw insertError;
            }
        }

        setFeedback({ type: 'success', message: `${leadsToInsert.length} novos leads importados com sucesso. ${skippedCount} linhas ignoradas (duplicadas).` });
        setFile(null);
        triggerSync();
    };

    const handleUpdateExisting = async (jsonData: any[]) => {
        if (!supabase) throw new Error("Supabase client not available.");

        const { data: allLeads, error: fetchAllError } = await supabase.from('leads').select('id, telefone');
        if (fetchAllError) throw fetchAllError;

        const phoneToIdMap = new Map<string, number>();
        allLeads.forEach(lead => {
            if (lead.telefone) {
                phoneToIdMap.set(String(lead.telefone).replace(/\D/g, ''), lead.id);
            }
        });

        const updates = [];
        let skippedCount = 0;

        for (const row of jsonData) {
            const rowPhone = row.telefone ? String(row.telefone).replace(/\D/g, '') : null;
            if (!rowPhone) {
                skippedCount++;
                continue;
            }

            let leadId: number | undefined;
            
            if (phoneToIdMap.has(rowPhone)) {
                 leadId = phoneToIdMap.get(rowPhone);
            } else {
                for (const [existingPhone, id] of phoneToIdMap.entries()) {
                    if (existingPhone.endsWith(rowPhone) || rowPhone.endsWith(existingPhone)) {
                        leadId = id;
                        break;
                    }
                }
            }
            
            if (!leadId) {
                skippedCount++;
                continue;
            }

            const updateData: Partial<Lead> = {};
            if (row.nome !== undefined) updateData.nome = row.nome;
            if (row.email !== undefined) updateData.email = row.email;
            if (row.tag_plano_de_interesse !== undefined) updateData.tag_plano_de_interesse = row.tag_plano_de_interesse;
            if (row.origem !== undefined) updateData.origem = row.origem;
            if (row.atuacao !== undefined) updateData.atuacao = row.atuacao;
            if (row.unidade_origem !== undefined) updateData.unidade_origem = row.unidade_origem;
            if (row.data_origem instanceof Date) updateData.data_origem = row.data_origem.toISOString().split('T')[0];
            
            if (Object.keys(updateData).length > 0) {
                 updates.push(supabase.from('leads').update(updateData).eq('id', leadId));
            } else {
                 skippedCount++;
            }
        }
        
        if (updates.length > 0) {
            const results = await Promise.all(updates);
            const errors = results.filter(res => res.error);
            if (errors.length > 0) {
                throw new Error(`Ocorreram ${errors.length} erros durante a atualização. Ex: ${errors[0].error?.message}`);
            }
        }
        
        setFeedback({ type: 'success', message: `${updates.length} leads atualizados. ${skippedCount} linhas ignoradas (telefone não encontrado ou sem dados para atualizar).` });
        setFile(null);
        triggerSync();
    };

    return (
        <Modal isOpen={true} onClose={() => {}} title="Importar Leads de um arquivo Excel">
            <div className="space-y-6">
                 <div>
                    <p className="text-center text-sm text-gray-400 mb-4">Selecione o modo de importação:</p>
                    <div className="flex justify-center bg-[#0A0A0A] p-1 rounded-lg w-fit mx-auto">
                        <button onClick={() => setImportMode('new')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${importMode === 'new' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'}`}>Importar Novos Leads</button>
                        <button onClick={() => setImportMode('update')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${importMode === 'update' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'}`}>Atualizar Leads Existentes</button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-500 max-w-md mx-auto">
                    {importMode === 'new'
                        ? "Apenas novos leads serão adicionados. Leads com telefones que já existem na sua base de dados serão ignorados."
                        : "A atualização busca os leads pelo 'telefone'. Linhas com telefones não encontrados ou sem novas informações serão ignoradas."}
                </p>

                <button onClick={handleDownloadTemplate} className="w-full text-center py-3 bg-[#2a2a2a] border border-dashed border-gray-600 rounded-lg text-[#D99B54] hover:bg-[#3a3a3a] transition-colors">
                    Baixar Modelo (.xlsx)
                </button>

                <div 
                    onDrop={handleDrop} 
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragOver ? 'border-[#D99B54] bg-[#D99B54]/10' : 'border-gray-600'}`}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input id="file-upload" type="file" accept=".xlsx" className="hidden" onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)} />
                    {file ? (
                        <p className="text-[#D99B54] font-semibold">{file.name}</p>
                    ) : (
                        <p className="text-gray-400">Arraste e solte o arquivo aqui<br/>ou clique para selecionar</p>
                    )}
                </div>

                {feedback && (
                    <div className={`p-3 rounded-lg text-center text-sm ${feedback.type === 'success' ? 'bg-green-900/70 text-green-300' : 'bg-red-900/70 text-red-300'}`}>
                        {feedback.message}
                    </div>
                )}
                
                <button 
                    onClick={handleProcessFile} 
                    disabled={isProcessing || !file} 
                    className="w-full py-3 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                    {isProcessing ? 'Processando...' : (importMode === 'new' ? 'Processar e Importar' : 'Processar e Atualizar')}
                </button>
            </div>
        </Modal>
    );
};

const Leads = () => {
    const [view, setView] = useState<'list' | 'import'>('list');
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-[#F5F5F5]">Gerenciamento de Leads</h1>
                 <div className="bg-[#191919] p-1 rounded-lg flex items-center space-x-1">
                    <button onClick={() => setView('list')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'list' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'}`}>Visualizar Leads</button>
                    <button onClick={() => setView('import')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'import' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'}`}>Importar Leads</button>
                </div>
            </div>
            {view === 'list' ? <ViewLeads /> : <ImportLeads />}
        </div>
    );
};

export default Leads;