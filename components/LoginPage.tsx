
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from './BrandingProvider';
import { Lock, Mail, ChevronRight, Loader2, AlertCircle, ShieldCheck, TrendingUp, ShieldAlert, ScrollText } from 'lucide-react';
import TermsModal from './TermsModal';

interface LoginPageProps {
    onLoginSuccess: (session: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const { config } = useBranding();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(''); // Estado para nome no registro
    const [companyName, setCompanyName] = useState(''); // Estado para nome da empresa
    const [isRegistering, setIsRegistering] = useState(false); // Alternar entre Login/Registro
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showTerms, setShowTerms] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Diagnóstico de Conexão na Montagem
    React.useEffect(() => {
        const checkConnection = async () => {
            const envUrl = import.meta.env.VITE_SUPABASE_URL;
            // @ts-ignore
            const clientUrl = supabase.supabaseUrl;

            if (!envUrl || envUrl.includes('placeholder')) {
                const maskedEnv = envUrl ? envUrl.substring(0, 10) + '...' : 'undefined';
                if (clientUrl && !clientUrl.includes('placeholder') && clientUrl !== envUrl) {
                    return;
                }
                setError(`CONFIGURAÇÃO PENDENTE: Environment Variables não carregadas. Valor lido: ${maskedEnv}. Reinicie o servidor 'npm run dev' se acabou de editar o .env.local.`);
                return;
            }

            try {
                const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
                if (error) {
                    if (error.code !== 'PGRST301' && error.code !== '42501') {
                        console.warn('Ping falhou:', error);
                    }
                }
            } catch (err) {
                console.error('Ping falhou completamente:', err);
                setError('ERRO DE REDE: Não foi possível conectar ao servidor. Verifique sua conexão.');
            }
        };

        checkConnection();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isRegistering && !acceptedTerms) {
            setError('Você precisa aceitar os Termos e a Política de Privacidade para continuar.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const cleanEmail = email.trim();
            const cleanPassword = password.trim();

            if (isRegistering) {
                // 1. FLUXO DE REGISTRO
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password: cleanPassword,
                    options: {
                        data: {
                            full_name: fullName,
                            company_name: companyName
                        }
                    }
                });

                if (authError) throw authError;

                if (authData.user) {
                    setSuccessMsg('Registro concluído! Verifique seu e-mail (se o plano exigir) ou faça login para acessar.');
                    setIsRegistering(false);
                }

            } else {
                // FLUXO DE LOGIN
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: cleanPassword
                });

                if (error) throw error;

                if (data.session) {
                    onLoginSuccess(data.session);
                }
            }
        } catch (err: any) {
            console.error('[Auth] Erro capturado:', err);
            setError(err.message || 'Falha na autenticação. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] relative overflow-hidden">
            {/* Ambient Background */}
            <div className={`absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_0%,var(--color-primary)_0%,transparent_70%)] animate-pulse-slow`}></div>

            {/* Card */}
            <div className="w-full max-w-md p-8 rounded-[2.5rem] glass border border-white/10 relative z-10 shadow-2xl backdrop-blur-xl animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                        ) : (
                            <TrendingUp size={40} className="text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-2 uppercase italic tracking-widest">
                        {config.platformName}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                        {isRegistering ? 'Criação de Nodo Neural Master' : 'Acesso à Matrix Neural Master'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {/* Campo de Nome e Empresa (Apenas Registro) */}
                    {isRegistering && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assinatura Digital (Nome)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm"
                                        placeholder="Seu nome completo"
                                        required={isRegistering}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ativo Principal (Empresa)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors">
                                        <TrendingUp size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm"
                                        placeholder="Nome da sua organização"
                                        required={isRegistering}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-4 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm"
                                placeholder="master@neural.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave Criptográfica (Senha)</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {isRegistering && (
                        <div
                            className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-colors"
                            onClick={() => setAcceptedTerms(!acceptedTerms)}
                        >
                            <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${acceptedTerms ? 'bg-primary border-primary' : 'border-white/10'}`}>
                                {acceptedTerms && <ShieldCheck size={12} className="text-slate-950" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                                    Concordo com os <button type="button" onClick={(e) => { e.stopPropagation(); setShowTerms(true); }} className="text-primary hover:underline">Termos de Uso</button> e a <button type="button" onClick={(e) => { e.stopPropagation(); setShowTerms(true); }} className="text-primary hover:underline">Política de Privacidade (LGPD)</button>.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-head-shake">
                            <AlertCircle className="text-red-500 shrink-0" size={18} />
                            <p className="text-xs text-red-200 font-medium">{error}</p>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 animate-fade-in-up">
                            <ShieldCheck className="text-emerald-500 shrink-0" size={18} />
                            <p className="text-xs text-emerald-200 font-medium">{successMsg}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4.5 bg-primary text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:hover:scale-100 italic"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Validando Matrix...
                            </>
                        ) : (
                            <>
                                {isRegistering ? 'Criar Nodo Neural' : 'Iniciar Sincronização'} <ChevronRight size={16} />
                            </>
                        )}
                    </button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setError(null); setSuccessMsg(null); }}
                            className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest underline decoration-slate-800 underline-offset-8"
                        >
                            {isRegistering ? 'Já possui acesso? Voltar ao Login' : 'Nova conexão? Registrar Master'}
                        </button>
                    </div>
                </form>

                <div className="mt-10 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                    <button
                        onClick={() => setShowTerms(true)}
                        className="flex items-center gap-2 text-[8px] font-black text-slate-700 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors"
                    >
                        <ScrollText size={10} /> Compliance & Regulamentação LGPD
                    </button>
                    <p className="text-[10px] text-slate-700 font-mono italic">
                        Secured by Neural Gate v3.5
                    </p>
                </div>
            </div>

            <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </div>
    );
};

export default LoginPage;
