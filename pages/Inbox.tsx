
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lead, Message, Template } from '../types';
import { useSync } from '../App';
import SendIcon from '../components/icons/SendIcon';
import RefreshIcon from '../components/icons/RefreshIcon';
import { StatusBadge } from '../components/Badges';
import ViewLeadModal from '../components/ViewLeadModal';
import EyeIcon from '../components/icons/EyeIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import { ai } from '../lib/gemini';
import Modal from '../components/Modal';

// --- Components ---

interface ChatMessageProps {
    message: Message;
    isMe: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isMe }) => (
    <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm relative ${
            isMe 
                ? 'bg-[#D99B54] text-black rounded-tr-none' 
                : 'bg-[#2a2a2a] text-gray-200 rounded-tl-none'
        }`}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.conteudo}</p>
            <div className={`text-[10px] mt-2 flex items-center justify-end ${isMe ? 'text-black/60' : 'text-gray-500'}`}>
                {message.created_at ? new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                {isMe && <span className="ml-1">✓</span>}
            </div>
        </div>
    </div>
);

interface LeadListItemProps {
    lead: Lead;
    isActive: boolean;
    onClick: () => void;
}

const LeadListItem: React.FC<LeadListItemProps> = ({ lead, isActive, onClick }) => {
    // Generate initials
    const initials = lead.nome 
        ? lead.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
        : '?';
    
    const formattedTime = lead.ultima_mensagem 
        ? new Date(lead.ultima_mensagem).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div 
            onClick={onClick}
            className={`p-4 border-b border-gray-800 cursor-pointer transition-colors hover:bg-[#1f1f1f] ${isActive ? 'bg-[#2a2a2a] border-l-4 border-l-[#D99B54]' : ''}`}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isActive ? 'bg-[#D99B54] text-black' : 'bg-gray-700 text-gray-300'}`}>
                        {initials}
                    </div>
                    <div className="overflow-hidden">
                        <p className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                            {lead.nome || 'Lead Sem Nome'}
                        </p>
                         <p className="text-xs text-gray-500 truncate">{lead.telefone || 'Sem telefone'}</p>
                    </div>
                </div>
                {formattedTime && (
                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">{formattedTime}</span>
                )}
            </div>
            
            {/* O "Pulo do Gato": Resumo da IA ou última mensagem */}
            <div className="mt-2 pl-[3.25rem]">
                {lead.resumo_ia ? (
                    <p className="text-xs text-[#D99B54] italic truncate">
                        ✨ {lead.resumo_ia}
                    </p>
                ) : (
                    <p className="text-xs text-gray-400 truncate">
                        {lead.mensagem || 'Nenhuma mensagem recente.'}
                    </p>
                )}
            </div>
        </div>
    );
};

