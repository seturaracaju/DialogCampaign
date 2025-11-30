
import React, { useState, useEffect } from 'react';
import { useAuth, useSync } from '../App';
import RefreshIcon from '../components/icons/RefreshIcon';
import { InputField } from '../components/FormControls';


// Fix: Made children prop optional to resolve incorrect TypeScript errors.
const ProfileCard = ({ children }: { children?: React.ReactNode }) => (
    <div className="bg-[#191919] rounded-xl shadow-lg p-6 md:p-8">
        {children}
    </div>
);

// Fix: Made children prop optional to resolve incorrect TypeScript errors.
const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-[#F5F5F5] border-b border-gray-700 pb-3 mb-6">
        {children}
    </h2>
);

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div>
        <p className="text-sm text-[#A1A1AA]">{label}</p>
        <p className="text-base text-[#F5F5F5] font-medium">{value}</p>
    </div>
);


const Profile = () => {
    const { user } = useAuth();
    const { triggerSync } = useSync();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    
    // Z-API Config State (Using LocalStorage for MVP simplicity)
    const [zApiInstance, setZApiInstance] = useState('');
    const [zApiToken, setZApiToken] = useState('');
    const [configSaved, setConfigSaved] = useState(false);

    useEffect(() => {
        const storedInstance = localStorage.getItem('dialog_zapi_instance');
        const storedToken = localStorage.getItem('dialog_zapi_token');
        if (storedInstance) setZApiInstance(storedInstance);
        if (storedToken) setZApiToken(storedToken);
    }, []);

    const handleSaveConfig = () => {
        localStorage.setItem('dialog_zapi_instance', zApiInstance);
        localStorage.setItem('dialog_zapi_token', zApiToken);
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 3000);
    };

    const handleSync = () => {
        setIsSyncing(true);
        setSyncSuccess(false);
        
        // Trigger the global sync function from context
        triggerSync();
        
        // Simulate a network delay for feedback
        setTimeout(() => {
            setIsSyncing(false);
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 2000); // Hide success message after 2s
        }, 1000);
    };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-[#F5F5F5]">Perfil e Configurações</h1>
      
      <ProfileCard>
        <SectionTitle>Informações do Usuário</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow label="Nome Completo" value={user?.name || 'N/A'} />
            <InfoRow label="Endereço de Email" value={user?.email || 'N/A'} />
        </div>
      </ProfileCard>
      
      <ProfileCard>
          <SectionTitle>Configuração Z-API (WhatsApp)</SectionTitle>
          <div className="space-y-4">
              <p className="text-sm text-gray-400">Insira suas credenciais da Z-API para habilitar o envio real de mensagens.</p>
              <InputField label="Instance ID" value={zApiInstance} onChange={setZApiInstance} placeholder="Ex: 3B2D..." />
              <InputField label="Token" value={zApiToken} onChange={setZApiToken} type="password" placeholder="Seu token de segurança" />
              <button 
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                  {configSaved ? 'Configurações Salvas!' : 'Salvar Configuração'}
              </button>
          </div>
      </ProfileCard>
      
      <ProfileCard>
        <SectionTitle>Segurança</SectionTitle>
        <div className="space-y-4">
           <button className="w-full md:w-auto px-5 py-2.5 text-sm font-medium bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors">
            Alterar Senha
           </button>
            <p className="text-xs text-[#A1A1AA]">Recomendamos o uso de uma senha forte e única.</p>
        </div>
      </ProfileCard>

      <ProfileCard>
        <SectionTitle>Sincronização de Dados</SectionTitle>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <p className="text-sm text-[#A1A1AA] max-w-lg">
                Se você notar que os dados na tela não correspondem aos do banco de dados (devido a edições externas ou problemas de cache), clique aqui para forçar uma atualização em todo o aplicativo.
            </p>
             <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#D99B54] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 w-full md:w-auto"
            >
                <RefreshIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : (syncSuccess ? 'Dados Sincronizados!' : 'Sincronizar Dados')}
            </button>
        </div>
      </ProfileCard>

    </div>
  );
};

export default Profile;
