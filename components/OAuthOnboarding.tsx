import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, TrendingUp, ChevronRight, Loader2, AlertCircle, ScrollText } from 'lucide-react';
import TermsModal from './TermsModal';

interface OAuthOnboardingProps {
    session: any;
    onComplete: (companyName: string) => void;
    tenantId: string | null;
}

const OAuthOnboarding: React.FC<OAuthOnboardingProps> = ({ session, onComplete, tenantId }) => {
    const [companyName, setCompanyName] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!acceptedTerms) {
            setError('Você precisa aceitar os Termos e LGPD para continuar.');
            return;
        }

        if (!companyName.trim()) {
            setError('Por favor, informe o nome da sua empresa.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Atualizar metadata do usuário
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    company_name: companyName.trim()
                }
            });

            if (updateError) throw updateError;

            // 2. Tentar atualizar o nome do tenant se já foi gerado
            if (tenantId) {
                await supabase.from('tenants').update({ name: companyName.trim() }).eq('id', tenantId);

                // Mudar também no white label config
                await supabase.from('white_label_configs').update({ platform_name: companyName.trim() }).eq('tenant_id', tenantId);
            }

            onComplete(companyName.trim());

        } catch (err: any) {
            console.error('Erro no Onboarding:', err);
            setError(err.message || 'Ocorreu um erro ao finalizar o cadastro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] relative p-4 z-[9999] absolute top-0 left-0 w-full">
            {/* Ambient Background */}
            <div className={`fixed top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_0%,var(--color-primary)_0%,transparent_70%)] pointer-events-none`}></div>

            <div className="w-full max-w-md p-8 rounded-[2.5rem] glass border border-white/10 relative z-10 shadow-2xl backdrop-blur-xl animate-fade-in-up">
                <div className="text-center mb-8">
                    <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Quase lá!</h2>
                    <p className="text-sm text-slate-400">Precisamos de apenas mais uma informação para configurar o seu ambiente seguro.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sua Empresa (Workspace)</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors">
                                <TrendingUp size={20} />
                            </div>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-slate-600 text-sm"
                                placeholder="Nome da sua organização"
                                required
                            />
                        </div>
                    </div>

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

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-head-shake">
                            <AlertCircle className="text-red-500 shrink-0" size={18} />
                            <p className="text-xs text-red-200 font-medium">{error}</p>
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
                                Configurando...
                            </>
                        ) : (
                            <>
                                Finalizar Configuração <ChevronRight size={16} />
                            </>
                        )}
                    </button>

                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
                        <button
                            type="button"
                            onClick={async () => await supabase.auth.signOut()}
                            className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest underline decoration-slate-800 underline-offset-8"
                        >
                            Sair
                        </button>
                    </div>
                </form>
            </div>

            <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
        </div>
    );
};

export default OAuthOnboarding;
