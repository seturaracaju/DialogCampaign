
import React, { useState, useEffect, useCallback } from 'react';
import { Lead, CampaignHistory } from '../types';
import Modal from './Modal';
import SparklesIcon from './icons/SparklesIcon';
import CampaignIcon from './icons/CampaignIcon';
import RefreshIcon from './icons/RefreshIcon';
import { StatusBadge } from './Badges';
import { ai } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';

const ViewLeadModal = ({ lead, isOpen, onClose }: { lead: Lead | null, isOpen: boolean, onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const [analysis, setAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    
    // History State
    const [history, setHistory] = useState<CampaignHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFetchError, setHistoryFetchError] = useState<string | null>(null);

    // Reset states when modal opens/closes or lead changes
    useEffect(() => {
        setAnalysis('');
        setAnalysisError('');
        setActiveTab('details');
        setHistory([]);
        setHistoryFetchError(null);
    }, [isOpen, lead]);

    const fetchHistory = useCallback(async () => {
        if (!lead || !supabase) return;
        
        setLoadingHistory(true);
        setHistoryFetchError(null);
        
        try {
            const { data, error } = await supabase
                .from('historico_envios')
                .select('*, campanhas(*)')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Erro ao buscar histórico:", error);
                
                // Robust extraction of error message to avoid [object Object]
                const errorMessage = typeof error === 'object' 
                    ? (error.message || error.details || JSON.stringify(error))
                    : String(error);
                
                const errorCode = error.code;

                if (errorCode === 'PGRST205' || errorMessage.includes('schema cache')) {
                        setHistoryFetchError("PGRST205"); // Special code for UI handling
                } else if (errorCode === '42P01' || errorMessage.includes('does not exist')) { 
                        setHistoryFetchError("TABLE_NOT_FOUND"); // Special code for UI handling
                } else {
                        setHistoryFetchError(errorMessage);
                }
            } else {
                setHistory(data as unknown as CampaignHistory[]);
            }
        } catch (err: any) {
            console.error("Exceção ao buscar histórico:", err);
            setHistoryFetchError(err.message || "Erro desconhecido ao conectar.");
        } finally {
            setLoadingHistory(false);
        }
    }, [lead]);

    // Trigger fetch when tab changes to history
    useEffect(() => {
        if (activeTab === 'history' && isOpen) {
            fetchHistory();
        }
    }, [activeTab, isOpen, fetchHistory]);

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
            // Include history summary in the prompt if available
            const historySummary = history.length > 0 
                ? `Histórico de Campanhas: ${history.map(h => `${h.campanhas?.nome_campanha} em ${new Date(h.created_at).toLocaleDateString()}`).join(', ')}`
                : 'Sem histórico de campanhas registrado.';

            const prompt = `Como um analista de vendas sênior para a plataforma "Dialog", analise o ciclo de vida completo do seguinte lead. Considere a data de criação, origem, status, plano de interesse e qualquer histórico de mensagens e campanhas. Forneça uma análise estratégica concisa em português com recomendações acionáveis para a equipe de vendas. 
            
            Dados do Lead:\n${leadData}
            
            ${historySummary}`;

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

    const renderDetails = () => (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
    );

    const renderHistory = () => (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pt-2">
            {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <RefreshIcon className="w-6 h-6 animate-spin text-[#D99B54] mb-2" />
                    <p className="text-gray-500">Carregando histórico...</p>
                </div>
            ) : historyFetchError ? (
                 <div className="text-center py-6 bg-[#2a2a2a] rounded-lg border border-red-900/30 p-4">
                    <p className="text-red-300 font-medium mb-2">Problema de Conexão com a Tabela</p>
                    
                    {(historyFetchError === "PGRST205" || historyFetchError === "TABLE_NOT_FOUND") ? (
                        <>
                            <p className="text-xs text-gray-500 mb-3">
                                {historyFetchError === "PGRST205" 
                                    ? "O Supabase não reconheceu a tabela 'historico_envios' (Cache desatualizado)." 
                                    : "A tabela 'historico_envios' ainda não foi encontrada."}
                            </p>
                            <div className="mt-3 bg-black/40 p-3 rounded text-left border border-gray-700 mb-4">
                                <p className="text-xs text-[#D99B54] mb-2 font-semibold">
                                   Solução: Copie e execute este código no SQL Editor do Supabase:
                                </p>
                                <code className="text-[10px] text-gray-300 block font-mono bg-black p-2 rounded select-all whitespace-pre">
                                   NOTIFY pgrst, 'reload config';
                                </code>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-gray-500 mb-3 break-all">{historyFetchError}</p>
                    )}

                    <button 
                        onClick={fetchHistory}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-900/40 text-red-200 text-sm font-semibold rounded-lg hover:bg-red-900/60 transition-colors mx-auto"
                    >
                        <RefreshIcon className="w-4 h-4" />
                        Tentar Novamente
                    </button>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-8 bg-[#2a2a2a] rounded-lg">
                    <p className="text-gray-400">Nenhum histórico de campanha encontrado para este lead.</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-gray-700 ml-3 space-y-8 pb-4">
                    {history.map((item) => (
                        <div key={item.id} className="relative pl-8">
                            {/* Dot on timeline */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#D99B54] border-4 border-[#191919]"></div>
                            
                            <div className="bg-[#2a2a2a] p-4 rounded-lg shadow-md hover:bg-[#333] transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white text-md flex items-center gap-2">
                                        <CampaignIcon className="w-4 h-4 text-[#D99B54]" />
                                        {item.campanhas?.nome_campanha || 'Campanha Desconhecida'}
                                    </h4>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(item.created_at).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p className="text-gray-400">Status: <span className="text-green-400">{item.status}</span></p>
                                    <p className="text-gray-400">Canal: <span className="text-gray-300">{item.canal}</span></p>
                                </div>
                                {item.campanhas?.media_type !== 'text' && (
                                    <div className="mt-2 text-xs bg-[#191919] inline-block px-2 py-1 rounded text-gray-500">
                                        Mídia: {item.campanhas?.media_type}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
            <div className="flex space-x-1 bg-[#2a2a2a] p-1 rounded-lg mb-6">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'details' ? 'bg-[#D99B54] text-black shadow' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Dados do Lead
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'history' ? 'bg-[#D99B54] text-black shadow' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Histórico de Campanhas
                </button>
            </div>

            {activeTab === 'details' ? renderDetails() : renderHistory()}

            <div className="flex justify-end pt-4 border-t border-gray-700 mt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-black bg-[#D99B54] font-bold hover:opacity-90">Fechar</button>
            </div>
        </Modal>
    );
}

export default ViewLeadModal;
