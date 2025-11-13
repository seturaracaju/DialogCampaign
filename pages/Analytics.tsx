

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import CampaignIcon from '../components/icons/CampaignIcon';
import { supabase } from '../lib/supabaseClient';
import { Lead, Campaign } from '../types';
import ViewCampaignModal from '../components/ViewCampaignModal';
import FunnelChart from '../components/FunnelChart';
import Modal from '../components/Modal';
import ViewLeadModal from '../components/ViewLeadModal';
import { StatusBadge, TagBadge } from '../components/Badges';
import { ai } from '../lib/gemini';
import { Chat } from '@google/genai';
import SparklesIcon from '../components/icons/SparklesIcon';

// --- Helper Functions & Types ---

interface ChartDataPoint {
  name: string;
  value: number;
}

type DrilldownType = 'leadsByArea' | 'leadsByOrigin' | 'campaignsByTag';

interface AnalyticsStats {
    totalLeads: number;
    novoLeadCount: number;
    emAtendimentoCount: number;
    conversionRate: number;
    featuredCampaign: string;
    calendarCampaigns: Campaign[];
    leadsByArea: ChartDataPoint[];
    leadsByOrigin: ChartDataPoint[];
    campaignsByTag: ChartDataPoint[];
    allLeads: Lead[];
    allCampaigns: Campaign[];
}

const formatNumber = (value?: number | null, decimals: number = 0, unit: string = ''): string => {
    if (value === null || typeof value === 'undefined') return '...';
    return `${value.toFixed(decimals)}${unit}`;
};

// --- UI Components ---

const StatCard = ({ title, value, icon, subtext }: { title: string; value: string; icon?: React.ReactNode, subtext?: string }) => (
  <div className="bg-[#191919] rounded-xl p-6 shadow-lg flex-1">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-[#A1A1AA]">{title}</p>
      {icon && <div className="text-[#A1A1AA]">{icon}</div>}
    </div>
    <p className="text-3xl font-bold text-[#F5F5F5] mt-2">{value}</p>
    {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
  </div>
);

const Card = ({ title, children, className }: { title: string, children?: React.ReactNode, className?: string }) => (
    <div className={`bg-[#191919] rounded-xl p-6 shadow-lg ${className}`}>
        <h3 className="text-lg font-semibold text-[#F5F5F5] mb-4">{title}</h3>
        {children}
    </div>
);

const CampaignCalendar = ({ campaigns, onCampaignClick }: { campaigns: Campaign[], onCampaignClick: (c: Campaign) => void }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const campaignsByDate = useMemo(() => campaigns.reduce((acc, campaign) => {
        const date = campaign.data_disparo.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(campaign);
        return acc;
    }, {} as Record<string, Campaign[]>), [campaigns]);

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(startDate); d.setDate(d.getDate() + i); return d; });
    const changeMonth = (offset: number) => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + offset); return d; });
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <Card title="Cronograma de Campanhas" className="h-full">
            <div className="flex items-center justify-between mb-4"><button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-700">&lt;</button><h4 className="font-semibold text-lg text-white">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h4><button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-700">&gt;</button></div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 font-bold">{dayNames.map(day => <div key={day}>{day}</div>)}</div>
            <div className="grid grid-cols-7 gap-1 mt-2">
                {days.map(day => {
                    const dateKey = day.toISOString().split('T')[0];
                    const campaignsOnDay = campaignsByDate[dateKey] || [];
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = dateKey === new Date().toISOString().split('T')[0];
                    return (
                        <div key={dateKey} className={`h-24 p-1 border border-gray-800 rounded-md flex flex-col ${isCurrentMonth ? 'bg-gray-800/30' : 'bg-transparent text-gray-600'}`}>
                            <div className={`text-xs font-bold self-center ${isToday ? 'text-white bg-[#D99B54] rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>{day.getDate()}</div>
                            <div className="mt-1 space-y-1 overflow-y-auto max-h-16 text-[10px] scrollbar-hide">
                                {campaignsOnDay.map(c => {
                                    const campaignColor = c.status === 'Enviada'
                                        ? 'bg-green-800/70 text-green-200 hover:bg-green-700'
                                        : 'bg-yellow-800/70 text-yellow-200 hover:bg-yellow-700';
                                    return (
                                        <div 
                                            key={c.id} 
                                            onClick={() => onCampaignClick(c)} 
                                            className={`${campaignColor} p-1 rounded cursor-pointer truncate`}
                                        >
                                            {c.nome_campanha}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const BarChart = ({ data, onClick }: { data: ChartDataPoint[], onClick: () => void }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-gray-500">Nenhum dado encontrado.</div>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="w-full px-4 cursor-pointer" onClick={onClick}>
            {data.slice(0, 5).map(item => (
                <div key={item.name} className="w-full mb-4">
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-medium text-gray-300">{item.name}</span>
                        <span className="font-bold text-white">{item.value}</span>
                    </div>
                    <div className="w-full bg-[#2a2a2a] rounded-full h-2.5">
                        <div
                            className="bg-[#D99B54] h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                        >
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AnalyticsCarousel = ({ stats, onChartClick }: { stats: AnalyticsStats | null, onChartClick: (type: DrilldownType) => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const charts = [
        { title: "Funil de Conversão de Leads", component: (
            <FunnelChart stages={[
                { name: 'Novo Lead', count: stats?.novoLeadCount ?? 0 },
                { name: 'Em Atendimento', count: stats?.emAtendimentoCount ?? 0 }
            ]} />
        )},
        { title: "Top 5 Leads por Área de Atuação", type: 'leadsByArea', component: <BarChart data={stats?.leadsByArea ?? []} onClick={() => onChartClick('leadsByArea')} /> },
        { title: "Top 5 Leads por Origem", type: 'leadsByOrigin', component: <BarChart data={stats?.leadsByOrigin ?? []} onClick={() => onChartClick('leadsByOrigin')} /> },
        { title: "Top 5 Campanhas por Tag Alvo", type: 'campaignsByTag', component: <BarChart data={stats?.campaignsByTag ?? []} onClick={() => onChartClick('campaignsByTag')} /> },
    ];
    
    const nextChart = () => setCurrentIndex((prev) => (prev + 1) % charts.length);
    const prevChart = () => setCurrentIndex((prev) => (prev - 1 + charts.length) % charts.length);

    return (
         <div className="bg-[#191919] rounded-xl p-6 shadow-lg flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-[#F5F5F5]">{charts[currentIndex].title}</h3>
                 <div className="flex items-center gap-2">
                    <button onClick={prevChart} className="p-1 rounded-full hover:bg-gray-700 text-gray-400">&lt;</button>
                    <button onClick={nextChart} className="p-1 rounded-full hover:bg-gray-700 text-gray-400">&gt;</button>
                 </div>
            </div>
            <div className="flex-grow flex items-center justify-center">
                 {charts[currentIndex].component}
            </div>
             <div className="flex justify-center items-center pt-4">
                {charts.map((_, index) => (
                    <button key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 mx-1 rounded-full transition-colors ${currentIndex === index ? 'bg-[#D99B54]' : 'bg-gray-600 hover:bg-gray-500'}`}></button>
                ))}
            </div>
        </div>
    );
};

