
import React, { useState, useEffect } from 'react';
import {
    Settings, Save, Smartphone, Mail,
    Shield, CheckCircle2, AlertCircle,
    Terminal, Globe, Key, Zap,
    Activity, Lock, Cpu, Server,
    ChevronDown, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CommunicationSettingsViewProps {
    tenantId: string;
}

type WhatsAppProvider = 'whatsapp_evolution' | 'whatsapp_zapi' | 'whatsapp_duilio';

const CommunicationSettingsView: React.FC<CommunicationSettingsViewProps> = ({ tenantId }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Estados para Teste de Conexão ---
    const [testingWa, setTestingWa] = useState(false);
    const [testResultWa, setTestResultWa] = useState<{ ok: boolean; msg: string } | null>(null);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testResultEmail, setTestResultEmail] = useState<{ ok: boolean; msg: string } | null>(null);

    const [selectedWaProvider, setSelectedWaProvider] = useState<WhatsAppProvider>('whatsapp_evolution');

    const [waSettings, setWaSettings] = useState({
        apiUrl: '',
        apiKey: '',
        instanceName: '',
        clientToken: '',
    });

    const [emailSettings, setEmailSettings] = useState({
        resendKey: '',
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data } = await supabase
                    .from('communication_settings')
                    .select('*')
                    .eq('tenant_id', tenantId);

                if (data) {
                    // Find active WhatsApp provider or fallback to evolution
                    const activeWa = data.find(s => s.provider_type.startsWith('whatsapp_') && s.is_active) ||
                        data.find(s => s.provider_type === 'whatsapp_evolution');

                    if (activeWa) {
                        setSelectedWaProvider(activeWa.provider_type as WhatsAppProvider);
                        setWaSettings({
                            apiUrl: activeWa.api_url || '',
                            apiKey: activeWa.api_key || '',
                            instanceName: activeWa.instance_name || '',
                            clientToken: activeWa.client_token || '',
                        });
                    }

                    const email = data.find(s => s.provider_type === 'email_resend');
                    if (email) {
                        setEmailSettings({
                            resendKey: email.api_key || '',
                        });
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar configurações:', err);
            }
        };

        if (tenantId) loadSettings();
    }, [tenantId]);

    // Handle provider change: load its existing settings if any
    const handleProviderChange = async (provider: WhatsAppProvider) => {
        setSelectedWaProvider(provider);
        try {
            const { data } = await supabase
                .from('communication_settings')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('provider_type', provider)
                .single();

            if (data) {
                setWaSettings({
                    apiUrl: data.api_url || '',
                    apiKey: data.api_key || '',
                    instanceName: data.instance_name || '',
                    clientToken: data.client_token || '',
                });
            } else {
                setWaSettings({ apiUrl: '', apiKey: '', instanceName: '', clientToken: '' });
            }
        } catch (err) {
            setWaSettings({ apiUrl: '', apiKey: '', instanceName: '', clientToken: '' });
        }
    };

    // --- Teste de Conexão WhatsApp ---
    const handleTestWaConnection = async () => {
        setTestingWa(true);
        setTestResultWa(null);
        try {
            if (selectedWaProvider === 'whatsapp_zapi') {
                // Z-API: GET /instances/{instanceId}/status com Client-Token header
                if (!waSettings.instanceName || !waSettings.apiKey) {
                    setTestResultWa({ ok: false, msg: 'Preencha o Instance ID e o Token antes de testar.' });
                    return;
                }
                const baseUrl = waSettings.apiUrl || 'https://api.z-api.io';
                const url = `${baseUrl.replace(/\/$/, '')}/instances/${waSettings.instanceName}/token/${waSettings.apiKey}/status`;
                const res = await fetch(url, {
                    headers: waSettings.clientToken ? { 'Client-Token': waSettings.clientToken } : {}
                });
                if (res.ok) {
                    const json = await res.json().catch(() => ({}));
                    const connected = json?.connected ?? json?.status === 'CONNECTED';
                    setTestResultWa({
                        ok: true,
                        msg: connected ? '✅ Z-API conectada e instância ativa!' : '⚠️ Z-API acessível, mas instância pode estar desconectada.'
                    });
                } else {
                    setTestResultWa({ ok: false, msg: `Z-API retornou HTTP ${res.status} — verifique as credenciais.` });
                }
            } else if (selectedWaProvider === 'whatsapp_evolution') {
                // Evolution API: GET /instance/fetchInstances
                if (!waSettings.apiUrl || !waSettings.apiKey) {
                    setTestResultWa({ ok: false, msg: 'Preencha o Endpoint e a Chave de Acesso antes de testar.' });
                    return;
                }
                const url = `${waSettings.apiUrl.replace(/\/$/, '')}/instance/fetchInstances`;
                const res = await fetch(url, { headers: { apikey: waSettings.apiKey } });
                if (res.ok) {
                    setTestResultWa({ ok: true, msg: '✅ Evolution API acessível e autenticada!' });
                } else {
                    setTestResultWa({ ok: false, msg: `Evolution API retornou HTTP ${res.status} — verifique o endpoint e a API key.` });
                }
            } else {
                // Duílio ou outro: tentativa genérica
                if (!waSettings.apiUrl) {
                    setTestResultWa({ ok: false, msg: 'Preencha o Endpoint antes de testar.' });
                    return;
                }
                const res = await fetch(waSettings.apiUrl, { method: 'GET' }).catch(() => null);
                if (res && res.ok) {
                    setTestResultWa({ ok: true, msg: '✅ Endpoint acessível!' });
                } else {
                    setTestResultWa({ ok: false, msg: 'Não foi possível alcançar o endpoint. Verifique a URL.' });
                }
            }
        } catch (err: any) {
            // Erro de CORS ou rede — comum ao chamar APIs externas direto do browser
            if (err?.name === 'TypeError' || String(err).includes('Failed to fetch') || String(err).includes('NetworkError')) {
                setTestResultWa({ ok: false, msg: '⚠️ CORS ou rede bloqueou a requisição. Verifique se a URL está correta, ou teste pelo Postman/cURL.' });
            } else {
                setTestResultWa({ ok: false, msg: `Erro: ${err?.message || err}` });
            }
        } finally {
            setTestingWa(false);
        }
    };

    // --- Teste de Conexão Email (Resend) ---
    const handleTestEmailConnection = async () => {
        setTestingEmail(true);
        setTestResultEmail(null);
        try {
            if (!emailSettings.resendKey) {
                setTestResultEmail({ ok: false, msg: 'Insira o token Resend antes de testar.' });
                return;
            }
            const res = await fetch('https://api.resend.com/domains', {
                headers: { Authorization: `Bearer ${emailSettings.resendKey}` }
            });
            if (res.ok) {
                setTestResultEmail({ ok: true, msg: '✅ Token Resend válido e autenticado!' });
            } else if (res.status === 401) {
                setTestResultEmail({ ok: false, msg: '❌ Token inválido ou sem permissão.' });
            } else {
                setTestResultEmail({ ok: false, msg: `Resend retornou HTTP ${res.status}.` });
            }
        } catch (err: any) {
            setTestResultEmail({ ok: false, msg: `Erro de rede: ${err?.message || err}` });
        } finally {
            setTestingEmail(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Deactivate all other WhatsApp providers for this tenant first
            await supabase
                .from('communication_settings')
                .update({ is_active: false })
                .eq('tenant_id', tenantId)
                .ilike('provider_type', 'whatsapp_%');

            // 2. Upsert selected WhatsApp provider as active
            const { error: waError } = await supabase
                .from('communication_settings')
                .upsert({
                    tenant_id: tenantId,
                    provider_type: selectedWaProvider,
                    api_url: waSettings.apiUrl,
                    api_key: waSettings.apiKey,
                    instance_name: waSettings.instanceName,
                    client_token: waSettings.clientToken,
                    is_active: true
                }, { onConflict: 'tenant_id,provider_type' });

            if (waError) throw waError;

            // 3. Salvar Email
            if (emailSettings.resendKey) {
                const { error: mailError } = await supabase
                    .from('communication_settings')
                    .upsert({
                        tenant_id: tenantId,
                        provider_type: 'email_resend',
                        api_key: emailSettings.resendKey,
                        is_active: true
                    }, { onConflict: 'tenant_id,provider_type' });

                if (mailError) throw mailError;
            }

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
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest block mb-1">WhatsApp Provider</span>
                            <div className="relative">
                                <select
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest appearance-none pr-10 cursor-pointer hover:bg-black/60 transition-all"
                                    value={selectedWaProvider}
                                    onChange={(e) => handleProviderChange(e.target.value as WhatsAppProvider)}
                                >
                                    <option value="whatsapp_evolution">Evolution API</option>
                                    <option value="whatsapp_zapi">Z-API</option>
                                    <option value="whatsapp_duilio">Duílio</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={12} />
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-8 font-medium">
                        Selecione seu provedor preferencial e conecte sua infraestrutura para disparos automáticos.
                    </p>

                    <div className="space-y-6 flex-grow">
                        {/* Fields vary slightly by provider, but we map them to the same columns for simplicity */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Globe size={12} className="text-emerald-500/40" />
                                {selectedWaProvider === 'whatsapp_zapi' ? 'Endpoint Opcional' : 'Endpoint da API'}
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                placeholder={selectedWaProvider === 'whatsapp_zapi' ? 'https://api.z-api.io' : 'https://api.seuserver.com'}
                                value={waSettings.apiUrl}
                                onChange={e => setWaSettings({ ...waSettings, apiUrl: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Key size={12} className="text-emerald-500/40" />
                                {selectedWaProvider === 'whatsapp_zapi' ? 'Token (Z-API)' : 'Chave de Acesso'}
                            </label>
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                placeholder="••••••••••••••••"
                                value={waSettings.apiKey}
                                onChange={e => setWaSettings({ ...waSettings, apiKey: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Terminal size={12} className="text-emerald-500/40" />
                                {selectedWaProvider === 'whatsapp_zapi' ? 'Instância ID' : 'Nome da Instância'}
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all uppercase"
                                placeholder={selectedWaProvider === 'whatsapp_zapi' ? '3B...D0' : 'EX: MATRIZ_SP'}
                                value={waSettings.instanceName}
                                onChange={e => setWaSettings({ ...waSettings, instanceName: e.target.value })}
                            />
                        </div>

                        {selectedWaProvider === 'whatsapp_zapi' && (
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                    <Lock size={12} className="text-emerald-500/40" />
                                    Client Token (Z-API)
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                    placeholder="••••••••••••••••"
                                    value={waSettings.clientToken}
                                    onChange={e => setWaSettings({ ...waSettings, clientToken: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Botão Testar Conexão WhatsApp */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <button
                            id="btn-test-wa-connection"
                            onClick={handleTestWaConnection}
                            disabled={testingWa}
                            className="group w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed italic"
                        >
                            {testingWa ? (
                                <><Loader2 size={14} className="animate-spin" /> Testando conexão...</>
                            ) : (
                                <><Wifi size={14} /> Testar Conexão da API</>
                            )}
                        </button>
                        {testResultWa && (
                            <div className={`mt-3 flex items-start gap-3 px-5 py-3.5 rounded-2xl border text-[10px] font-bold leading-relaxed ${testResultWa.ok
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                {testResultWa.ok ? <Wifi size={14} className="shrink-0 mt-0.5" /> : <WifiOff size={14} className="shrink-0 mt-0.5" />}
                                <span>{testResultWa.msg}</span>
                            </div>
                        )}
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
                                value={emailSettings.resendKey}
                                onChange={e => setEmailSettings({ ...emailSettings, resendKey: e.target.value })}
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

                    {/* Botão Testar Conexão Email */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <button
                            id="btn-test-email-connection"
                            onClick={handleTestEmailConnection}
                            disabled={testingEmail}
                            className="group w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed italic"
                        >
                            {testingEmail ? (
                                <><Loader2 size={14} className="animate-spin" /> Testando conexão...</>
                            ) : (
                                <><Wifi size={14} /> Testar Conexão Resend</>
                            )}
                        </button>
                        {testResultEmail && (
                            <div className={`mt-3 flex items-start gap-3 px-5 py-3.5 rounded-2xl border text-[10px] font-bold leading-relaxed ${testResultEmail.ok
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                {testResultEmail.ok ? <Wifi size={14} className="shrink-0 mt-0.5" /> : <WifiOff size={14} className="shrink-0 mt-0.5" />}
                                <span>{testResultEmail.msg}</span>
                            </div>
                        )}
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
