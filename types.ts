
export interface User {
  name: string;
  email: string;
}

export interface Lead {
  id: number;
  created_at?: string;
  nome: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'Novo Lead' | 'Atendimento Humano' | 'Em Atendimento' | 'Campanha MKT' | 'App Download';
  tag_plano_de_interesse: string | null;
  ultima_mensagem: string | null;
  mensagem: string | null;
  resumo_ia: string | null;
  conversa_id: string | null;
  origem: string | null;
  atuacao: string | null;
  telefone: string | null;
  data_origem: string | null;
}

export interface Message {
    id: number;
    created_at: string;
    lead_id: number;
    conteudo: string;
    tipo: 'text' | 'image' | 'audio';
    direcao: 'inbound' | 'outbound'; // inbound = cliente mandou, outbound = empresa mandou
    status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Campaign {
    id: number;
    created_at?: string;
    nome_campanha: string;
    mensagem?: string;
    data_disparo: string;
    tag_alvo?: string;
    status: 'Agendada' | 'Enviada' | 'Rascunho';
    media_type: 'text' | 'image' | 'video';
    media_url?: string;
    total_enviados?: number;
    data_conclusao?: string;
}

export interface CampaignHistory {
    id: number;
    created_at: string;
    status: string;
    canal: string;
    lead_id: number;
    campanha_id: number;
    campanhas?: Campaign; // Joined data
}

export interface Template {
    id: number;
    created_at?: string;
    titulo: string;
    conteudo: string;
    categoria: string;
}

export interface SystemConfig {
    z_api_instance_id: string;
    z_api_token: string;
}
