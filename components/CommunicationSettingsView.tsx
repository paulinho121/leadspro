
import React, { useState, useEffect } from 'react';
import {
    Settings, Save, Smartphone, Mail,
    Shield, CheckCircle2, AlertCircle,
    Terminal, Globe, Key, Zap,
    Activity, Lock, Cpu, Server
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CommunicationSettingsViewProps {
    tenantId: string;
}

const CommunicationSettingsView: React.FC<CommunicationSettingsViewProps> = ({ tenantId }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        whatsapp_url: '',
        whatsapp_key: '',
        whatsapp_instance: '',
        email_resend_key: '',
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('communication_settings')
                    .select('*')
                    .eq('tenant_id', tenantId);

                if (data) {
                    const whatsapp = data.find(s => s.provider_type === 'whatsapp_evolution');
                    const email = data.find(s => s.provider_type === 'email_resend');

                    setSettings({
                        whatsapp_url: whatsapp?.api_url || '',
                        whatsapp_key: whatsapp?.api_key || '',
                        whatsapp_instance: whatsapp?.instance_name || '',
                        email_resend_key: email?.api_key || '',
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar configurações:', err);
            }
        };

        if (tenantId) loadSettings();
    }, [tenantId]);

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Salvar WhatsApp
            const { error: waError } = await supabase
                .from('communication_settings')
                .upsert({
                    tenant_id: tenantId,
                    provider_type: 'whatsapp_evolution',
                    api_url: settings.whatsapp_url,
                    api_key: settings.whatsapp_key,
                    instance_name: settings.whatsapp_instance,
                    is_active: true
                }, { onConflict: 'tenant_id,provider_type' });

            if (waError) throw waError;

            // Salvar Email
            const { error: mailError } = await supabase
                .from('communication_settings')
                .upsert({
                    tenant_id: tenantId,
                    provider_type: 'email_resend',
                    api_key: settings.email_resend_key,
                    is_active: true
                }, { onConflict: 'tenant_id,provider_type' });

            if (mailError) throw mailError;

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar configurações');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-10">
            {/* Balanced Header */}
            <div className="flex flex-col md:flex-row justify-between items-center p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                        <Cpu className="text-primary" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 font-bold">
                            <span className="px-2 py-0.5 bg-primary text-slate-900 text-[8px] font-black uppercase tracking-widest rounded-full italic">Módulo de Infra</span>
                            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest leading-none">Status: Encriptação Ativa</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic leading-tight">Configurações de rede</h2>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl relative z-10">
                    <Shield className="text-emerald-500" size={14} />
                    <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest italic">Acesso Seguro</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* WhatsApp Module */}
                <div className="relative bg-slate-900/40 p-8 sm:p-10 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/20 transition-all duration-300 backdrop-blur-xl flex flex-col group">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-xl transition-all group-hover:scale-110">
                            <Smartphone className="text-emerald-500" size={28} />
                        </div>
                        <div className="text-right">
                            <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest block mb-1">WhatsApp Business</span>
                            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Evolution API</h3>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-8 font-medium">
                        Conecte seu servidor de comunicação para habilitar disparos massivos via WhatsApp automáticos.
                    </p>

                    <div className="space-y-6 flex-grow">
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Globe size={12} className="text-emerald-500/40" /> Endpoint da API
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                placeholder="https://api.seuserver.com"
                                value={settings.whatsapp_url}
                                onChange={e => setSettings({ ...settings, whatsapp_url: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Key size={12} className="text-emerald-500/40" /> Chave de Acesso
                            </label>
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                placeholder="••••••••••••••••"
                                value={settings.whatsapp_key}
                                onChange={e => setSettings({ ...settings, whatsapp_key: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Terminal size={12} className="text-emerald-500/40" /> Nome da Instância
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all uppercase"
                                placeholder="EX: MATRIZ_SP"
                                value={settings.whatsapp_instance}
                                onChange={e => setSettings({ ...settings, whatsapp_instance: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Email Module */}
                <div className="relative bg-slate-900/40 p-8 sm:p-10 rounded-[2.5rem] border border-white/5 hover:border-blue-500/20 transition-all duration-300 backdrop-blur-xl flex flex-col group">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-xl transition-all group-hover:scale-110">
                            <Mail className="text-blue-500" size={28} />
                        </div>
                        <div className="text-right">
                            <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest block mb-1">Correio Eletrônico</span>
                            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Resend API</h3>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-8 font-medium">
                        Integre o Resend para transmissões de alta entrega com relatórios de abertura e cliques.
                    </p>

                    <div className="space-y-6 flex-grow">
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Key size={12} className="text-blue-500/40" /> Token de Autenticação
                            </label>
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                placeholder="re_••••••••••••••••"
                                value={settings.email_resend_key}
                                onChange={e => setSettings({ ...settings, email_resend_key: e.target.value })}
                            />
                        </div>

                        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl mt-6">
                            <div className="flex gap-4">
                                <Lock size={18} className="text-blue-400 shrink-0" />
                                <p className="text-[10px] text-blue-400/70 leading-relaxed font-medium">
                                    Suas chaves são criptografadas e armazenadas com isolamento total por conta.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <div className="flex flex-col items-center gap-6 py-8">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`group flex items-center gap-4 px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl italic ${loading
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                            : 'bg-primary text-slate-900 hover:scale-[1.03] active:scale-95 shadow-primary/20'
                        }`}
                >
                    {loading ? (
                        <>
                            <Activity className="animate-spin" size={18} />
                            <span>Processando Alterações</span>
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle2 className="text-slate-900" size={18} />
                            <span>Sistema Sincronizado</span>
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            <span>Sincronizar Infraestrutura</span>
                        </>
                    )}
                </button>

                {error && (
                    <div className="flex items-center gap-3 text-red-400 bg-red-400/5 px-8 py-4 rounded-full border border-red-400/20">
                        <AlertCircle size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest italic">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunicationSettingsView;
