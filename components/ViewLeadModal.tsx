
import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import Modal from './Modal';
import SparklesIcon from './icons/SparklesIcon';
import { StatusBadge } from './Badges';
import { ai } from '../lib/gemini';

const ViewLeadModal = ({ lead, isOpen, onClose }: { lead: Lead | null, isOpen: boolean, onClose: () => void }) => {
    const [analysis, setAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');

    useEffect(() => {
        setAnalysis('');
        setAnalysisError('');
    }, [isOpen, lead]);

    if (!lead) return null;

    const handleAnalyzeLifecycle = async () => {
        if (!ai) {
            setAnalysisError("Cliente Gemini AI não configurado.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisError('');
        setAnalysis('');

        try {
            const leadData = JSON.stringify(lead, (key, value) => value === null ? undefined : value, 2);
            const prompt = `Como um analista de vendas sênior para a plataforma "Dialog", analise o ciclo de vida completo do seguinte lead. Considere a data de criação, origem, status, plano de interesse e qualquer histórico de mensagens. Forneça uma análise estratégica concisa em português com recomendações acionáveis para a equipe de vendas. Dados do Lead:\n${leadData}`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-pro',
              contents: prompt
            });
            setAnalysis(response.text);
        } catch (e: any) {
            console.error("Error analyzing lead lifecycle:", e);
            setAnalysisError("Não foi possível gerar a análise. Tente novamente.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-white break-words">{value || '-'}</p>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Nome" value={lead.nome} />
                    <DetailItem label="Status" value={<StatusBadge status={lead.status} />} />
                    <DetailItem label="Email" value={lead.email} />
                    <DetailItem label="Telefone" value={lead.telefone} />
                    <DetailItem label="Plano de Interesse" value={lead.tag_plano_de_interesse} />
                    <DetailItem label="Origem" value={lead.origem} />
                    <DetailItem label="Área de Atuação" value={lead.atuacao} />
                     <DetailItem label="Data de Origem" value={lead.data_origem ? new Date(`${lead.data_origem}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC'}) : 'N/A'} />
                </div>
                <div className="border-t border-gray-700 pt-4">
                    <DetailItem label="Resumo da IA (gerado anteriormente)" value={<p className="whitespace-pre-wrap">{lead.resumo_ia}</p>} />
                </div>

                <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Análise do Ciclo de Vida do Lead</h3>
                        <button onClick={handleAnalyzeLifecycle} disabled={isAnalyzing || !ai} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#2a2a2a] text-[#D99B54] rounded-lg hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <SparklesIcon className="w-4 h-4" />
                            {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                        </button>
                    </div>
                     <div className="mt-3 text-sm text-gray-300 min-h-[5rem]">
                        {isAnalyzing && <p>Aguarde, a IA está analisando o perfil completo do lead...</p>}
                        {analysisError && <p className="text-red-400">{analysisError}</p>}
                        {analysis && <p className="whitespace-pre-wrap font-mono">{analysis}</p>}
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-black bg-[#D99B54] font-bold hover:opacity-90">Fechar</button>
            </div>
        </Modal>
    );
}

export default ViewLeadModal;