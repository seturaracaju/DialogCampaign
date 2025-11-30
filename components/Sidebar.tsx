
import React from 'react';
import { useAuth } from '../App';
import DashboardIcon from './icons/DashboardIcon';
import CampaignIcon from './icons/CampaignIcon';
import LeadsIcon from './icons/LeadsIcon';
import AnalyticsIcon from './icons/AnalyticsIcon';
import ProfileIcon from './icons/ProfileIcon';
import LogoutIcon from './icons/LogoutIcon';
import TemplatesIcon from './icons/TemplatesIcon';
import InboxIcon from './icons/InboxIcon';


type Page = 'Dashboard' | 'Campanhas' | 'Leads' | 'Analytics' | 'Profile' | 'Templates' | 'Inbox';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 transition-colors duration-200 rounded-lg ${isActive ? 'bg-[#D99B54] text-black' : 'text-[#A1A1AA] hover:bg-[#2a2a2a] hover:text-[#F5F5F5]'}`}
  >
    {icon}
    <span className="ml-4 font-medium">{label}</span>
  </button>
);

const Sidebar = ({ currentPage, setCurrentPage }: SidebarProps) => {
  const { logout } = useAuth();
  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'Dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" /> },
    { id: 'Inbox', label: 'Inbox (Chat)', icon: <InboxIcon className="w-5 h-5" /> },
    { id: 'Leads', label: 'Leads', icon: <LeadsIcon className="w-5 h-5" /> },
    { id: 'Campanhas', label: 'Campanhas', icon: <CampaignIcon className="w-5 h-5" /> },
    { id: 'Templates', label: 'Templates', icon: <TemplatesIcon className="w-5 h-5" /> },
    { id: 'Analytics', label: 'Analytics', icon: <AnalyticsIcon className="w-5 h-5" /> },
    { id: 'Profile', label: 'Perfil', icon: <ProfileIcon className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-[#191919] p-4 pb-12 flex-shrink-0 flex flex-col justify-between hidden md:flex">
      <div>
        <div className="flex items-center justify-start text-2xl font-bold text-[#F5F5F5] mb-4">
          <img src="https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-02%20at%2022.39.57-Photoroom.png" alt="Dialog Logo" className="h-32 w-32" />
          <span className="-ml-9">Dialog</span>
        </div>
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={currentPage === item.id}
              onClick={() => setCurrentPage(item.id)}
            />
          ))}
        </nav>
      </div>
      <div className="border-t border-gray-700/50 pt-2">
         <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-[#A1A1AA] hover:bg-[#2a2a2a] hover:text-[#F5F5F5] rounded-lg transition-colors duration-200"
        >
            <LogoutIcon className="w-5 h-5" />
            <span className="ml-4 font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
