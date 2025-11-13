
import React from 'react';
import { useAuth } from '../App';
import LogoutIcon from './icons/LogoutIcon';

const Header = () => {
  const { logout, user } = useAuth();
  
  return (
    <header className="bg-[#191919] h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-gray-800">
        <div className="text-[#A1A1AA]">
            Olá, <span className="font-semibold text-[#F5F5F5]">{user?.name || 'Usuário'}</span>
        </div>
        <button 
            onClick={logout} 
            className="p-2 rounded-full text-[#A1A1AA] hover:bg-[#2a2a2a] hover:text-[#D99B54] transition-colors duration-200"
            aria-label="Sair"
        >
            <LogoutIcon className="w-6 h-6" />
        </button>
    </header>
  );
};

export default Header;
