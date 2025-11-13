
import React, { useState, useCallback, useMemo, createContext, useContext, useEffect } from 'react';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import { User } from './types';
import Footer from './components/Footer';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';


type Page = 'Dashboard' | 'Campanhas' | 'Leads' | 'Analytics' | 'Profile';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  logout: () => void;
  showLoginToast: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const getSession = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
            if (session) {
                const currentUser: User = {
                    name: session.user.user_metadata.full_name || session.user.email || 'Usuário',
                    email: session.user.email || '',
                };
                setUser(currentUser);
            }
            setLoading(false);
        }
    };
    
    getSession();

    if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                const currentUser = session ? {
                    name: session.user.user_metadata.full_name || session.user.email || 'Usuário',
                    email: session.user.email || '',
                } : null;

                // Trigger toast only on login event
                if (!user && currentUser) {
                    setShowLoginToast(true);
                    setTimeout(() => setShowLoginToast(false), 4000);
                }
                
                setUser(currentUser);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription?.unsubscribe();
        };
    }
  }, [user]);


  const logout = useCallback(async () => {
    if (supabase) {
        await supabase.auth.signOut();
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, logout, showLoginToast, loading }), [user, logout, showLoginToast, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Sync Context ---
interface SyncContextType {
  syncTrigger: number;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}

const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [syncTrigger, setSyncTrigger] = useState(0);
    const triggerSync = useCallback(() => setSyncTrigger(c => c + 1), []);
    const value = useMemo(() => ({ syncTrigger, triggerSync }), [syncTrigger, triggerSync]);
    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}


const App = () => {
  return (
    <AuthProvider>
      <SyncProvider>
        <Main />
      </SyncProvider>
    </AuthProvider>
  );
};

const Toast = () => (
    <div className="fixed bottom-5 right-5 bg-[#2a2a2a] border border-gray-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center toast-animation z-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="ml-3 text-sm font-medium">Login realizado com sucesso!</span>
    </div>
);

const Main = () => {
  const { user, showLoginToast, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-[#0A0A0A] text-[#A1A1AA]">
            Carregando sessão...
        </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'Campanhas':
        return <Campaigns />;
      case 'Leads':
        return <Leads />;
      case 'Analytics':
        return <Analytics />;
      case 'Profile':
          return <Profile />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-[#0A0A0A] text-[#F5F5F5]">
        {showLoginToast && <Toast />}
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-16">
            {renderPage()}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default App;
