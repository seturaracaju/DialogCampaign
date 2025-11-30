
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
import { InputField, SelectField, DatalistInputField, CustomSelect } from '../components/FormControls';
import ViewLeadModal from '../components/ViewLeadModal';
import { StatusBadge, TagBadge } from '../components/Badges';
import DAIActionsModal from '../components/DAIActionsModal';
import AutomationModal from '../components/AutomationModal';

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
            if (!initialData.id) { // New lead
                if (!initialData.data_origem) {
                    initialData.data_origem = new Date().toISOString().split('T')[0];
                }
                if(!initialData.status) {
                    initialData.status = 'Novo Lead';
                }
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
                <InputField label="Área de Atuação" value={formData.atuacao || ''} onChange={val => handleChange('atuacao', val)} />
                <SelectField label="Status" value={formData.status || ''} onChange={val => handleChange('status', val as Lead['status'])} options={[
                    { value: 'Novo Lead', label: 'Novo Lead' },
                    { value: 'Em Atendimento', label: 'Em Atendimento' },
                    { value: 'Atendimento Humano', label: 'Atendimento Humano' },
                    { value: 'App Download', label: 'App Download' },
                    { value: 'Campanha MKT', label: 'Campanha MKT' },
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

const BulkEditModal = ({ isOpen, onClose, onSave, availableTags }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Omit<Lead, 'id'>>) => Promise<void>, availableTags: string[] }) => {
    const [formData, setFormData] = useState({
        status: '',
        tag_plano_de_interesse: '',
        atuacao: '',
        origem: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({ status: '', tag_plano_de_interesse: '', atuacao: '', origem: '' });
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        const dataToSave: Partial<Omit<Lead, 'id'>> = {};
        if (formData.status) dataToSave.status = formData.status as Lead['status'];
        if (formData.tag_plano_de_interesse) dataToSave.tag_plano_de_interesse = formData.tag_plano_de_interesse;
        if (formData.atuacao) dataToSave.atuacao = formData.atuacao;
        if (formData.origem) dataToSave.origem = formData.origem;

        await onSave(dataToSave);
        setIsSaving(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Leads em Massa">
            <p className="text-sm text-gray-400 mb-4">Preencha apenas os campos que deseja alterar para os leads selecionados. Campos em branco não serão modificados.</p>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <SelectField 
                    label="Novo Status" 
                    value={formData.status} 
                    onChange={val => setFormData(prev => ({ ...prev, status: val }))} 
                    options={[
                        { value: '', label: 'Não alterar' },
                        { value: 'Novo Lead', label: 'Novo Lead' },
                        { value: 'Em Atendimento', label: 'Em Atendimento' },
                        { value: 'Atendimento Humano', label: 'Atendimento Humano' },
                        { value: 'App Download', label: 'App Download' },
                        { value: 'Campanha MKT', label: 'Campanha MKT' },
                        { value: 'active', label: 'Ativo' }, 
                        { value: 'inactive', label: 'Inativo' }
                    ]} 
                />
                <DatalistInputField 
                    label="Novo Plano de Interesse (Tag)" 
                    value={formData.tag_plano_de_interesse} 
                    onChange={val => setFormData(prev => ({ ...prev, tag_plano_de_interesse: val }))} 
                    options={availableTags} 
                />
                <InputField 
                    label="Nova Área de Atuação" 
                    value={formData.atuacao} 
                    onChange={val => setFormData(prev => ({ ...prev, atuacao: val }))} 
                />
                <InputField 
                    label="Nova Origem" 
                    value={formData.origem} 
                    onChange={val => setFormData(prev => ({ ...prev, origem: val }))} 
                />
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


// --- Kanban Board Component with Drag and Drop ---
const KanbanBoard = ({ leads, onLeadClick, onStatusChange }: { leads: Lead[], onLeadClick: (l: Lead) => void, onStatusChange: (l: Lead, newStatus: Lead['status']) => void }) => {
    const columns: Lead['status'][] = ['Novo Lead', 'Em Atendimento', 'Atendimento Humano', 'Campanha MKT', 'App Download'];
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<Lead['status'] | null>(null);

    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
        // Add a class to styling if needed, or set ghost image
    };

    const handleDragOver = (e: React.DragEvent, status: Lead['status']) => {
        e.preventDefault(); // Necessary to allow dropping
        setDragOverColumn(status);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, targetStatus: Lead['status']) => {
        e.preventDefault();
        setDragOverColumn(null);
        
        if (draggedLead && draggedLead.status !== targetStatus) {
            onStatusChange(draggedLead, targetStatus);
        }
        setDraggedLead(null);
    };

    return (
        <div className="flex overflow-x-auto gap-4 pb-4 select-none">
            {columns.map(status => (
                <div 
                    key={status} 
                    className={`min-w-[280px] w-72 rounded-xl flex flex-col h-[calc(100vh-250px)] transition-colors duration-200 ${
                        dragOverColumn === status ? 'bg-[#2a2a2a] ring-2 ring-[#D99B54] ring-opacity-50' : 'bg-[#191919]'
                    }`}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                >
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 rounded-t-xl z-10 bg-inherit">
                        <h3 className="font-semibold text-white">{status}</h3>
                        <span className="bg-[#2a2a2a] text-xs px-2 py-1 rounded-full text-gray-400">
                            {leads.filter(l => l.status === status).length}
                        </span>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                        {leads.filter(l => l.status === status).map(lead => (
                            <div 
                                key={lead.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead)}
                                onClick={() => onLeadClick(lead)}
                                className={`bg-[#2a2a2a] p-3 rounded-lg border border-transparent hover:border-[#D99B54] cursor-grab active:cursor-grabbing transition-all shadow-sm group relative ${
                                    draggedLead?.id === lead.id ? 'opacity-50 border-dashed border-gray-500' : ''
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-white truncate pr-2">{lead.nome || 'Sem Nome'}</span>
                                    {lead.tag_plano_de_interesse && (
                                        <span className="text-[10px] bg-[#0A0A0A] text-gray-400 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                            {lead.tag_plano_de_interesse}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400 mb-2">
                                    {lead.telefone || 'Sem telefone'}
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500">
                                    <span>{new Date(lead.data_origem || '').toLocaleDateString('pt-BR')}</span>
                                    <span>{lead.origem || 'Origem?'}</span>
                                </div>
                                
                                {/* Keep arrows for accessibility/mobile or as alternative */}
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    {status !== 'Novo Lead' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onStatusChange(lead, 'Novo Lead'); }}
                                            className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded" title="Mover para Novo Lead"
                                        >
                                            ←
                                        </button>
                                    )}
                                    {status !== 'Atendimento Humano' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onStatusChange(lead, 'Atendimento Humano'); }}
                                            className="bg-[#D99B54] hover:bg-[#c78f4a] text-black p-1 rounded" title="Mover para Atendimento Humano"
                                        >
                                            →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {leads.filter(l => l.status === status).length === 0 && (
                            <div className="text-center py-4 text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-lg pointer-events-none">
                                Arraste leads aqui
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// --- Main View Component ---

const ViewLeads = () => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { syncTrigger } = useSync();

  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [atuacaoFilter, setAtuacaoFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  
  const [sortColumn, setSortColumn] = useState<'nome' | 'data_origem'>('data_origem');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalState, setModalState] = useState<'view' | 'edit' | 'delete' | 'add' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set<number>());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDAIActionsModalOpen, setIsDAIActionsModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const LEADS_PER_PAGE = 100;

  // Automation Modal State
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [automationTargetLead, setAutomationTargetLead] = useState<Lead | null>(null);
  const [automationNewStatus, setAutomationNewStatus] = useState<string>('');

  const fetchLeadsAndTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) { setError("Cliente Supabase não configurado."); setLoading(false); return; }
    
    try {
        const [leadsRes, campaignTagsRes, leadTagsRes] = await Promise.all([
            supabase.from('leads').select('*'),
            supabase.from('campanhas').select('tag_alvo'),
            supabase.from('leads').select('tag_plano_de_interesse')
        ]);

        if (leadsRes.error) throw leadsRes.error;
        if (campaignTagsRes.error) throw campaignTagsRes.error;
        if (leadTagsRes.error) throw leadTagsRes.error;

        setLeads(leadsRes.data as Lead[]);

        const campaignTags = campaignTagsRes.data?.map(t => t.tag_alvo).filter(Boolean) as string[] || [];
        const leadTags = leadTagsRes.data?.map(t => t.tag_plano_de_interesse).filter(Boolean) as string[] || [];
        
        const allTags = [...campaignTags, ...leadTags];
        const tagMap = new Map<string, string>();
        allTags.forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
                tagMap.set(trimmedTag.toLowerCase(), trimmedTag);
            }
        });
        const uniqueTags = Array.from(tagMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        setAvailableTags(uniqueTags);

    } catch (e: any) {
        setError(e.message);
        console.error("Error fetching leads and tags:", e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeadsAndTags();
    if (!supabase) return;
    const channel = supabase.channel('public:leads:tags').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeadsAndTags()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeadsAndTags, syncTrigger]);
  
  const filterOptions = useMemo(() => {
    const origins = [...new Set(leads.map(lead => lead.origem).filter(Boolean).sort())];
    const atuacoes = [...new Set(leads.map(lead => lead.atuacao).filter(Boolean).sort())];
    const months = [...new Set(leads.map(lead => lead.data_origem ? lead.data_origem.substring(0, 7) : null).filter(Boolean))].sort().reverse() as string[];
    const statuses = [
        { value: 'Novo Lead', label: 'Novo Lead' },
        { value: 'Em Atendimento', label: 'Em Atendimento' },
        { value: 'Atendimento Humano', label: 'Atendimento Humano' },
        { value: 'App Download', label: 'App Download' },
        { value: 'Campanha MKT', label: 'Campanha MKT' },
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativo' }
    ];
    return { tags: availableTags, origins, statuses, atuacoes, months };
  }, [leads, availableTags]);

  const sortedAndFilteredLeads = useMemo(() => {
    let processedLeads = leads.filter(lead => {
        const searchMatch = (lead.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter ? lead.status === statusFilter : true;
        const tagMatch = tagFilter ? lead.tag_plano_de_interesse === tagFilter : true;
        const originMatch = originFilter ? lead.origem === originFilter : true;
        const atuacaoMatch = atuacaoFilter ? lead.atuacao === atuacaoFilter : true;
        const monthMatch = monthFilter ? (lead.data_origem || '').startsWith(monthFilter) : true;
        return searchMatch && statusMatch && tagMatch && originMatch && atuacaoMatch && monthMatch;
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
  }, [leads, searchTerm, statusFilter, tagFilter, originFilter, atuacaoFilter, monthFilter, sortColumn, sortDirection]);
  
  const selectedLeadsData = useMemo(() => {
    return leads.filter(lead => selectedLeadIds.has(lead.id));
  }, [leads, selectedLeadIds]);


  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tagFilter, originFilter, atuacaoFilter, monthFilter]);

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

  // --- Automation Logic ---
  const handleKanbanStatusChange = async (lead: Lead, newStatus: Lead['status']) => {
      // Open Automation Modal to confirm sending a message
      setAutomationTargetLead(lead);
      setAutomationNewStatus(newStatus);
      setIsAutomationOpen(true);
  };

  const executeAutomation = async (message: string) => {
      if (!automationTargetLead || !supabase) return;

      const instance = localStorage.getItem('dialog_zapi_instance');
      const token = localStorage.getItem('dialog_zapi_token');

      // 1. Send Message if configured
      if (instance && token && message.trim()) {
           const phone = automationTargetLead.telefone?.replace(/\D/g, '');
           if (phone) {
               try {
                   const finalPhone = phone.length <= 11 ? '55' + phone : phone;
                   await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                           phone: finalPhone,
                           message: message
                       })
                   });
                   
                   // Log message in DB
                   await supabase.from('mensagens').insert([{
                       lead_id: automationTargetLead.id,
                       conteudo: message,
                       tipo: 'text',
                       direcao: 'outbound',
                       created_at: new Date().toISOString()
                   }]);

               } catch (e) {
                   console.error("Failed to send automation message:", e);
                   alert("Falha ao enviar mensagem automática, mas o status será atualizado.");
               }
           }
      }

      // 2. Update Status
      await handleSaveLead({ id: automationTargetLead.id, status: automationNewStatus as Lead['status'] });
      
      // Close Modal
      setIsAutomationOpen(false);
      setAutomationTargetLead(null);
  };

  const skipAutomation = async () => {
      if (!automationTargetLead) return;
      // Just update status, no message
      await handleSaveLead({ id: automationTargetLead.id, status: automationNewStatus as Lead['status'] });
      setIsAutomationOpen(false);
      setAutomationTargetLead(null);
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

  const handleBulkUpdate = async (updateData: Partial<Omit<Lead, 'id'>>) => {
    if (!supabase || selectedLeadIds.size === 0) return;
    
    if (Object.keys(updateData).length === 0) {
        alert("Nenhum campo foi preenchido para atualização.");
        return;
    }

    setIsSubmitting(true);
    const idsToUpdate = Array.from(selectedLeadIds);
    const { error } = await supabase.from('leads').update(updateData).in('id', idsToUpdate);

    if (error) {
        alert(`Erro ao atualizar leads: ${error.message}`);
    } else {
        alert(`${idsToUpdate.length} leads atualizados com sucesso!`);
        setSelectedLeadIds(new Set());
        setIsBulkEditModalOpen(false);
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
                  <button onClick={() => setIsBulkEditModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-opacity text-sm">
                      <PencilIcon className="w-4 h-4" />
                      Editar em Massa
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
                  {viewMode === 'list' && (
                    <>
                        <CustomSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.statuses} placeholder="Filtrar por Status" />
                        <CustomSelect value={tagFilter} onChange={setTagFilter} options={filterOptions.tags.map(tag => ({ value: tag, label: tag }))} placeholder="Filtrar por Tag" />
                        <CustomSelect value={originFilter} onChange={setOriginFilter} options={filterOptions.origins.map(o => ({ value: o, label: o }))} placeholder="Filtrar por Origem" />
                        <CustomSelect value={atuacaoFilter} onChange={setAtuacaoFilter} options={filterOptions.atuacoes.map(a => ({ value: a, label: a }))} placeholder="Filtrar por Área" />
                        <CustomSelect value={monthFilter} onChange={setMonthFilter} options={filterOptions.months.map(m => ({ value: m, label: m }))} placeholder="Filtrar por Mês" />
                    </>
                  )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                   <div className="bg-[#0A0A0A] p-1 rounded-lg flex items-center">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400'}`}>Lista</button>
                        <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400'}`}>Kanban</button>
                   </div>
                   <button onClick={() => setModalState('add')} className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity">
                      Adicionar Lead
                  </button>
              </div>
          </div>
        )}

        {viewMode === 'list' ? (
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
                            ref={el => { if (el) { el.indeterminate = selectedLeadIds.size > 0 && !isAllSelected; } }}
                        />
                    </th>
                    <SortableHeader title="Nome" columnId="nome" />
                    <th className="p-3">Plano de Interesse</th>
                    <th className="p-3">Telefone</th>
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
        ) : (
            <KanbanBoard 
                leads={sortedAndFilteredLeads} 
                onLeadClick={(l) => { setSelectedLead(l); setModalState('view'); }}
                onStatusChange={handleKanbanStatusChange}
            />
        )}
      </div>

      <ViewLeadModal lead={selectedLead} isOpen={modalState === 'view'} onClose={() => setModalState(null)} />
      <AddEditLeadModal lead={modalState === 'add' ? {} : selectedLead} isOpen={modalState === 'add' || modalState === 'edit'} onClose={() => setModalState(null)} onSave={handleSaveLead} availableTags={filterOptions.tags} />
      <DeleteConfirmModal isOpen={modalState === 'delete'} onClose={() => setModalState(null)} onConfirm={handleDeleteLead} isDeleting={isSubmitting}>
        <p className="text-gray-300">Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>
      </DeleteConfirmModal>
      <BulkEditModal 
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onSave={handleBulkUpdate}
        availableTags={filterOptions.tags}
      />
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
      <AutomationModal 
        isOpen={isAutomationOpen}
        onClose={() => setIsAutomationOpen(false)}
        onConfirm={executeAutomation}
        onSkip={skipAutomation}
        lead={automationTargetLead}
        newStatus={automationNewStatus}
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
        const headers = ['nome', 'email', 'telefone', 'tag_plano_de_interesse', 'origem', 'atuacao', 'data_origem'];
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
        
        const existingPhones = new Set(existingLeads.map(lead => lead.telefone ? String(lead.telefone).replace(/\D/g, '') : null).filter(Boolean) as string[]);

        const newLeads: Omit<Lead, 'id' | 'created_at'>[] = [];
        let skippedCount = 0;

        for (const row of jsonData) {
            const phone = row.telefone ? String(row.telefone).replace(/\D/g, '') : null;
            if (phone && existingPhones.has(phone)) {
                skippedCount++;
                continue;
            }

            const newLead: Omit<Lead, 'id' | 'created_at'> = {
                nome: row.nome || null,
                email: row.email || null,
                telefone: row.telefone || null,
                tag_plano_de_interesse: row.tag_plano_de_interesse || null,
                origem: row.origem || null,
                atuacao: row.atuacao || null,
                status: 'Novo Lead',
                data_origem: row.data_origem && !isNaN(new Date(row.data_origem).getTime()) ? new Date(row.data_origem).toISOString() : new Date().toISOString(),
                ultima_mensagem: null,
                mensagem: null,
                resumo_ia: null,
                conversa_id: null,
            };
            newLeads.push(newLead);
        }

        if (newLeads.length > 0) {
            const { error: insertError } = await supabase.from('leads').insert(newLeads);
            if (insertError) throw insertError;

            let successMessage = `${newLeads.length} novos leads importados com sucesso.`;
            if (skippedCount > 0) {
                successMessage += ` ${skippedCount} leads foram ignorados pois já existem.`;
            }
            setFeedback({ type: 'success', message: successMessage });
            triggerSync();
        } else {
            setFeedback({ type: 'error', message: "Nenhum novo lead para importar. Todos os leads do arquivo já existem ou não possuem telefone." });
        }
    };
    
    const handleUpdateExisting = async (jsonData: any[]) => {
        if (!supabase) throw new Error("Supabase client not available.");

        const updates = [];
        const notFoundPhones: string[] = [];

        const { data: allLeads, error: fetchError } = await supabase.from('leads').select('id, telefone');
        if (fetchError) throw fetchError;

        const phoneToIdMap = new Map<string, number>();
        allLeads.forEach(lead => {
            if (lead.telefone) {
                const cleanPhone = String(lead.telefone).replace(/\D/g, '');
                if (cleanPhone) phoneToIdMap.set(cleanPhone, lead.id);
            }
        });

        for (const row of jsonData) {
            const rowPhone = row.telefone ? String(row.telefone).replace(/\D/g, '') : null;
            if (rowPhone && phoneToIdMap.has(rowPhone)) {
                const leadId = phoneToIdMap.get(rowPhone)!;
                const updateData: Partial<Lead> = {};
                
                if (row.nome !== undefined) updateData.nome = row.nome;
                if (row.email !== undefined) updateData.email = row.email;
                if (row.tag_plano_de_interesse !== undefined) updateData.tag_plano_de_interesse = row.tag_plano_de_interesse;
                if (row.origem !== undefined) updateData.origem = row.origem;
                if (row.atuacao !== undefined) updateData.atuacao = row.atuacao;
                if (row.data_origem !== undefined && row.data_origem && !isNaN(new Date(row.data_origem).getTime())) {
                     try {
                        updateData.data_origem = new Date(row.data_origem).toISOString();
                    } catch (e) { /* ignore invalid date */ }
                }
                if (row.status !== undefined) updateData.status = row.status as Lead['status'];

                if (Object.keys(updateData).length > 0) {
                    updates.push(supabase.from('leads').update(updateData).eq('id', leadId));
                }
            } else if (rowPhone) {
                notFoundPhones.push(rowPhone);
            }
        }

        if (updates.length > 0) {
            const results = await Promise.all(updates);
            const updateErrors = results.filter(res => res.error);

            if (updateErrors.length > 0) {
                console.error('Update errors:', updateErrors.map(e => e.error));
                throw new Error(`Ocorreram erros ao atualizar ${updateErrors.length} leads.`);
            }
            
            let successMessage = `${results.length - updateErrors.length} leads atualizados com sucesso.`;
            if (notFoundPhones.length > 0) {
                successMessage += ` ${notFoundPhones.length} leads não foram encontrados e foram ignorados.`;
            }
            setFeedback({ type: 'success', message: successMessage });
            triggerSync();

        } else if (notFoundPhones.length > 0) {
            setFeedback({ type: 'error', message: `Nenhum lead correspondente encontrado para atualização. ${notFoundPhones.length} leads do arquivo não foram encontrados na base.` });
        } else {
             setFeedback({ type: 'error', message: "Nenhum lead para atualizar. Verifique os números de telefone no arquivo." });
        }
    };

    return (
        <div className="bg-[#191919] p-6 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-semibold text-lg mb-2">Importar planilha (.xlsx)</h3>
                    <p className="text-sm text-gray-400 mb-4">Adicione ou atualize leads em massa. Baixe o modelo para ver o formato correto.</p>
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                        className={`border-2 border-dashed ${isDragOver ? 'border-[#D99B54]' : 'border-gray-600'} rounded-lg p-8 text-center cursor-pointer transition-colors`}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <p className="text-gray-400">{file ? file.name : 'Arraste e solte o arquivo aqui, ou clique para selecionar.'}</p>
                        </label>
                    </div>
                    <button onClick={handleDownloadTemplate} className="text-sm text-[#D99B54] mt-4 hover:underline">
                        Baixar modelo de planilha
                    </button>
                </div>
                <div>
                    <h3 className="font-semibold text-lg mb-2">Opções de Importação</h3>
                    <div className="bg-[#0A0A0A] p-2 rounded-lg flex items-center mb-4">
                        <button
                            onClick={() => setImportMode('new')}
                            className={`flex-1 py-2 text-sm rounded-md ${importMode === 'new' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400'}`}
                        >
                            Adicionar Novos Leads
                        </button>
                        <button
                            onClick={() => setImportMode('update')}
                            className={`flex-1 py-2 text-sm rounded-md ${importMode === 'update' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400'}`}
                        >
                            Atualizar Leads Existentes
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">
                        {importMode === 'new'
                            ? 'Apenas novos leads (identificados pelo telefone) serão adicionados. Leads existentes serão ignorados.'
                            : 'Leads existentes (identificados pelo telefone) serão atualizados com os dados da planilha. Novos leads serão ignorados.'}
                    </p>
                    <button
                        onClick={handleProcessFile}
                        disabled={!file || isProcessing}
                        className="w-full py-3 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isProcessing ? 'Processando...' : 'Iniciar Importação'}
                    </button>
                    {feedback && (
                        <div className={`mt-4 p-3 rounded-md text-sm text-center ${feedback.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                            {feedback.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Fix: Added a wrapper component and default export to resolve the module import error.
const Leads = () => {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-[#F5F5F5]">Gerenciamento de Leads</h1>
            <ViewLeads />
            <div className="mt-8">
                 <h2 className="text-2xl font-semibold text-[#F5F5F5] mb-4">Importar Leads</h2>
                 <ImportLeads />
            </div>
        </div>
    );
};

export default Leads;