// --- Template Selection Modal ---
const TemplatesSelectorModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (content: string) => void }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && supabase) {
            setLoading(true);
            supabase.from('templates').select('*').order('titulo', { ascending: true })
                .then(({ data }) => {
                    setTemplates((data as Template[]) || []);
                    setLoading(false);
                });
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Template">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {loading ? (
                    <p className="text-gray-500 text-center py-4">Carregando templates...</p>
                ) : templates.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum template cadastrado.</p>
                ) : (
                    templates.map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => onSelect(t.conteudo)}
                            className="p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#D99B54] cursor-pointer transition-colors group"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-white group-hover:text-[#D99B54] transition-colors">{t.titulo}</h4>
                                <span className="text-xs bg-black/50 text-gray-400 px-2 py-1 rounded">{t.categoria}</span>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">{t.conteudo}</p>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};

const Inbox = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoadingLeads, setIsLoadingLeads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showLeadDetails, setShowLeadDetails] = useState(false);
    
    // Feature States
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { syncTrigger } = useSync();

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isGeneratingReply]);

    // Fetch Leads (Ordered by ultima_mensagem)
    const fetchLeads = useCallback(async () => {
        if (!supabase) return;
        setIsLoadingLeads(true);
        
        // We order by 'ultima_mensagem' descending so active chats are on top
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('ultima_mensagem', { ascending: false, nullsFirst: false }) 
            .limit(100); 

        if (error) {
            console.error("Error fetching inbox leads:", error);
        } else {
            setLeads(data as Lead[]);
            setFilteredLeads(data as Lead[]);
        }
        setIsLoadingLeads(false);
    }, []);

    // Filter logic
    useEffect(() => {
        if (!searchTerm) {
            setFilteredLeads(leads);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredLeads(leads.filter(l => 
                (l.nome && l.nome.toLowerCase().includes(lower)) || 
                (l.telefone && l.telefone.includes(lower))
            ));
        }
    }, [searchTerm, leads]);

    // Initial Load & Sync
    useEffect(() => {
        fetchLeads();
    }, [fetchLeads, syncTrigger]);

    // Fetch Messages when lead is selected (HYBRID FETCH: N8N + Native)
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedLead || !supabase) return;
            setIsLoadingMessages(true);
            setMessages([]); // Clear previous

            try {
                // 1. Fetch CRM Native Messages
                const crmPromise = supabase
                    .from('mensagens')
                    .select('*')
                    .eq('lead_id', selectedLead.id)
                    .order('created_at', { ascending: true });

                // 2. Fetch N8N History (if phone exists)
                // We assume session_id in N8N is just digits of phone number
                let n8nPromise = Promise.resolve({ data: [], error: null } as any);
                let cleanPhone = '';
                
                if (selectedLead.telefone) {
                    cleanPhone = selectedLead.telefone.replace(/\D/g, '');
                    if (cleanPhone) {
                        // N8N table usually stores phone in session_id
                        n8nPromise = supabase
                            .from('n8n_chat_histories')
                            .select('*')
                            // Try to match exact phone or phone with country code variations if needed
                            // For now, exact match on session_id
                            .eq('session_id', cleanPhone)
                            .order('id', { ascending: true }); // Assuming ID order is chronological if created_at is missing/unreliable
                    }
                }

                const [crmRes, n8nRes] = await Promise.all([crmPromise, n8nPromise]);

                // Process N8N Data
                const n8nMessages: Message[] = (n8nRes.data || []).map((item: any) => {
                    // Extract content from JSONB
                    // Expected format: { "type": "human" | "ai", "content": "..." }
                    const content = item.message?.content || '';
                    const type = item.message?.type || 'unknown';
                    
                    return {
                        id: -item.id, // Negative ID to avoid collision with CRM IDs
                        created_at: item.created_at || new Date().toISOString(), // Use DB timestamp if available
                        lead_id: selectedLead.id,
                        conteudo: content,
                        tipo: 'text',
                        direcao: type === 'human' ? 'inbound' : 'outbound',
                        status: 'read'
                    };
                });

                // Process CRM Data
                const crmMessages: Message[] = (crmRes.data || []) as Message[];

                // Merge and Sort
                let combinedMessages = [...n8nMessages, ...crmMessages];
                
                // If both are empty, check the legacy 'mensagem' column on the lead itself as a fallback
                if (combinedMessages.length === 0 && selectedLead.mensagem) {
                    combinedMessages.push({
                        id: 0,
                        created_at: selectedLead.ultima_mensagem || new Date().toISOString(),
                        lead_id: selectedLead.id,
                        conteudo: selectedLead.mensagem,
                        tipo: 'text',
                        direcao: 'inbound', // Assume last message stored in lead row is from lead
                        status: 'read'
                    });
                }

                // Final Sort by ID (or Date if preferred, but ID usually safer for N8N sync)
                // Actually, let's sort by created_at string comparison
                combinedMessages.sort((a, b) => {
                    const dateA = a.created_at || '';
                    const dateB = b.created_at || '';
                    return dateA.localeCompare(dateB);
                });

                setMessages(combinedMessages);

            } catch (error) {
                console.error("Error aggregating messages:", error);
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [selectedLead]);

    // Smart Reply Logic (AI)
    const handleSmartReply = async () => {
        if (!selectedLead || !ai) return;
        
        setIsGeneratingReply(true);
        
        try {
            // Get context from last 10 messages
            const contextMessages = messages.slice(-10).map(m => 
                `${m.direcao === 'outbound' ? 'Vendedor' : 'Cliente'}: ${m.conteudo}`
            ).join('\n');

            const prompt = `Você é um assistente de vendas experiente usando o CRM Dialog.
            Seu objetivo é sugerir uma resposta curta, educada e persuasiva para o cliente abaixo.
            
            Contexto do Lead:
            Nome: ${selectedLead.nome}
            Interesse: ${selectedLead.tag_plano_de_interesse || 'Geral'}
            
            Histórico recente da conversa:
            ${contextMessages}
            
            Instrução: Responda APENAS com o texto da mensagem sugerida para o vendedor enviar. Mantenha o tom profissional mas próximo. Use português do Brasil.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            setInputText(response.text.trim());

        } catch (error) {
            console.error("AI Error:", error);
            alert("Não foi possível gerar a sugestão. Tente novamente.");
        } finally {
            setIsGeneratingReply(false);
        }
    };

    // Send Message Logic (Z-API + DB Update)
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedLead || !supabase) return;

        const textToSend = inputText.trim();
        setInputText(''); // Optimistic clear
        setIsSending(true);

        const instance = localStorage.getItem('dialog_zapi_instance');
        const token = localStorage.getItem('dialog_zapi_token');

        if (!instance || !token) {
            alert("Erro: Configure suas credenciais da Z-API no Perfil para enviar mensagens.");
            setIsSending(false);
            return;
        }

        const phone = selectedLead.telefone?.replace(/\D/g, '');
        if (!phone) {
            alert("Erro: Este lead não possui telefone válido.");
            setIsSending(false);
            return;
        }

        try {
            // 1. Send via Z-API
            const response = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone.length <= 11 ? '55' + phone : phone,
                    message: textToSend
                })
            });

            if (!response.ok) throw new Error("Falha no envio Z-API");

            // 2. Insert into 'mensagens' table (Our Record)
            const newMessageObj = {
                lead_id: selectedLead.id,
                conteudo: textToSend,
                tipo: 'text',
                direcao: 'outbound', // Sent by us
                created_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase.from('mensagens').insert([newMessageObj]);

            if (insertError) {
                console.warn("Message sent but failed to save to DB:", insertError);
            }

            // 3. Update Lead 'ultima_mensagem'
            await supabase.from('leads').update({ 
                ultima_mensagem: new Date().toISOString(),
                // Optional: Update status to 'Em Atendimento' if it was 'Novo Lead'
                status: selectedLead.status === 'Novo Lead' ? 'Em Atendimento' : selectedLead.status
            }).eq('id', selectedLead.id);

            // 4. Update local state
            setMessages(prev => [...prev, {
                ...newMessageObj,
                id: Date.now(),
                tipo: 'text',
                direcao: 'outbound' 
            } as Message]);
            
            // Refresh lead list order
            fetchLeads();

        } catch (err) {
            console.error("Error sending message:", err);
            alert("Erro ao enviar mensagem via WhatsApp. Verifique sua conexão e credenciais.");
            setInputText(textToSend); // Restore text on error
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-6rem)] bg-[#0A0A0A] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            {/* Left Sidebar: Lead List */}
            <div className={`w-full md:w-80 border-r border-gray-800 bg-[#191919] flex flex-col ${selectedLead ? 'hidden md:flex' : 'flex'}`}>
                {/* Search Header */}
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white mb-4">Inbox</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar conversa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#D99B54]"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoadingLeads ? (
                        <div className="flex justify-center p-8 text-gray-500">
                            <RefreshIcon className="w-6 h-6 animate-spin" />
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="text-center p-8 text-gray-500 text-sm">
                            Nenhuma conversa encontrada.
                        </div>
                    ) : (
                        filteredLeads.map(lead => (
                            <LeadListItem 
                                key={lead.id} 
                                lead={lead} 
                                isActive={selectedLead?.id === lead.id} 
                                onClick={() => setSelectedLead(lead)} 
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: Chat Area */}
            <div className={`flex-1 flex flex-col bg-[#0f0f0f] ${!selectedLead ? 'hidden md:flex' : 'flex'}`}>
                {selectedLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-gray-800 bg-[#191919] flex items-center justify-between px-6 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedLead(null)} className="md:hidden text-gray-400 mr-2">←</button>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D99B54] to-[#8c5e2a] flex items-center justify-center font-bold text-black">
                                    {selectedLead.nome ? selectedLead.nome.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm md:text-base">{selectedLead.nome}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>{selectedLead.telefone}</span>
                                        <StatusBadge status={selectedLead.status} />
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowLeadDetails(true)}
                                className="p-2 text-gray-400 hover:text-[#D99B54] transition-colors rounded-full hover:bg-[#2a2a2a]" title="Ver Detalhes do Lead"
                            >
                                <EyeIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-opacity-50" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay', backgroundColor: '#0f0f0f'}}>
                            {isLoadingMessages ? (
                                <div className="flex justify-center mt-10"><RefreshIcon className="w-6 h-6 animate-spin text-[#D99B54]" /></div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <div className="bg-[#191919] p-6 rounded-xl border border-gray-800 text-center max-w-md">
                                        <p className="mb-2 font-medium text-white">Inicie a conversa!</p>
                                        <p className="text-sm">Nenhuma mensagem encontrada no histórico. Que tal mandar um "Oi"?</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <ChatMessage 
                                        key={msg.id || idx} 
                                        message={msg} 
                                        isMe={msg.direcao === 'outbound'} 
                                    />
                                ))
                            )}
                            
                            {isGeneratingReply && (
                                <div className="flex w-full mb-4 justify-end">
                                    <div className="bg-[#D99B54]/20 text-[#D99B54] rounded-2xl p-3 text-xs flex items-center gap-2 animate-pulse">
                                        <SparklesIcon className="w-4 h-4" />
                                        <span>A DAI está escrevendo uma sugestão...</span>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Actions & Input Area */}
                        <div className="p-4 bg-[#191919] border-t border-gray-800">
                            {/* Toolbar */}
                            <div className="flex gap-3 mb-3">
                                <button 
                                    onClick={handleSmartReply}
                                    disabled={isGeneratingReply}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[#D99B54]/10 text-[#D99B54] rounded-lg hover:bg-[#D99B54]/20 transition-colors text-xs font-bold border border-[#D99B54]/30"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    {isGeneratingReply ? 'Pensando...' : 'Sugerir Resposta'}
                                </button>
                                <button 
                                    onClick={() => setShowTemplatesModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium border border-gray-700"
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    Templates
                                </button>
                            </div>

                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-[#0A0A0A] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#D99B54] placeholder-gray-500"
                                    placeholder="Digite sua mensagem..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    disabled={isSending}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputText.trim() || isSending}
                                    className="bg-[#D99B54] text-black rounded-xl px-6 py-2 font-bold hover:bg-[#c78f4a] transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSending ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
                                </button>
                            </form>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                Enviado via Z-API Oficial • Armazenado no CRM Dialog
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                        <div className="w-20 h-20 bg-[#191919] rounded-full flex items-center justify-center mb-4">
                            <SendIcon className="w-8 h-8 text-[#D99B54]" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Inbox Dialog</h2>
                        <p className="text-center max-w-sm">Selecione uma conversa ao lado para visualizar o histórico e responder em tempo real.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ViewLeadModal 
                lead={selectedLead} 
                isOpen={showLeadDetails} 
                onClose={() => setShowLeadDetails(false)} 
            />
            
            <TemplatesSelectorModal 
                isOpen={showTemplatesModal}
                onClose={() => setShowTemplatesModal(false)}
                onSelect={(content) => {
                    setInputText(content);
                    setShowTemplatesModal(false);
                }}
            />
        </div>
    );
};

export default Inbox;
