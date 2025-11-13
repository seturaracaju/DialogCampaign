
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useSync } from '../App';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import ChatIcon from '../components/icons/ChatIcon';
import SendIcon from '../components/icons/SendIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import TrendingUpIcon from '../components/icons/TrendingUpIcon';
import { supabase } from '../lib/supabaseClient';
import { ai } from '../lib/gemini';
import { Chat } from '@google/genai';
import CampaignIcon from '../components/icons/CampaignIcon';

type Page = 'Dashboard' | 'Campanhas' | 'Leads' | 'Analytics' | 'Profile';
type TimePeriod = 'week' | 'month' | 'quarter' | 'semester' | 'year';

const StatCard = ({ title, value, icon, onClick }: { title: string; value: string, icon: React.ReactNode, onClick?: () => void }) => {
    const Component = onClick ? 'button' : 'div';
    const props = {
        onClick,
        className: `bg-[#191919] rounded-xl p-6 shadow-lg flex items-start justify-between text-left w-full transition-colors ${onClick ? 'hover:bg-[#2a2a2a] cursor-pointer' : ''}`
    };
    return (
        <Component {...props}>
            <div>
                <p className="text-[#A1A1AA] text-sm font-medium">{title}</p>
                <p className="text-4xl font-bold text-[#F5F5F5] mt-2">{value}</p>
            </div>
            <div className="bg-[#2a2a2a] p-2 rounded-lg">
                {icon}
            </div>
        </Component>
    );
};

