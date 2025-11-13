import React, { useState } from 'react';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!supabase) {
      setError("Cliente de autenticação não está configurado.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.message === 'Email not confirmed') {
        setError('Seu email ainda não foi confirmado. Por favor, verifique sua caixa de entrada.');
      } else {
        setError('Email ou senha inválidos.');
      }
    }
    setLoading(false);
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    if (!supabase) {
      setError("Cliente de autenticação não está configurado.");
      setLoading(false);
      return;
    }
    
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
        }
      }
    });
    
    if (error) {
      setError(error.message);
    } else {
        setMessage('Cadastro realizado! Por favor, verifique seu email para confirmar a conta.');
        setIsSigningUp(false); // Switch back to login view
        setEmail('');
        setPassword('');
        setName('');
    }
    setLoading(false);
  };
  
  const brandColor = '#D99B54';

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 pb-16">
         <div className="text-center mb-8">
          <img src="https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-02%20at%2022.39.57-Photoroom.png" alt="Dialog Logo" className="h-32 w-32 mx-auto mb-2" />
          <h1 className="text-5xl font-bold text-[#F5F5F5]">Dialog</h1>
          <p className="text-[#A1A1AA] mt-2">Gerencie suas campanhas e leads com facilidade</p>
        </div>
        <div className="w-full max-w-sm bg-[#191919] rounded-xl shadow-lg p-8">
          <div className="flex mb-6 border-b border-gray-700">
            <button onClick={() => { setIsSigningUp(false); setError(''); setMessage(''); }} className={`w-1/2 pb-3 font-medium text-center transition-colors ${!isSigningUp ? 'text-[#D99B54] border-b-2 border-[#D99B54]' : 'text-[#A1A1AA] hover:text-white'}`}>
              Login
            </button>
            <button onClick={() => { setIsSigningUp(true); setError(''); setMessage(''); }} className={`w-1/2 pb-3 font-medium text-center transition-colors ${isSigningUp ? 'text-[#D99B54] border-b-2 border-[#D99B54]' : 'text-[#A1A1AA] hover:text-white'}`}>
              Criar Conta
            </button>
          </div>

          {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-6 text-center text-sm">{error}</p>}
          {message && <p className="bg-green-900/50 text-green-300 p-3 rounded-md mb-6 text-center text-sm">{message}</p>}
          
          <form onSubmit={isSigningUp ? handleSignUp : handleLogin}>
            <div className="space-y-5">
              {isSigningUp && (
                 <div>
                   <label className="text-sm font-medium text-[#A1A1AA]" htmlFor="name">Nome Completo</label>
                   <input
                     id="name"
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]"
                     placeholder="Seu nome completo"
                     required
                   />
                 </div>
              )}
              <div>
                <label className="text-sm font-medium text-[#A1A1AA]" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]"
                  placeholder="voce@exemplo.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#A1A1AA]" htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-2 px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#D99B54]"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-3 bg-[#D99B54] text-black font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? 'Processando...' : (isSigningUp ? 'Criar Conta' : 'Entrar')}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Login;