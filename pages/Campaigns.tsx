
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Campaign } from '../types';
import { TextIcon, ImageIcon, VideoIcon } from '../components/icons/MediaIcons';
import EyeIcon from '../components/icons/EyeIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import { supabase } from '../lib/supabaseClient';
import { ai } from '../lib/gemini';
import { useSync } from '../App';
import Modal from '../components/Modal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { InputField, TextAreaField, DatalistInputField, CustomSelect, SelectField } from '../components/FormControls';
import ViewCampaignModal from '../components/ViewCampaignModal';


const StatusBadge = ({ status }: { status: Campaign['status'] }) => {
  const colorClasses = {
    'Agendada': 'bg-yellow-800/50 text-yellow-300',
    'Enviada': 'bg-green-800/50 text-green-300',
    'Rascunho': 'bg-gray-700/60 text-gray-300',
  };
  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colorClasses[status]}`}>{status}</span>;
};

const MediaIcon = ({ type }: { type: Campaign['media_type'] }) => {
    switch (type) {
        case 'text': return <TextIcon />;
        case 'image': return <ImageIcon />;
        case 'video': return <VideoIcon />;
        default: return null;
    }
};

const mediaTypeDisplayMap = {
    text: 'Texto',
    image: 'Imagem',
    video: 'Video',
};

const CampaignList = ({
    campaigns,
    loading,
    error,
    onEdit,
    onDelete,
    onView,
    selectedCampaignIds,
    onSelect,
    onSelectAll
}: {
    campaigns: Campaign[],
    loading: boolean,
    error: string | null,
    onEdit: (c: Campaign) => void,
    onDelete: (c: Campaign) => void,
    onView: (c: Campaign) => void,
    selectedCampaignIds: Set<number>,
    onSelect: (id: number) => void,
    onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => {
    if (loading) return <div className="bg-[#191919] rounded-xl p-8 text-center text-[#A1A1AA]">Carregando campanhas...</div>;
    if (error) return <div className="bg-[#191919] rounded-xl p-8 text-center text-red-400">Erro ao carregar campanhas: {error}</div>;
    if (campaigns.length === 0) return <div className="bg-[#191919] rounded-xl p-8 text-center text-[#A1A1AA]">Nenhuma campanha encontrada com os filtros aplicados.</div>;

    const isAllSelected = campaigns.length > 0 && selectedCampaignIds.size === campaigns.length;

    return (
        <div className="bg-[#191919] p-2 sm:p-4 md:p-6 rounded-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-700 text-[#A1A1AA] uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4 w-4">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-4 w-4 bg-[#0A0A0A] border-gray-600 text-[#D99B54] focus:ring-offset-0 focus:ring-2 focus:ring-[#D99B54] rounded"
                                    checked={isAllSelected}
                                    onChange={onSelectAll}
                                    ref={el => { if (el) { el.indeterminate = selectedCampaignIds.size > 0 && !isAllSelected; } }}
                                />
                            </th>
                            <th className="p-4">Nome da Campanha</th>
                            <th className="p-4">Data de Disparo</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Tipo de Mídia</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-[#F5F5F5]">
                        {campaigns.map(campaign => (
                            <tr key={campaign.id} className={`border-b border-gray-800 transition-colors ${selectedCampaignIds.has(campaign.id) ? 'bg-[#D99B54]/10' : 'hover:bg-gray-800/50'}`}>
                                <td className="p-4 w-4">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 bg-[#0A0A0A] border-gray-600 text-[#D99B54] focus:ring-offset-0 focus:ring-2 focus:ring-[#D99B54] rounded"
                                        checked={selectedCampaignIds.has(campaign.id)}
                                        onChange={() => onSelect(campaign.id)}
                                    />
                                </td>
                                <td className="p-4 font-medium">{campaign.nome_campanha}</td>
                                <td className="p-4 text-[#A1A1AA]">
                                    {
                                        new Date(`${campaign.data_disparo}T00:00:00`).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            timeZone: 'UTC'
                                        })
                                    }
                                </td>
                                <td className="p-4"><StatusBadge status={campaign.status} /></td>
                                <td className="p-4 text-[#A1A1AA]">
                                    <div className="flex items-center gap-2">
                                        <MediaIcon type={campaign.media_type} />
                                        <span>{mediaTypeDisplayMap[campaign.media_type] || campaign.media_type}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-4 text-[#A1A1AA]">
                                        <button onClick={() => onView(campaign)} className="hover:text-[#D99B54] transition-colors"><EyeIcon className="w-5 h-5"/></button>
                                        <button onClick={() => onEdit(campaign)} className="hover:text-[#D99B54] transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => onDelete(campaign)} className="hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
};

const GenerateAIContentModal = ({ isOpen, onClose, onGenerate, context }: { isOpen: boolean, onClose: () => void, onGenerate: (content: string) => void, context: {nome_campanha: string, tag_alvo: string | null} }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim() || !ai) {
            setError(!ai ? "Cliente Gemini não configurado." : "Por favor, insira uma ideia para a mensagem.");
            return;
        }
        setIsGenerating(true);
        setError('');
        try {
            const fullPrompt = `Gere uma mensagem de marketing persuasiva e curta em português para uma campanha.
            - Nome da Campanha: "${context.nome_campanha}"
            - Público Alvo (Tag): "${context.tag_alvo || 'Geral'}"
            - Ideia inicial do usuário: "${prompt}"
            
            A mensagem deve ser direta, atraente e adequada para um público que já é um lead. Não inclua saudações como "Olá,".`;
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: fullPrompt
            });

            onGenerate(response.text);
            onClose();
            setPrompt('');

        } catch (e: any) {
            console.error("Error generating content:", e);
            setError("Falha ao gerar conteúdo. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gerar Mensagem com IA">
            <p className="text-sm text-gray-400">Descreva a ideia principal da sua mensagem. A IA usará o nome da campanha e a tag alvo como contexto.</p>
            <TextAreaField label="Ideia para a mensagem" value={prompt} onChange={setPrompt} rows={3} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex justify-end gap-4 pt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600">Cancelar</button>
                <button onClick={handleGenerate} disabled={isGenerating} className="px-4 py-2 rounded-lg bg-[#D99B54] text-black font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4"/>
                    {isGenerating ? 'Gerando...' : 'Gerar Mensagem'}
                </button>
            </div>
        </Modal>
    );
};

const AddEditCampaignModal = ({ campaign, isOpen, onClose, onSave, availableTags }: { campaign: Campaign | Partial<Campaign> | null, isOpen: boolean, onClose: () => void, onSave: (campaignData: Partial<Campaign>) => Promise<void>, availableTags: string[] }) => {
    const [formData, setFormData] = useState<Partial<Campaign> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAIOpen, setAIOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Only update formData when the modal opens.
            // We consciously ignore updates to the 'campaign' prop while the modal is open 
            // to prevent overwriting user input if the parent component re-renders.
            setFormData(campaign || { status: 'Rascunho', media_type: 'text' });
        } else {
            setFormData(null);
        }
    }, [isOpen]);

    if (!formData) return null;

    const isEditing = 'id' in formData && formData.id;

    const handleChange = (field: keyof Campaign, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = async () => {
        if (!formData || !formData.nome_campanha || !formData.data_disparo) {
            alert("Por favor, preencha o nome e a data da campanha.");
            return;
        }
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };
    
    const handleGenerateAIContent = (content: string) => {
        handleChange('mensagem', content);
    };
    
    // Simplificando a formatação da data para evitar conflitos de fuso horário e problemas de digitação
    const formatDateForInput = (dateString: string | undefined) => {
        if (!dateString) return '';
        // Pega apenas a parte da data YYYY-MM-DD, ignorando tempo e timezone
        return dateString.split('T')[0];
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Campanha" : "Nova Campanha"}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <InputField label="Nome da Campanha" value={formData.nome_campanha || ''} onChange={val => handleChange('nome_campanha', val)} />
                    <InputField label="Data de Disparo" type="date" value={formatDateForInput(formData.data_disparo)} onChange={val => handleChange('data_disparo', val)} />
                    <DatalistInputField label="Tag Alvo" value={formData.tag_alvo || ''} onChange={val => handleChange('tag_alvo', val)} options={availableTags} helpText="Selecione uma tag existente ou digite uma nova." />
                    <SelectField 
                        label="Status" 
                        value={formData.status || 'Rascunho'} 
                        onChange={val => handleChange('status', val as Campaign['status'])} 
                        options={[
                            { value: 'Rascunho', label: 'Rascunho' },
                            { value: 'Agendada', label: 'Agendada' },
                            { value: 'Enviada', label: 'Enviada (Disparar)' }
                        ]} 
                    />
                    <TextAreaField label="Mensagem / Legenda" value={formData.mensagem || ''} onChange={val => handleChange('mensagem', val)} rows={4} onGenerate={() => setAIOpen(true)} />
                    <InputField label="URL da Mídia (Opcional)" value={formData.media_url || ''} onChange={val => handleChange('media_url', val)} helpText="Para campanhas de imagem ou vídeo." />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#D99B54] text-black font-bold hover:opacity-90 disabled:opacity-50">
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </Modal>
            <GenerateAIContentModal
                isOpen={isAIOpen}
                onClose={() => setAIOpen(false)}
                onGenerate={handleGenerateAIContent}
                context={{ nome_campanha: formData.nome_campanha || '', tag_alvo: formData.tag_alvo || null }}
            />
        </>
    );
};

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { syncTrigger } = useSync();

    const [statusFilter, setStatusFilter] = useState('');
    const [mediaTypeFilter, setMediaTypeFilter] = useState('');
    const [tagAlvoFilter, setTagAlvoFilter] = useState('');

    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [modalState, setModalState] = useState<'view' | 'edit' | 'delete' | 'add' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    
    const [selectedCampaignIds, setSelectedCampaignIds] = useState(new Set<number>());
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const fetchCampaignsAndTags = useCallback(async () => {
        setLoading(true);
        setError(null);
        if (!supabase) { setError("Cliente Supabase não configurado."); setLoading(false); return; }
        
        try {
            // Fetch campaigns
            const { data: campaignsData, error: campaignsError } = await supabase.from('campanhas').select('*').order('data_disparo', { ascending: false });
            if (campaignsError) throw campaignsError;
            setCampaigns(campaignsData as Campaign[]);

            // Fetch tags from both campaigns and leads for a comprehensive list
            const [campaignTagsRes, leadTagsRes] = await Promise.all([
                supabase.from('campanhas').select('tag_alvo'),
                supabase.from('leads').select('tag_plano_de_interesse')
            ]);
            
            if (campaignTagsRes.error) throw campaignTagsRes.error;
            if (leadTagsRes.error) throw leadTagsRes.error;

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
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCampaignsAndTags();
        if (!supabase) return;
        const channel = supabase.channel('public:campanhas').on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas' }, () => fetchCampaignsAndTags()).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchCampaignsAndTags, syncTrigger]);

    // --- Z-API INTEGRATION LOGIC ---
    const sendCampaignViaZAPI = async (campaign: Partial<Campaign>, leads: { id: number, telefone: string | null }[]) => {
        const instance = localStorage.getItem('dialog_zapi_instance');
        const token = localStorage.getItem('dialog_zapi_token');
        
        if (!instance || !token) {
            alert("Configuração Z-API não encontrada. Salve o ID e Token no Perfil para enviar mensagens reais.");
            return;
        }

        const validLeads = leads.filter(l => l.telefone);
        let successCount = 0;
        let failCount = 0;

        for (const lead of validLeads) {
            if (!lead.telefone) continue;
            
            // Format Phone (Simple cleaning, assumes BR format 55+DDD+Number)
            let phone = lead.telefone.replace(/\D/g, '');
            if (phone.length < 10) continue; 
            if (phone.length <= 11) phone = '55' + phone; // Add country code if missing

            try {
                // Determine endpoint based on media_type
                const endpoint = campaign.media_type === 'text' 
                    ? `https://api.z-api.io/instances/${instance}/token/${token}/send-text`
                    : `https://api.z-api.io/instances/${instance}/token/${token}/send-image`; // Simplify to image for now

                const body = campaign.media_type === 'text' 
                    ? { phone, message: campaign.mensagem }
                    : { phone, image: campaign.media_url, caption: campaign.mensagem };

                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                successCount++;
            } catch (err) {
                console.error(`Erro ao enviar para ${phone}`, err);
                failCount++;
            }
        }
        
        return { successCount, failCount };
    };

    const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
        if (!supabase) return;
        const isEditing = 'id' in campaignData;
        const { id, ...updateData } = campaignData;
        
        let campaignId = id;

        // 1. Save or Update Campaign
        const query = isEditing
            ? supabase.from('campanhas').update(updateData).eq('id', id).select()
            : supabase.from('campanhas').insert([updateData]).select();

        const { data, error } = await query;
        if (error) { 
            alert(`Erro ao salvar campanha: ${error.message}`); 
            return;
        } else {
            if (data && data[0]) {
                campaignId = data[0].id;
            }
            setModalState(null);
        }

        // 2. Logic for "Enviada" Status (History + Z-API)
        if (updateData.status === 'Enviada' && campaignId && updateData.tag_alvo) {
            try {
                // Fetch all leads with the target tag
                const { data: leads, error: leadsError } = await supabase
                    .from('leads')
                    .select('id, telefone')
                    .eq('tag_plano_de_interesse', updateData.tag_alvo);

                if (leadsError) throw leadsError;

                if (leads && leads.length > 0) {
                    // A. Trigger Z-API Sending (Non-blocking alert, but we await execution)
                    const confirmSend = window.confirm(`Deseja disparar esta mensagem via WhatsApp para ${leads.length} leads agora? (Requer configuração Z-API)`);
                    
                    if (confirmSend) {
                        alert("Iniciando disparos em segundo plano. Aguarde...");
                        const result = await sendCampaignViaZAPI(campaignData, leads);
                        if (result) {
                            alert(`Disparos finalizados!\nSucesso: ${result.successCount}\nFalhas: ${result.failCount}`);
                        }
                    }

                    // B. Generate History Records (Only if not already generated)
                     const { count } = await supabase
                        .from('historico_envios')
                        .select('*', { count: 'exact', head: true })
                        .eq('campanha_id', campaignId);

                     if (count === 0) {
                        const historyRecords = leads.map(lead => ({
                            lead_id: lead.id,
                            campanha_id: campaignId,
                            status: 'Enviado',
                            canal: 'WhatsApp',
                            created_at: new Date().toISOString()
                        }));

                        const { error: historyError } = await supabase
                            .from('historico_envios')
                            .insert(historyRecords);

                         if (historyError) {
                             if (historyError.code === '42P01' || historyError.code === 'PGRST205') {
                                 alert("Erro de Configuração do Banco de Dados:\n\nO Supabase ainda não reconheceu a tabela 'historico_envios'.\n\nPor favor, vá ao SQL Editor do Supabase e execute:\nNOTIFY pgrst, 'reload config';");
                                 return;
                             }
                             throw historyError;
                        }
                        console.log("Histórico registrado com sucesso.");
                    }
                } else {
                    alert("Campanha salva como Enviada, mas nenhum lead foi encontrado com a Tag Alvo especificada.");
                }
            } catch (err: any) {
                console.error("Erro ao processar envio:", err);
                alert(`Erro no processo de envio: ${err.message}`);
            }
        }
    };

    const handleDeleteCampaign = async () => {
        if (!supabase || !selectedCampaign) return;
        setIsSubmitting(true);
        const { error } = await supabase.from('campanhas').delete().eq('id', selectedCampaign.id);
        if (error) { alert(`Erro ao excluir campanha: ${error.message}`); } 
        else { setModalState(null); }
        setIsSubmitting(false);
    };
    
    const handleSelect = (campaignId: number) => {
        setSelectedCampaignIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(campaignId)) {
                newSet.delete(campaignId);
            } else {
                newSet.add(campaignId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredCampaigns.map(c => c.id));
            setSelectedCampaignIds(allIds);
        } else {
            setSelectedCampaignIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (!supabase || selectedCampaignIds.size === 0) return;
        setIsSubmitting(true);
        const idsToDelete = Array.from(selectedCampaignIds);
        const { error } = await supabase.from('campanhas').delete().in('id', idsToDelete);
        if (error) {
            alert(`Erro ao excluir campanhas: ${error.message}`);
        } else {
            setSelectedCampaignIds(new Set());
            setIsBulkDeleteModalOpen(false);
        }
        setIsSubmitting(false);
    };

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(campaign => {
            const statusMatch = statusFilter ? campaign.status === statusFilter : true;
            const mediaTypeMatch = mediaTypeFilter ? campaign.media_type === mediaTypeFilter : true;
            const tagAlvoMatch = tagAlvoFilter ? campaign.tag_alvo === tagAlvoFilter : true;
            return statusMatch && mediaTypeMatch && tagAlvoMatch;
        });
    }, [campaigns, statusFilter, mediaTypeFilter, tagAlvoFilter]);

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-[#F5F5F5]">Campanhas</h1>
                    {selectedCampaignIds.size > 0 ? (
                        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4 bg-[#191919] p-3 rounded-lg">
                            <span className="font-semibold">{selectedCampaignIds.size} campanha(s) selecionada(s)</span>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <button onClick={() => setIsBulkDeleteModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-opacity text-sm">
                                    <TrashIcon className="w-4 h-4" />
                                    Deletar Selecionados
                                </button>
                                <button onClick={() => setSelectedCampaignIds(new Set())} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-opacity text-sm">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-2">
                            <CustomSelect value={statusFilter} onChange={setStatusFilter} placeholder="Filtrar por Status" options={[{value: 'Agendada', label: 'Agendada'}, {value: 'Enviada', label: 'Enviada'}, {value: 'Rascunho', label: 'Rascunho'}]} />
                            <CustomSelect value={mediaTypeFilter} onChange={setMediaTypeFilter} placeholder="Filtrar por Mídia" options={[{value: 'text', label: 'Texto'}, {value: 'image', label: 'Imagem'}, {value: 'video', label: 'Vídeo'}]} />
                            <CustomSelect value={tagAlvoFilter} onChange={setTagAlvoFilter} placeholder="Filtrar por Tag Alvo" options={availableTags.map(tag => ({ value: tag, label: tag }))} />
                            <button onClick={() => setModalState('add')} className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity">
                                Nova Campanha
                            </button>
                        </div>
                    )}
                </div>
                <CampaignList 
                    campaigns={filteredCampaigns} 
                    loading={loading} 
                    error={error}
                    onView={(c) => { setSelectedCampaign(c); setModalState('view'); }}
                    onEdit={(c) => { setSelectedCampaign(c); setModalState('edit'); }}
                    onDelete={(c) => { setSelectedCampaign(c); setModalState('delete'); }}
                    selectedCampaignIds={selectedCampaignIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                />
            </div>

            <ViewCampaignModal campaign={selectedCampaign} isOpen={modalState === 'view'} onClose={() => setModalState(null)} />
            <AddEditCampaignModal
                campaign={modalState === 'add' ? {} : selectedCampaign}
                isOpen={modalState === 'add' || modalState === 'edit'}
                onClose={() => setModalState(null)}
                onSave={handleSaveCampaign}
                availableTags={availableTags}
            />
            <DeleteConfirmModal isOpen={modalState === 'delete'} onClose={() => setModalState(null)} onConfirm={handleDeleteCampaign} isDeleting={isSubmitting}>
                <p className="text-gray-300">Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.</p>
            </DeleteConfirmModal>
            <DeleteConfirmModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleBulkDelete}
                isDeleting={isSubmitting}
                title={`Excluir ${selectedCampaignIds.size} Campanha(s)`}
            >
                <p className="text-gray-300">Tem certeza que deseja excluir as campanhas selecionadas? Esta ação não pode ser desfeita.</p>
            </DeleteConfirmModal>
        </>
    );
};

export default Campaigns;