const DrilldownModal = ({
    isOpen, onClose, title, data, onGroupSelect, selectedGroup, detailList, onDetailSelect, onBack
}: {
    isOpen: boolean; onClose: () => void; title: string; data: ChartDataPoint[];
    onGroupSelect: (group: ChartDataPoint) => void; selectedGroup: ChartDataPoint | null;
    detailList: (Lead | Campaign)[]; onDetailSelect: (item: Lead | Campaign) => void; onBack: () => void;
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={selectedGroup ? `${title}: ${selectedGroup.name}` : title}>
            <div className="max-h-[60vh] overflow-y-auto">
                {selectedGroup ? (
                    <>
                        <button onClick={onBack} className="text-sm text-[#D99B54] mb-4 hover:underline">&lt; Voltar para a lista</button>
                        <ul className="space-y-2">
                            {detailList.map(item => (
                                <li key={item.id} onClick={() => onDetailSelect(item)} className="p-3 bg-[#2a2a2a] rounded-lg cursor-pointer hover:bg-[#3a3a3a] flex justify-between items-center">
                                    <span>{'nome' in item ? item.nome : item.nome_campanha}</span>
                                    {'status' in item && typeof item.status === 'string' && <StatusBadge status={item.status as Lead['status']} />}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                     <ul className="space-y-2">
                        {data.map(item => (
                            <li key={item.name} onClick={() => onGroupSelect(item)} className="p-3 bg-[#2a2a2a] rounded-lg cursor-pointer hover:bg-[#3a3a3a] flex justify-between items-center">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-bold text-lg">{item.value}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
};

const AIAnalystCard = ({ stats }: { stats: AnalyticsStats | null }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitiated, setIsInitiated] = useState(false);

    const initiateChat = useCallback(() => {
        if (!ai || !stats) {
            setError("A IA não está configurada ou os dados não estão disponíveis.");
            return;
        }
        setError(null);
        
        const context = `Você é a DAI, uma analista de dados especialista em marketing para a plataforma Dialog. Sua missão é responder perguntas sobre os dados de analytics do usuário. Seja concisa e forneça respostas baseadas nos seguintes dados:
        - Total de Leads: ${stats.totalLeads}
        - Novos Leads: ${stats.novoLeadCount}
        - Leads em Atendimento: ${stats.emAtendimentoCount}
        - Taxa de Conversão: ${stats.conversionRate.toFixed(2)}%
        - Resumo de Leads por Área: ${JSON.stringify(stats.leadsByArea.slice(0, 5))}
        - Resumo de Leads por Origem: ${JSON.stringify(stats.leadsByOrigin.slice(0, 5))}
        - Resumo de Campanhas por Tag: ${JSON.stringify(stats.campaignsByTag.slice(0, 5))}
        - Total de Campanhas: ${stats.allCampaigns.length}`;

        const chatSession = ai.chats.create({ model: 'gemini-2.5-pro', history: [{ role: 'user', parts: [{ text: context }] }, { role: 'model', parts: [{ text: "Entendido. Estou pronta para analisar os dados. Pode fazer sua pergunta." }] }] });
        setChat(chatSession);
        setConversation([{ role: 'model', text: "Olá! Sou a DAI, sua analista de dados. O que você gostaria de saber sobre suas métricas?" }]);
        setIsInitiated(true);
    }, [stats]);
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !chat || isReplying) return;
        
        const message = userInput;
        setUserInput('');
        setIsReplying(true);
        setConversation(prev => [...prev, { role: 'user', text: message }]);

        try {
            const response = await chat.sendMessage({ message });
            setConversation(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (e) {
            setError("Não foi possível obter a resposta da DAI.");
        } finally {
            setIsReplying(false);
        }
    };

    if (!isInitiated) {
        return (
            <Card title="DAI Analyst">
                <div className="text-center">
                    <p className="text-sm text-gray-400 mb-4">Converse com seus dados. Faça perguntas em linguagem natural para obter insights.</p>
                    <button 
                        onClick={initiateChat} 
                        disabled={!stats || !ai}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mx-auto"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Iniciar Análise com DAI
                    </button>
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                    {!ai && <p className="text-yellow-400 text-xs mt-2">Funcionalidade da IA desabilitada. Verifique a chave de API.</p>}
                </div>
            </Card>
        );
    }

    return (
        <Card title="DAI Analyst">
             <div className="space-y-4 max-h-72 overflow-y-auto pr-2 mb-4">
                {conversation.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-[#D99B54] text-black' : 'bg-[#2a2a2a] text-gray-300'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={isReplying ? "DAI está analisando..." : "Pergunte sobre seus dados..."}
                    className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]"
                    disabled={isReplying}
                />
                <button
                    type="submit"
                    disabled={isReplying || !userInput.trim()}
                    className="px-4 py-2 text-sm font-semibold bg-[#2a2a2a] text-[#D99B54] rounded-lg hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
                >
                    Enviar
                </button>
            </form>
        </Card>
    );
};

const Analytics = () => {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for modals
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    
    // State for drilldown
    const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
    const [drilldownType, setDrilldownType] = useState<DrilldownType | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<ChartDataPoint | null>(null);

    const fetchAnalyticsData = useCallback(async () => {
        if (!supabase) { setError("Supabase client not configured."); setLoading(false); return; }
        setLoading(true); setError(null);
        try {
            const [leadsRes, campaignsRes] = await Promise.all([
                supabase.from('leads').select('*'),
                supabase.from('campanhas').select('*'),
            ]);
            if (leadsRes.error) throw leadsRes.error; if (campaignsRes.error) throw campaignsRes.error;
            const leads = (leadsRes.data || []) as Lead[];
            const campaigns = (campaignsRes.data || []) as Campaign[];
            
            const totalLeads = leads.length;
            const novoLeadCount = leads.filter(l => l.status === 'Novo Lead').length;
            const emAtendimentoCount = leads.filter(l => l.status === 'Atendimento Humano').length;
            const funnelLeadsCount = novoLeadCount + emAtendimentoCount;
            const conversionRate = funnelLeadsCount > 0 ? (emAtendimentoCount / funnelLeadsCount) * 100 : 0;
            const featuredCampaign = campaigns.sort((a,b) => (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()))[0];

            const processGroupCount = (items: any[], key: string, defaultName: string) => {
                 const counts = items.reduce<Record<string, number>>((acc, item) => {
                    // Fix: Replaced String() constructor with template literal to avoid TypeScript error.
                    const groupKey = `${item[key] || defaultName}`;
                    acc[groupKey] = (acc[groupKey] || 0) + 1;
                    return acc;
                }, {});
                return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
            };

            const leadsByArea = processGroupCount(leads, 'atuacao', 'Não Informado');
            const leadsByOrigin = processGroupCount(leads, 'origem', 'Desconhecida');
            const campaignsByTag = processGroupCount(campaigns, 'tag_alvo', 'Sem Tag');
            
            setStats({ 
                totalLeads, novoLeadCount, emAtendimentoCount, conversionRate, 
                featuredCampaign: featuredCampaign?.nome_campanha || 'N/A',
                calendarCampaigns: campaigns.filter(c => c.status === 'Agendada' || c.status === 'Enviada'),
                leadsByArea, leadsByOrigin, campaignsByTag,
                allLeads: leads, allCampaigns: campaigns,
            });
        } catch (e: any) { setError(e.message); console.error("Failed to fetch analytics data:", e); } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchAnalyticsData();
        if (!supabase) return;
        const sub = supabase.channel('analytics-changes').on('postgres_changes', { event: '*', schema: 'public' }, fetchAnalyticsData).subscribe();
        return () => { supabase.removeChannel(sub); }
    }, [fetchAnalyticsData]);

    const handleCampaignClick = (campaign: Campaign) => { setSelectedCampaign(campaign); setIsViewModalOpen(true); };

    const handleChartClick = (type: DrilldownType) => {
        setDrilldownType(type);
        setIsDrilldownOpen(true);
    };
    
    const handleGroupSelect = (group: ChartDataPoint) => {
        setSelectedGroup(group);
    };

    const handleDetailSelect = (item: Lead | Campaign) => {
        if ('nome' in item) { // It's a Lead
            setSelectedLead(item);
            setIsLeadModalOpen(true);
        } else { // It's a Campaign
            setSelectedCampaign(item);
            setIsViewModalOpen(true);
        }
    };
    
    const { drilldownTitle, drilldownData, detailList } = useMemo(() => {
        if (!drilldownType || !stats) return { drilldownTitle: '', drilldownData: [], detailList: [] };

        let title = '';
        let data: ChartDataPoint[] = [];
        let details: (Lead | Campaign)[] = [];

        switch (drilldownType) {
            case 'leadsByArea':
                title = 'Leads por Área de Atuação';
                data = stats.leadsByArea;
                if(selectedGroup) details = stats.allLeads.filter(l => (l.atuacao || 'Não Informado') === selectedGroup.name);
                break;
            case 'leadsByOrigin':
                title = 'Leads por Origem';
                data = stats.leadsByOrigin;
                if(selectedGroup) details = stats.allLeads.filter(l => (l.origem || 'Desconhecida') === selectedGroup.name);
                break;
            case 'campaignsByTag':
                title = 'Campanhas por Tag Alvo';
                data = stats.campaignsByTag;
                if(selectedGroup) details = stats.allCampaigns.filter(c => (c.tag_alvo || 'Sem Tag') === selectedGroup.name);
                break;
        }
        return { drilldownTitle: title, drilldownData: data, detailList: details };
    }, [drilldownType, stats, selectedGroup]);
    
    const closeDrilldown = () => {
        setIsDrilldownOpen(false);
        setSelectedGroup(null);
        setDrilldownType(null);
    };


    return (
    <>
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-[#F5F5F5]">Analytics</h1>
            {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md text-center">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Taxa de Conversão" value={loading ? '...' : formatNumber(stats?.conversionRate, 2, '%')} icon={<UserGroupIcon className="w-5 h-5"/>} subtext="Atendimento Humano vs. Novos" />
                <StatCard title="Total de Leads" value={formatNumber(stats?.totalLeads)} icon={<UserGroupIcon className="w-5 h-5"/>} />
                <StatCard title="Em Atendimento" value={formatNumber(stats?.emAtendimentoCount)} icon={<UserGroupIcon className="w-5 h-5"/>} subtext="Status 'Atendimento Humano'" />
                <StatCard title="Campanha de Destaque" value={loading ? '...' : stats?.featuredCampaign ?? 'N/A'} icon={<CampaignIcon className="w-5 h-5"/>} subtext="Última campanha criada" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <AnalyticsCarousel stats={stats} onChartClick={handleChartClick} />
                </div>
                <div className="lg:col-span-3"><CampaignCalendar campaigns={stats?.calendarCampaigns ?? []} onCampaignClick={handleCampaignClick} /></div>
            </div>
             <div className="mt-6">
                <AIAnalystCard stats={stats} />
            </div>
        </div>

        <DrilldownModal
            isOpen={isDrilldownOpen}
            onClose={closeDrilldown}
            title={drilldownTitle}
            data={drilldownData}
            onGroupSelect={handleGroupSelect}
            selectedGroup={selectedGroup}
            detailList={detailList}
            onDetailSelect={handleDetailSelect}
            onBack={() => setSelectedGroup(null)}
        />
        <ViewCampaignModal campaign={selectedCampaign} isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} />
        <ViewLeadModal lead={selectedLead} isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} />
    </>
    );
};

export default Analytics;