const ConversionEvolutionCard = ({ conversionRates }: { conversionRates: Record<TimePeriod, number | null> }) => {
    const [period, setPeriod] = useState<TimePeriod>('month');
    
    const timePeriods: { id: TimePeriod, label: string }[] = [
        { id: 'week', label: 'Semana' },
        { id: 'month', label: 'Mês' },
        { id: 'quarter', label: 'Trimestre' },
        { id: 'semester', label: 'Semestre' },
        { id: 'year', label: 'Ano' },
    ];

    const rate = conversionRates[period];

    return (
        <div className="bg-[#191919] rounded-xl p-6 shadow-lg col-span-1 md:col-span-2 lg:col-span-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUpIcon className="w-6 h-6 text-[#D99B54]" />
                    <h3 className="text-lg font-semibold text-[#F5F5F5]">Evolução da Conversão</h3>
                </div>
                <div className="bg-[#0A0A0A] p-1 rounded-lg flex items-center space-x-1">
                    {timePeriods.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${period === p.id ? 'bg-[#2a2a2a] text-white' : 'text-[#A1A1AA] hover:text-white'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-6 flex items-baseline gap-2">
                <p className="text-5xl font-bold text-[#F5F5F5]">
                    {rate !== null && typeof rate !== 'undefined' ? `${rate.toFixed(1)}%` : <span className="text-2xl text-gray-500">N/A</span>}
                </p>
            </div>
            <p className="text-sm text-[#A1A1AA] mt-2">Taxa de leads 'Novo Lead' que passaram para 'Atendimento Humano' no período.</p>
        </div>
    );
};

interface DashboardStats {
    totalLeads: number;
    novosLeads: number;
    leadsEmAtendimento: number;
    totalCampanhas: number;
    campanhasAgendadas: number;
    campanhasEnviadas: number;
    conversionRates: Record<TimePeriod, number | null>;
}

const AIInsightsCard = ({ stats }: { stats: DashboardStats | null }) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const generateAnalysis = async () => {
        if (!ai || !stats) {
            setError("Não foi possível gerar a análise. Verifique a configuração da IA e os dados.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setAnalysis(null);
        setConversation([]);
        setUserInput('');
        setChat(null);

        try {
            const conversionRateMonth = stats.conversionRates.month;
            const context = `Dados atuais do Dashboard da plataforma Dialog:
            - Total de Leads: ${stats.totalLeads}
            - Novos Leads: ${stats.novosLeads}
            - Leads em Atendimento: ${stats.leadsEmAtendimento}
            - Total de Campanhas: ${stats.totalCampanhas}
            - Campanhas Agendadas: ${stats.campanhasAgendadas}
            - Taxa de Conversão (Último Mês): ${conversionRateMonth !== null ? conversionRateMonth.toFixed(2) + '%' : 'N/A'}`;

            const prompt = `Como um analista de marketing sênior chamado DAI, analise os seguintes dados do dashboard e forneça um insight estratégico conciso e acionável em português. O objetivo principal é melhorar a taxa de conversão de 'Novo Lead' para 'Atendimento Humano'. Seja direto e foque em uma recomendação principal.\n\n${context}`;
            
            const chatSession = ai.chats.create({ model: 'gemini-2.5-pro', history: [{ role: 'user', parts: [{ text: `Contexto para o assistente de marketing DAI:\n${context}` }] }] });
            setChat(chatSession);

            const response = await chatSession.sendMessage({ message: prompt });
            setAnalysis(response.text);

        } catch (e) {
            console.error("Error generating AI analysis:", e);
            setError("Ocorreu um erro ao gerar a análise da DAI.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !chat || isReplying) return;

        const message = userInput;
        setUserInput('');
        setIsReplying(true);
        setConversation(prev => [...prev, { role: 'user', text: message }]);

        try {
            const response = await chat.sendMessage({ message: message });
            setConversation(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (e) {
            setError("Não foi possível obter a resposta da DAI.");
            setConversation(prev => prev.slice(0, -1)); // Remove user message on error
        } finally {
            setIsReplying(false);
        }
    };

    return (
        <div className="bg-[#191919] rounded-xl p-6 shadow-lg col-span-1 md:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-[#D99B54]" />
                    <h3 className="text-lg font-semibold text-[#F5F5F5]">Insight da DAI</h3>
                </div>
                <button
                    onClick={generateAnalysis}
                    disabled={isGenerating}
                    className="px-4 py-2 text-sm font-semibold bg-[#2a2a2a] text-[#D99B54] rounded-lg hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
                >
                    {isGenerating ? 'Analisando...' : 'Gerar Análise'}
                </button>
            </div>
            <div className="mt-4 text-sm text-[#A1A1AA] min-h-[4rem]">
                {isGenerating && <p>Aguarde, a DAI está processando os dados para gerar um novo insight...</p>}
                {error && <p className="text-red-400">{error}</p>}
                {!isGenerating && !analysis && <p>Clique em "Gerar Análise" para receber insights estratégicos da DAI sobre suas campanhas e leads.</p>}
                {analysis && !conversation.length && <p className="whitespace-pre-wrap">{analysis}</p>}
                
                {conversation.length > 0 && (
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                        <div className="flex justify-start">
                            <div className="p-3 rounded-lg max-w-[85%] bg-[#2a2a2a] text-gray-300">
                                <p className="text-sm whitespace-pre-wrap">{analysis}</p>
                            </div>
                        </div>
                        {conversation.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-[#D99B54] text-black' : 'bg-[#2a2a2a] text-gray-300'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {chat && !isGenerating && (
                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={isReplying ? "DAI está digitando..." : "Converse com a DAI..."}
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
            )}
        </div>
    );
};


const Dashboard = ({ setCurrentPage }: { setCurrentPage: (page: Page) => void }) => {
    const { user } = useAuth();
    const { syncTrigger } = useSync();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isShowingNovosLeads, setIsShowingNovosLeads] = useState(true);
    const [isShowingAgendadas, setIsShowingAgendadas] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        if (!supabase) {
            setError("Cliente Supabase não configurado.");
            setLoading(false);
            return;
        }

        try {
            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('status, created_at');

            if (leadsError) throw leadsError;

            const { data: campaignsData, error: campaignsError } = await supabase
                .from('campanhas')
                .select('status');

            if (campaignsError) throw campaignsError;
            
            const totalLeads = leadsData.length;
            const novosLeads = leadsData.filter(l => l.status === 'Novo Lead').length;
            const leadsEmAtendimento = leadsData.filter(l => l.status === 'Atendimento Humano').length;
            const totalCampanhas = campaignsData.length;
            const campanhasAgendadas = campaignsData.filter(c => c.status === 'Agendada').length;
            const campanhasEnviadas = campaignsData.filter(c => c.status === 'Enviada').length;

            const calculateConversionRate = (startDate: Date) => {
                const relevantLeads = leadsData.filter(l => new Date(l.created_at) >= startDate);
                const novos = relevantLeads.filter(l => l.status === 'Novo Lead').length;
                const convertidos = relevantLeads.filter(l => l.status === 'Atendimento Humano').length;
                const totalFunnel = novos + convertidos;
                return totalFunnel > 0 ? (convertidos / totalFunnel) * 100 : 0;
            };

            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const oneQuarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            const oneSemesterAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

            setStats({
                totalLeads,
                novosLeads,
                leadsEmAtendimento,
                totalCampanhas,
                campanhasAgendadas,
                campanhasEnviadas,
                conversionRates: {
                    week: calculateConversionRate(oneWeekAgo),
                    month: calculateConversionRate(oneMonthAgo),
                    quarter: calculateConversionRate(oneQuarterAgo),
                    semester: calculateConversionRate(oneSemesterAgo),
                    year: calculateConversionRate(oneYearAgo),
                }
            });

        } catch (e: any) {
            setError(e.message);
            console.error("Error fetching dashboard data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, syncTrigger]);

    useEffect(() => {
        const leadInterval = setInterval(() => {
            setIsShowingNovosLeads(prev => !prev);
        }, 5000);
        const campaignInterval = setInterval(() => {
            setIsShowingAgendadas(prev => !prev);
        }, 5000);

        return () => {
            clearInterval(leadInterval);
            clearInterval(campaignInterval);
        };
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-[#A1A1AA]">Carregando dashboard...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-400">Erro ao carregar dados: {error}</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[#F5F5F5]">Dashboard</h1>
                <p className="text-[#A1A1AA] mt-1">Bem-vindo de volta, {user?.name}! Aqui está um resumo da sua conta.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Leads" value={stats?.totalLeads.toString() ?? '0'} icon={<UserGroupIcon className="w-6 h-6 text-[#A1A1AA]" />} onClick={() => setCurrentPage('Leads')} />
                <StatCard 
                    title={isShowingNovosLeads ? "Novos Leads" : "Em Atendimento"} 
                    value={isShowingNovosLeads ? (stats?.novosLeads.toString() ?? '0') : (stats?.leadsEmAtendimento.toString() ?? '0')} 
                    icon={<ChatIcon className="w-6 h-6 text-[#A1A1AA]" />} 
                    onClick={() => setCurrentPage('Leads')} 
                />
                <StatCard title="Total de Campanhas" value={stats?.totalCampanhas.toString() ?? '0'} icon={<CampaignIcon className="w-6 h-6 text-[#A1A1AA]" />} onClick={() => setCurrentPage('Campanhas')} />
                <StatCard 
                    title={isShowingAgendadas ? "Campanhas Agendadas" : "Campanhas Enviadas"} 
                    value={isShowingAgendadas ? (stats?.campanhasAgendadas.toString() ?? '0') : (stats?.campanhasEnviadas.toString() ?? '0')} 
                    icon={isShowingAgendadas ? <SparklesIcon className="w-6 h-6 text-[#A1A1AA]" /> : <SendIcon className="w-6 h-6 text-[#A1A1AA]" />} 
                    onClick={() => setCurrentPage(isShowingAgendadas ? 'Analytics' : 'Campanhas')} 
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats && <ConversionEvolutionCard conversionRates={stats.conversionRates} />}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-4 gap-6">
                 <AIInsightsCard stats={stats} />
            </div>
        </div>
    );
};

export default Dashboard;
