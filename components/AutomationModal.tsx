
import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import Modal from './Modal';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';
import { ai } from '../lib/gemini';

interface AutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (message: string) => Promise<void>;
    onSkip: () => void;
    lead: Lead | null;
    newStatus: string;
}

const AutomationModal = ({ isOpen, onClose, onConfirm, onSkip, lead, newStatus }: AutomationModalProps) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Default Templates based on Status
    useEffect(() => {
        if (isOpen && lead) {
            let template = '';
            const firstName = lead.nome ? lead.nome.split(' ')[0] : 'Visitante';

            switch (newStatus) {
                case 'Atendimento Humano':
                    template = `Olá ${firstName}, tudo bem? Sou da equipe Dialog. Vi que você se cadastrou recentemente e gostaria de entender melhor o que você procura. Podemos conversar rapidinho?`;
                    break;
                case 'App Download':
                    template = `Oi ${firstName}! Vi seu interesse no nosso App. Aqui está o link direto para download: https://dialog.app/download \n\nQualquer dúvida na instalação, me chame!`;
                    break;
                case 'Campanha MKT':
                    template = `Olá ${firstName}, estamos com uma condição especial essa semana para o plano que você olhou. Tem interesse em saber os valores atualizados?`;
                    break;
                case 'Em Atendimento':
                    template = `Oi ${firstName}, estou retomando nosso contato para saber se você conseguiu analisar a proposta?`;
                    break;
                default:
                    template = `Olá ${firstName}, atualizei seu status para ${newStatus}. Como posso ajudar?`;
            }
            setMessage(template);
        }
    }, [isOpen, lead, newStatus]);

    const handleImproveAI = async () => {
        if (!ai) return;
        setIsGenerating(true);
        try {
            const prompt = `Melhore esta mensagem de vendas para WhatsApp. O lead mudou para o status "${newStatus}".
            Seja curto, persuasivo e amigável. Use português do Brasil.
            Mensagem atual: "${message}"`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            setMessage(response.text.trim());
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = async () => {
        setIsSending(true);
        await onConfirm(message);
        setIsSending(false);
    };

    if (!lead) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Automação Detectada ⚡">
            <div className="space-y-4">
                <div className="bg-[#2a2a2a] p-4 rounded-lg border-l-4 border-[#D99B54]">
                    <p className="text-gray-300 text-sm">
                        Você moveu <strong>{lead.nome}</strong> para <strong className="text-[#D99B54]">{newStatus}</strong>.
                        Deseja enviar esta mensagem automática via WhatsApp?
                    </p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Mensagem Sugerida</label>
                        <button 
                            onClick={handleImproveAI}
                            disabled={isGenerating}
                            className="flex items-center gap-1 text-xs text-[#D99B54] hover:underline disabled:opacity-50"
                        >
                            <SparklesIcon className="w-3 h-3" />
                            {isGenerating ? 'Melhorando...' : 'Melhorar com IA'}
                        </button>
                    </div>
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={onSkip}
                        className="flex-1 py-3 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Apenas Mover (Sem Mensagem)
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isSending}
                        className="flex-[2] py-3 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        {isSending ? (
                            'Enviando...'
                        ) : (
                            <>
                                <SendIcon className="w-5 h-5" />
                                Enviar & Mover
                            </>
                        )}
                    </button>
                </div>
                <button onClick={onClose} className="w-full text-xs text-gray-500 hover:text-gray-300 mt-2">Cancelar Operação</button>
            </div>
        </Modal>
    );
};

export default AutomationModal;
