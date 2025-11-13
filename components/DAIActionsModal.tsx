import React, { useState, useCallback } from 'react';
import Modal from './Modal';
import { Lead, Campaign } from '../types';
import { ai } from '../lib/gemini';
import SparklesIcon from './icons/SparklesIcon';
import { supabase } from '../lib/supabaseClient';
import { useSync } from '../App';
import { Type } from '@google/genai';

interface DAIActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLeads: Lead[];
}

type GeneratedCampaign = Pick<Campaign, 'nome_campanha' | 'tag_alvo' | 'mensagem'>;

const DAIActionsModal = ({ isOpen, onClose, selectedLeads }: DAIActionsModalProps) => {
    const [currentView, setCurrentView] = useState<'actions' | 'campaignResult'>('actions');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
    const { triggerSync } = useSync();

    const handleClose = useCallback(() => {
        setCurrentView('actions');
        setGeneratedCampaign(null);
        setError(null);
        onClose();
    }, [onClose]);

    const handleGenerateCampaign = async () => {
        if (!ai || selectedLeads.length === 0) {
            setError("A IA não está configurada ou nenhum lead foi selecionado.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setGeneratedCampaign(null);

        try {
            const summary = selectedLeads.map(lead => ({
                tag: lead.tag_plano_de_interesse,
                area: lead.atuacao,
                origem: lead.origem
            }));

            const prompt = `Analise este grupo de ${summary.length} leads e gere um rascunho de campanha de marketing direcionada a eles. O objetivo é engajá-los e movê-los para a próxima etapa do funil. Responda em formato JSON com os campos: "nome_campanha", "tag_alvo", "mensagem".
- nome_campanha: Crie um nome de campanha criativo e descritivo para este segmento.
- tag_alvo: Identifique a tag ou público-alvo mais comum e relevante neste grupo.
- mensagem: Escreva uma mensagem de marketing curta (máximo 2-3 frases), persuasiva e personalizada para este público, incentivando uma ação (ex: conhecer uma novidade, agendar uma conversa). Seja direto e evite saudações.
Dados dos Leads (resumo): ${JSON.stringify(summary.slice(0, 50), null, 2)}`; // Limit summary size for prompt

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            nome_campanha: { type: Type.STRING, description: "Nome criativo para a campanha." },
                            tag_alvo: { type: Type.STRING, description: "A tag de público-alvo mais relevante." },
                            mensagem: { type: Type.STRING, description: "A mensagem de marketing gerada." },
                        },
                        required: ["nome_campanha", "tag_alvo", "mensagem"],
                    },
                },
            });
            
            const campaignData = JSON.parse(response.text);
            setGeneratedCampaign(campaignData);
            setCurrentView('campaignResult');

        } catch (e) {
            console.error("Error generating campaign:", e);
            setError("Ocorreu um erro ao gerar a campanha com a DAI. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCampaignDraft = async () => {
        if (!generatedCampaign || !supabase) return;
        setIsSaving(true);
        setError(null);
        try {
            const { error } = await supabase.from('campanhas').insert([{
                nome_campanha: generatedCampaign.nome_campanha,
                tag_alvo: generatedCampaign.tag_alvo,
                mensagem: generatedCampaign.mensagem,
                status: 'Rascunho' as const,
                media_type: 'text' as const,
                data_disparo: new Date().toISOString().split('T')[0]
            }]);

            if (error) throw error;
            
            triggerSync();
            handleClose();
            alert(`Rascunho de campanha "${generatedCampaign.nome_campanha}" criado com sucesso!`);

        } catch (e: any) {
            console.error("Error saving campaign draft:", e);
            setError(`Falha ao salvar o rascunho: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const renderActions = () => (
        <div className="space-y-4">
            <p className="text-sm text-center text-gray-400">Selecione uma ação para executar com a DAI nos {selectedLeads.length} leads selecionados.</p>
            <button
                onClick={handleGenerateCampaign}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2a2a2a] text-white font-bold rounded-lg hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
            >
                <SparklesIcon className="w-5 h-5 text-[#D99B54]" />
                {isGenerating ? 'Analisando Leads...' : 'Criar Campanha para Selecionados'}
            </button>
             <button disabled className="w-full px-4 py-3 bg-[#2a2a2a] text-gray-600 font-bold rounded-lg disabled:opacity-50 cursor-not-allowed">
                Gerar Resumo do Segmento (em breve)
            </button>
        </div>
    );

    const renderCampaignResult = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center text-white">Rascunho Gerado pela DAI</h3>
            <div className="bg-[#0A0A0A] p-4 rounded-lg space-y-3 text-sm">
                <div>
                    <p className="text-xs text-gray-400 font-medium">NOME DA CAMPANHA</p>
                    <p className="text-white">{generatedCampaign?.nome_campanha}</p>
                </div>
                 <div>
                    <p className="text-xs text-gray-400 font-medium">TAG ALVO SUGERIDA</p>
                    <p className="text-white">{generatedCampaign?.tag_alvo}</p>
                </div>
                 <div>
                    <p className="text-xs text-gray-400 font-medium">MENSAGEM</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{generatedCampaign?.mensagem}</p>
                </div>
            </div>
             <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setCurrentView('actions')} className="px-4 py-2 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600">Voltar</button>
                <button onClick={handleSaveCampaignDraft} disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#D99B54] text-black font-bold hover:opacity-90 disabled:opacity-50">
                    {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Ações com DAI">
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-center text-sm">{error}</p>}
            {currentView === 'actions' && renderActions()}
            {currentView === 'campaignResult' && renderCampaignResult()}
        </Modal>
    );
};

export default DAIActionsModal;
