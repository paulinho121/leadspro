
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from './BrandingProvider';
import { Lock, Mail, ChevronRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

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

    // Diagnóstico de Conexão na Montagem
    React.useEffect(() => {
        const checkConnection = async () => {
            const envUrl = import.meta.env.VITE_SUPABASE_URL;
            // console.log('[Debug] VITE_SUPABASE_URL:', envUrl); // Debug log

            // 1. Checar se a URL é a placeholder ou indefinida
            // @ts-ignore
            const clientUrl = supabase.supabaseUrl;

            if (!envUrl || envUrl.includes('placeholder')) {
                // Mascarar a URL para não mostrar em tela
                const maskedEnv = envUrl ? envUrl.substring(0, 10) + '...' : 'undefined';

                // Se a URL do client é diferente da ENV, pode ser problema de build
                if (clientUrl && !clientUrl.includes('placeholder') && clientUrl !== envUrl) {
                    // Estranho, mas talvez o client esteja OK
                    return;
                }

                setError(`CONFIGURAÇÃO PENDENTE: Environment Variables não carregadas. Valor lido: ${maskedEnv}. Reinicie o servidor 'npm run dev' se acabou de editar o .env.local.`);
                return;
            }

            // 2. Tentar um ping simples
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
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isRegistering) {
                // 1. FLUXO DE REGISTRO
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

                if (authError) throw authError;

                // 2. Se o registro funcionou e temos um usuário, vamos criar a EMPRESA (Tenant)
                if (authData.user) {
                    try {
                        // A. Criar o Tenant
                        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
                        const { data: tenantData, error: tenantError } = await supabase
                            .from('tenants')
                            .insert({
                                name: companyName,
                                slug: slug,
                                plan: 'pro'
                            })
                            .select()
                            .single();

                        if (tenantError) throw tenantError;

                        if (tenantData) {
                            // B. Criar Configuração White Label Padrão para esse Tenant
                            await supabase.from('white_label_configs').insert({
                                tenant_id: tenantData.id,
                                platform_name: companyName, // O nome da plataforma começa como o nome da empresa
                                primary_color: '#06b6d4',
                                secondary_color: '#3b82f6'
                            });

                            // C. MOVER o usuário para o novo Tenant (O trigger inicial jogou ele pro default '0000...')
                            // Precisamos dar um pequeno delay para garantir que o trigger do banco já rodou
                            // Mas como o trigger é AFTER INSERT, normalmente ele roda na mesma transação.
                            // Porém, update via client side pode ter delay. Vamos tentar direto.

                            const { error: profileError } = await supabase
                                .from('profiles')
                                .update({
                                    tenant_id: tenantData.id,
                                    role: 'admin' // Quem cria a empresa é Admin dela
                                })
                                .eq('id', authData.user.id);

                            if (profileError) {
                                console.warn('Erro ao mover perfil para novo tenant:', profileError);
                                // Não vamos falhar o registro por isso, o usuário pode pedir suporte ou tentamos recuperar depois
                            }
                        }

                        setSuccessMsg('Conta e Empresa criadas com sucesso! Faça login para começar.');
                        setIsRegistering(false);

                    } catch (setupError: any) {
                        console.error('Erro no setup da empresa:', setupError);
                        // Mesmo com erro no setup, o usuário foi criado. 
                        setSuccessMsg('Usuário criado, mas houve um erro ao configurar a empresa: ' + setupError.message);
                        setIsRegistering(false);
                    }
                }

            } else {
                // FLUXO DE LOGIN
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                if (data.session) {
                    onLoginSuccess(data.session);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Falha na autenticação. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(6,182,212,0.15)_0%,_transparent_70%)] animate-pulse-slow"></div>

            {/* Card */}
            <div className="w-full max-w-md p-8 rounded-3xl glass border border-white/10 relative z-10 shadow-2xl backdrop-blur-xl animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                        ) : (
                            <ShieldCheck size={40} className="text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                        {config.platformName}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">
                        {isRegistering ? 'Crie sua conta Master' : 'Acesso Administrativo Master'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {/* Campo de Nome e Empresa (Apenas Registro) */}
                    {isRegistering && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                                        placeholder="Ex: Ana Silva"
                                        required={isRegistering}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Sua Empresa</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                                        placeholder="Ex: Agência Digital X"
                                        required={isRegistering}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                                placeholder="master@empresa.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

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
                        className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                {isRegistering ? 'Criar Conta' : 'Entrar no Painel'} <ChevronRight size={16} />
                            </>
                        )}
                    </button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setError(null); setSuccessMsg(null); }}
                            className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-slate-700 underline-offset-4"
                        >
                            {isRegistering ? 'Já tem conta? Clique para Entrar.' : 'Não tem conta? Registre-se agora.'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-600 font-mono">
                        Protected by {config.platformName} Secure Gate v3.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
