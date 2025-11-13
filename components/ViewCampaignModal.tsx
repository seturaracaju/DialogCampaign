
import React, { useState, useEffect } from 'react';
import { Campaign } from '../types';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';
import { TextIcon, ImageIcon, VideoIcon } from './icons/MediaIcons';

// Helper components moved from Campaigns.tsx
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

// The modal component itself
const ViewCampaignModal = ({ campaign, isOpen, onClose }: { campaign: Campaign | null, isOpen: boolean, onClose: () => void }) => {
    const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
    const [isLoadingGenerated, setIsLoadingGenerated] = useState(false);

    useEffect(() => {
        const fetchGeneratedMessage = async () => {
            if (!isOpen || !campaign || !supabase) {
                setGeneratedMessage(null);
                return;
            }

            setIsLoadingGenerated(true);
            setGeneratedMessage(null);

            const { data, error } = await supabase
                .from('mensagens_geradas')
                .select('mensagem_gerada')
                .eq('campaign_id', campaign.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setGeneratedMessage(data.mensagem_gerada);
            } else if (error && error.code !== 'PGRST116') {
                console.error("Error fetching generated message:", error.message);
            }
            
            setIsLoadingGenerated(false);
        };

        fetchGeneratedMessage();
    }, [isOpen, campaign]);

    if (!campaign) return null;
    
    const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-white break-words">{value || '-'}</p>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Campanha">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <DetailItem label="Nome" value={campaign.nome_campanha} />
                <DetailItem label="Data de Disparo" value={new Date(`${campaign.data_disparo}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC'})} />
                <DetailItem label="Status" value={<StatusBadge status={campaign.status} />} />
                <DetailItem label="Tag Alvo" value={campaign.tag_alvo} />
                <DetailItem label="Tipo de Mídia" value={<div className="flex items-center gap-2"><MediaIcon type={campaign.media_type} /> <span>{mediaTypeDisplayMap[campaign.media_type]}</span></div>} />
                {campaign.media_url && <DetailItem label="URL da Mídia" value={<a href={campaign.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{campaign.media_url}</a>} />}
                {campaign.mensagem && <DetailItem label="Mensagem / Legenda (Original)" value={<p className="whitespace-pre-wrap">{campaign.mensagem}</p>} />}
                <DetailItem 
                    label="Mensagem Gerada (IA)" 
                    value={
                        isLoadingGenerated 
                            ? <span className="text-gray-500">Buscando...</span>
                            : generatedMessage 
                                ? <p className="whitespace-pre-wrap font-mono text-gray-300">{generatedMessage}</p> 
                                : <span className="text-gray-500">Nenhuma mensagem gerada encontrada.</span>
                    } 
                />
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-black bg-[#D99B54] font-bold hover:opacity-90">Fechar</button>
            </div>
        </Modal>
    );
}

export default ViewCampaignModal;