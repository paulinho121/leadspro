
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from './BrandingProvider';
import { Lock, Mail, ChevronRight, Loader2, AlertCircle, ShieldCheck, TrendingUp, ShieldAlert, ScrollText } from 'lucide-react';
import TermsModal from './TermsModal';

interface LoginPageProps {
    onLoginSuccess: (session: any) => void;
    isRecoveringPassword?: boolean;
    onPasswordReset?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, isRecoveringPassword, onPasswordReset }) => {
    const { config } = useBranding();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(''); // Estado para nome no registro
    const [companyName, setCompanyName] = useState(''); // Estado para nome da empresa
    const [isRegistering, setIsRegistering] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
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

            if (isResetting) {
                const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                    redirectTo: window.location.origin
                });
                if (error) throw error;
                setSuccessMsg('Link de recuperação enviado para o seu e-mail!');
                setIsResetting(false);
                return;
            }

            if (isRecoveringPassword) {
                const { error } = await supabase.auth.updateUser({ password: cleanPassword });
                if (error) throw error;
                setSuccessMsg('Senha atualizada com sucesso! Você pode entrar agora.');
                if (onPasswordReset) onPasswordReset();
                setIsResetting(false);
                return;
            }

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
                    setSuccessMsg('Registro concluído! Verifique seu e-mail para ativar seu Nodo Neural.');
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

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-start justify-center bg-[var(--color-background)] relative overflow-y-auto py-10 md:py-20 px-4">
            {/* Ambient Background */}
            <div className={`fixed top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_0%,var(--color-primary)_0%,transparent_70%)] animate-pulse-slow pointer-events-none`}></div>

            {/* Card */}
            <div className="w-full max-w-md p-8 rounded-[2.5rem] glass border border-white/10 relative z-10 shadow-2xl backdrop-blur-xl animate-fade-in-up mb-10">
                <div className="text-center mb-12 flex flex-col items-center justify-center w-full">
                    {/* Container de animação base suave (flutuação) */}
                    <div className="animate-float">
                        <img
                            src="/logo-login.png"
                            alt="Logo LeadMatrix"
                            className="max-w-[350px] md:max-w-[420px] w-full h-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-700 hover:scale-105"
                        />
                    </div>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {!isRecoveringPassword && (
                        <div className="space-y-4 animate-fade-in-up">
                            {isRegistering && (
                                <>
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
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm autofill:bg-black/20"
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
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm autofill:bg-black/20"
                                                placeholder="Nome da sua organização"
                                                required={isRegistering}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-4 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm autofill:bg-black/20"
                                        placeholder="master@neural.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {!isResetting && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {isRecoveringPassword ? 'Nova Chave Criptográfica' : 'Chave Criptográfica (Senha)'}
                                </label>
                                {!isRegistering && !isRecoveringPassword && (
                                    <button
                                        type="button"
                                        onClick={() => setIsResetting(true)}
                                        className="text-[9px] font-black text-primary/60 hover:text-primary uppercase tracking-widest transition-colors"
                                    >
                                        Esqueci a Chave
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm"
                                    placeholder="••••••••"
                                    required={!isResetting}
                                />
                            </div>
                        </div>
                    )}

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
                        className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:hover:scale-100 italic"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Processando Matrix...
                            </>
                        ) : (
                            <>
                                {isRecoveringPassword ? 'Atualizar Key' : isResetting ? 'Enviar Link de Resgate' : isRegistering ? 'Criar Nodo Neural' : 'Iniciar Sincronização'} <ChevronRight size={16} />
                            </>
                        )}
                    </button>

                    {!isResetting && !isRegistering && (
                        <div className="space-y-4">
                            <div className="relative flex items-center justify-center">
                                <span className="absolute bg-transparent px-4 text-[8px] font-black text-slate-700 uppercase tracking-[0.3em] backdrop-blur-sm">Ou use a Identity Matrix</span>
                                <div className="w-full h-[1px] bg-white/5"></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 group"
                            >
                                <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Entrar com Google Matrix
                            </button>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (isRecoveringPassword && onPasswordReset) {
                                    onPasswordReset();
                                } else if (isResetting) {
                                    setIsResetting(false);
                                } else {
                                    setIsRegistering(!isRegistering);
                                }
                                setError(null);
                                setSuccessMsg(null);
                            }}
                            className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest underline decoration-slate-800 underline-offset-8"
                        >
                            {isRecoveringPassword ? 'Cancelar Recuperação' : isResetting ? 'Voltar ao Login' : isRegistering ? 'Já possui acesso? Voltar ao Login' : 'Nova conexão? Registrar Master'}
                        </button>
                    </div>
                </form>

                <div className="mt-10 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setShowTerms(true)}
                            className="flex items-center gap-2 text-[8px] font-black text-slate-700 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors"
                        >
                            <ScrollText size={10} /> Compliance & Regulamentação
                        </button>
                        <a
                            href="mailto:labwpplus@gmail.com"
                            className="flex items-center gap-2 text-[8px] font-black text-slate-700 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors"
                        >
                            <AlertCircle size={10} /> Suporte Técnico
                        </a>
                    </div>
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
