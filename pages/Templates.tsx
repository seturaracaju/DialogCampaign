
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Template } from '../types';
import Modal from '../components/Modal';
import { InputField, TextAreaField, SelectField } from '../components/FormControls';
import SparklesIcon from '../components/icons/SparklesIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { ai } from '../lib/gemini';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const AddEditTemplateModal = ({ template, isOpen, onClose, onSave }: { template: Template | Partial<Template> | null, isOpen: boolean, onClose: () => void, onSave: (t: Partial<Template>) => Promise<void> }) => {
    const [formData, setFormData] = useState<Partial<Template>>({ categoria: 'Geral', titulo: '', conteudo: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setFormData(template || { categoria: 'Geral', titulo: '', conteudo: '' });
    }, [template, isOpen]);

    const handleSave = async () => {
        if (!formData.titulo || !formData.conteudo) {
            alert("Título e Conteúdo são obrigatórios.");
            return;
        }
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    const handleImproveAI = async () => {
        if (!ai || !formData.conteudo) {
            alert("Escreva um rascunho primeiro para a IA melhorar.");
            return;
        }
        setIsGenerating(true);
        try {
            const prompt = `Melhore o seguinte template de mensagem de vendas para WhatsApp. Torne-o mais persuasivo, natural e formate com quebras de linha adequadas. Mantenha o tom profissional mas próximo.\n\nRascunho original:\n"${formData.conteudo}"`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            setFormData(prev => ({ ...prev, conteudo: response.text }));
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar com IA.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={template?.id ? "Editar Template" : "Novo Template"}>
            <div className="space-y-4">
                <InputField label="Título" value={formData.titulo} onChange={v => setFormData(p => ({ ...p, titulo: v }))} placeholder="Ex: Boas Vindas, Promoção Black Friday" />
                <SelectField label="Categoria" value={formData.categoria} onChange={v => setFormData(p => ({ ...p, categoria: v }))} options={[
                    { value: 'Geral', label: 'Geral' },
                    { value: 'Prospecção', label: 'Prospecção' },
                    { value: 'Follow-up', label: 'Follow-up' },
                    { value: 'Fechamento', label: 'Fechamento' }
                ]} />
                <TextAreaField label="Conteúdo da Mensagem" value={formData.conteudo} onChange={v => setFormData(p => ({ ...p, conteudo: v }))} rows={6} />
                <button 
                    onClick={handleImproveAI}
                    disabled={isGenerating}
                    className="flex items-center gap-2 text-xs text-[#D99B54] hover:underline disabled:opacity-50"
                >
                    <SparklesIcon className="w-4 h-4" />
                    {isGenerating ? 'Melhorando...' : 'Melhorar escrita com IA'}
                </button>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600">Cancelar</button>
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#D99B54] text-black font-bold hover:opacity-90 disabled:opacity-50">
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>
        </Modal>
    );
};

const Templates = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    const fetchTemplates = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
        if (!error) setTemplates(data as Template[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleSave = async (templateData: Partial<Template>) => {
        if (!supabase) return;
        const isEditing = templateData.id;
        const { error } = isEditing 
            ? await supabase.from('templates').update(templateData).eq('id', templateData.id)
            : await supabase.from('templates').insert([templateData]);
        
        if (error) {
            alert("Erro ao salvar: " + error.message);
        } else {
            fetchTemplates();
            setModalOpen(false);
        }
    };

    const handleDelete = async () => {
        if (!supabase || !selectedTemplate) return;
        const { error } = await supabase.from('templates').delete().eq('id', selectedTemplate.id);
        if (!error) {
            fetchTemplates();
            setDeleteModalOpen(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado!");
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[#F5F5F5]">Templates de Mensagens</h1>
                <button onClick={() => { setSelectedTemplate(null); setModalOpen(true); }} className="px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90">
                    Novo Template
                </button>
            </div>

            {loading ? (
                <div className="text-gray-500">Carregando templates...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(t => (
                        <div key={t.id} className="bg-[#191919] p-6 rounded-xl shadow-lg border border-gray-800 hover:border-[#D99B54]/50 transition-colors flex flex-col justify-between h-full">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold text-white">{t.titulo}</h3>
                                    <span className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-1 rounded">{t.categoria}</span>
                                </div>
                                <div className="bg-[#0A0A0A] p-4 rounded-lg text-sm text-gray-300 whitespace-pre-wrap mb-4 h-32 overflow-y-auto custom-scrollbar">
                                    {t.conteudo}
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                                <button onClick={() => copyToClipboard(t.conteudo)} className="text-sm text-[#D99B54] font-medium hover:underline">Copiar Texto</button>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedTemplate(t); setModalOpen(true); }} className="p-2 text-gray-400 hover:text-white bg-[#2a2a2a] rounded-lg"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => { setSelectedTemplate(t); setDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-500 bg-[#2a2a2a] rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 bg-[#191919] rounded-xl border border-dashed border-gray-700">
                            Você ainda não tem templates. Crie o primeiro!
                        </div>
                    )}
                </div>
            )}

            <AddEditTemplateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} template={selectedTemplate} onSave={handleSave} />
            <DeleteConfirmModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} isDeleting={false} title="Excluir Template">
                Tem certeza que deseja excluir este template?
            </DeleteConfirmModal>
        </div>
    );
};

export default Templates;
