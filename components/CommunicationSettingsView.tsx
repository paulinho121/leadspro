
import React, { useState, useEffect } from 'react';
import {
    Settings, Save, Smartphone, Mail,
    Shield, CheckCircle2, AlertCircle,
    Terminal, Globe, Key, Zap,
    Activity, Lock, Cpu, Server,
    ChevronDown, Wifi, WifiOff, Loader2, QrCode,
    Smartphone as PhoneIcon, RefreshCw, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

interface CommunicationSettingsViewProps {
    tenantId: string;
}

type WhatsAppProvider = 'whatsapp_evolution' | 'whatsapp_zapi' | 'whatsapp_duilio' | 'whatsapp_cloud_api';

const CommunicationSettingsView: React.FC<CommunicationSettingsViewProps> = ({ tenantId }) => {
    const [waLoading, setWaLoading] = useState(false);
    const [waSuccess, setWaSuccess] = useState(false);
    const [waError, setWaError] = useState<string | null>(null);

    const [mailLoading, setMailLoading] = useState(false);
    const [mailSuccess, setMailSuccess] = useState(false);
    const [mailError, setMailError] = useState<string | null>(null);

    // --- Estados para Teste de Conexão ---
    const [testingWa, setTestingWa] = useState(false);
    const [testResultWa, setTestResultWa] = useState<{ ok: boolean; msg: string } | null>(null);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testResultEmail, setTestResultEmail] = useState<{ ok: boolean; msg: string } | null>(null);

    const [selectedWaProvider, setSelectedWaProvider] = useState<WhatsAppProvider>('whatsapp_evolution');

    // --- Estados para QR Code (Evolution API) ---
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [waStatus, setWaStatus] = useState<'disconnected' | 'qr' | 'connecting' | 'connected'>('disconnected');
    const [showQrModal, setShowQrModal] = useState(false);

    const [waSettings, setWaSettings] = useState({
        apiUrl: '',
        apiKey: '',
        instanceName: '',
        clientToken: '',
    });

    const [emailSettings, setEmailSettings] = useState({
        resendKey: '',
    });

    const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

    // Limpar polling ao desmontar
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

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
            // Validação local
            if (selectedWaProvider === 'whatsapp_zapi' && (!waSettings.instanceName || !waSettings.apiKey)) {
                setTestResultWa({ ok: false, msg: 'Preencha o Instance ID e o Token antes de testar.' }); return;
            } else if (selectedWaProvider === 'whatsapp_evolution' && (!waSettings.apiUrl || !waSettings.apiKey)) {
                setTestResultWa({ ok: false, msg: 'Preencha o Endpoint e a Chave de Acesso antes de testar.' }); return;
            } else if (selectedWaProvider === 'whatsapp_cloud_api' && (!waSettings.instanceName || !waSettings.apiKey)) {
                setTestResultWa({ ok: false, msg: 'Preencha o Phone Number ID e o Access Token.' }); return;
            } else if (selectedWaProvider === 'whatsapp_duilio' && !waSettings.apiUrl) {
                setTestResultWa({ ok: false, msg: 'Preencha o Endpoint antes de testar.' }); return;
            }

            // Exceção pro WhatsApp do Duílio pois ele não está no Proxy e é via ngrok ou api solta:
            if (selectedWaProvider === 'whatsapp_duilio') {
                const res = await fetch(waSettings.apiUrl, { method: 'GET' }).catch(() => null);
                if (res && res.ok) {
                    setTestResultWa({ ok: true, msg: '✅ Endpoint acessível!' });
                } else {
                    setTestResultWa({ ok: false, msg: 'Não foi possível alcançar o endpoint. Verifique a URL.' });
                }
                return;
            }

            const { data, error } = await supabase.functions.invoke('test-integrations', {
                body: {
                    provider: selectedWaProvider,
                    authKey: waSettings.apiKey,
                    endpoint: waSettings.apiUrl,
                    instanceId: waSettings.instanceName,
                    clientToken: waSettings.clientToken
                }
            });

            if (error) {
                throw new Error(error.message || 'Falha ao acionar módulo de integração.');
            }

            setTestResultWa({ ok: data?.ok || false, msg: data?.msg || 'Nenhuma resposta inteligível retornada.' });

        } catch (err: any) {
            setTestResultWa({ ok: false, msg: `Erro de rede ou proxy: ${err?.message || err}` });
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

            const { data, error } = await supabase.functions.invoke('test-integrations', {
                body: { provider: 'email_resend', authKey: emailSettings.resendKey }
            });

            if (error) {
                throw new Error(error.message || 'Erro ao chamar função de integração.');
            }

            setTestResultEmail({
                ok: data?.ok || false,
                msg: data?.msg || 'Nenhuma resposta válida recebida.'
            });

        } catch (err: any) {
            setTestResultEmail({ ok: false, msg: `Erro arquitetural / rede: ${err?.message || err}` });
        } finally {
            setTestingEmail(false);
        }
    };

    // --- Fluxo de QR Code REAL (Evolution API) ---
    const handleGenerateQr = async () => {
        if (!waSettings.apiUrl || !waSettings.apiKey || !waSettings.instanceName) {
            setWaError('Preencha Endpoint, Chave e Instância para gerar o QR Code.');
            return;
        }

        // Limpar polling anterior se existir
        if (pollingRef.current) clearInterval(pollingRef.current);

        setShowQrModal(true);
        setWaStatus('connecting');
        setQrCode(null);

        try {
            const baseUrl = waSettings.apiUrl.replace(/\/$/, '');
            
            // 1. Solicitar QR Code
            const response = await fetch(`${baseUrl}/instance/connect/${waSettings.instanceName}`, {
                method: 'GET',
                headers: {
                    'apikey': waSettings.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.base64) {
                setQrCode(data.base64); // Evolution retorna o base64 completo
                setWaStatus('qr');
                
                // 2. Iniciar Polling para verificar conexão
                pollingRef.current = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${baseUrl}/instance/connectionState/${waSettings.instanceName}`, {
                            method: 'GET',
                            headers: { 'apikey': waSettings.apiKey }
                        });
                        const statusData = await statusRes.json();
                        
                        // Evolution status: "open", "connecting", "close"
                        if (statusData.instance?.state === 'open') {
                            setWaStatus('connected');
                            if (pollingRef.current) clearInterval(pollingRef.current);
                            toast.success('WhatsApp Conectado!', 'Seu dispositivo foi pareado com sucesso.');
                        }
                    } catch (e) {
                        console.error('Erro no polling de conexão:', e);
                    }
                }, 3000);
            } else {
                throw new Error(data.message || 'Não foi possível gerar o código. Verifique se a instância existe.');
            }

        } catch (err: any) {
            setWaStatus('disconnected');
            setShowQrModal(false);
            setWaError(`Erro Real: ${err.message || 'Verifique se o seu servidor Evolution permite CORS ou se a instância está criada.'}`);
        }
    };

    const handleSaveWhatsApp = async () => {
        setWaLoading(true);
        setWaError(null);
        setWaSuccess(false);

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
                }, { onConflict: 'tenant_id, provider_type' });

            if (waError) {
                console.error('WhatsApp Settings Error:', waError);
                throw new Error(`Erro ao salvar WhatsApp: ${waError.message}`);
            }

            setWaSuccess(true);
            toast.success('WhatsApp Salvo!', 'Configurações de WhatsApp atualizadas.');
            setTimeout(() => setWaSuccess(false), 3000);
        } catch (err: any) {
            console.error('Save WhatsApp Error:', err);
            setWaError(err.message || 'Erro ao sincronizar WhatsApp');
            toast.error('Falha no WhatsApp', err.message);
        } finally {
            setWaLoading(false);
        }
    };

    const handleSaveEmail = async () => {
        setMailLoading(true);
        setMailError(null);
        setMailSuccess(false);

        try {
            // 3. Salvar Email
            if (emailSettings.resendKey) {
                const { error: mailError } = await supabase
                    .from('communication_settings')
                    .upsert({
                        tenant_id: tenantId,
                        provider_type: 'email_resend',
                        api_key: emailSettings.resendKey,
                        is_active: true
                    }, { onConflict: 'tenant_id, provider_type' });

                if (mailError) {
                    console.error('Email Settings Error:', mailError);
                    throw new Error(`Erro ao salvar E-mail: ${mailError.message}`);
                }
            }

            setMailSuccess(true);
            toast.success('E-mail Salvo!', 'Configuração do Resend atualizada.');
            setTimeout(() => setMailSuccess(false), 3000);
        } catch (err: any) {
            console.error('Save Email Error:', err);
            setMailError(err.message || 'Erro ao sincronizar E-mail');
            toast.error('Falha no E-mail', err.message);
        } finally {
            setMailLoading(false);
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
                                    <option value="whatsapp_cloud_api">WhatsApp Cloud API (Oficial)</option>
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
                                {selectedWaProvider === 'whatsapp_zapi' ? 'Endpoint Opcional' : (selectedWaProvider === 'whatsapp_cloud_api' ? 'Versão da API (Ex: v17.0)' : 'Endpoint da API')}
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all"
                                placeholder={selectedWaProvider === 'whatsapp_zapi' ? 'https://api.z-api.io' : (selectedWaProvider === 'whatsapp_cloud_api' ? 'v17.0' : 'https://api.seuserver.com')}
                                value={waSettings.apiUrl}
                                onChange={e => setWaSettings({ ...waSettings, apiUrl: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                <Key size={12} className="text-emerald-500/40" />
                                {selectedWaProvider === 'whatsapp_zapi' ? 'Token (Z-API)' : (selectedWaProvider === 'whatsapp_cloud_api' ? 'Access Token (System User)' : 'Chave de Acesso')}
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
                                {selectedWaProvider === 'whatsapp_zapi' ? 'Instância ID' : (selectedWaProvider === 'whatsapp_cloud_api' ? 'Phone Number ID' : 'Nome da Instância')}
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 text-xs font-mono placeholder:text-slate-800 transition-all uppercase"
                                placeholder={selectedWaProvider === 'whatsapp_zapi' ? '3B...D0' : (selectedWaProvider === 'whatsapp_cloud_api' ? 'Ex: 10650...' : 'EX: MATRIZ_SP')}
                                value={waSettings.instanceName}
                                onChange={e => setWaSettings({ ...waSettings, instanceName: e.target.value })}
                            />
                        </div>

                        {(selectedWaProvider === 'whatsapp_zapi' || selectedWaProvider === 'whatsapp_cloud_api') && (
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">
                                    <Lock size={12} className="text-emerald-500/40" />
                                    {selectedWaProvider === 'whatsapp_cloud_api' ? 'WhatsApp Business Account ID' : 'Client Token (Z-API)'}
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
                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                        {selectedWaProvider === 'whatsapp_evolution' && (
                            <button
                                onClick={handleGenerateQr}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all bg-primary text-slate-900 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 italic"
                            >
                                <QrCode size={16} /> Conectar via QR Code
                            </button>
                        )}

                        <button
                            id="btn-test-wa-connection"
                            onClick={handleTestWaConnection}
                            disabled={testingWa}
                            className="group w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed italic"
                        >
                            {testingWa ? (
                                <><Loader2 size={14} className="animate-spin" /> Testando conexão...</>
                            ) : (
                                <><Wifi size={14} /> Testar Saúde da API</>
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

                        <button
                            onClick={handleSaveWhatsApp}
                            disabled={waLoading}
                            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all italic ${
                                waLoading ? 'bg-slate-800 text-slate-600' : 
                                waSuccess ? 'bg-emerald-500 text-slate-900 shadow-emerald-500/20' : 
                                'bg-primary text-slate-900 shadow-primary/20 hover:scale-[1.02] active:scale-95'
                            } shadow-xl`}
                        >
                            {waLoading ? <Activity size={16} className="animate-spin" /> : waSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                            {waLoading ? 'Sincronizando...' : waSuccess ? 'WhatsApp Sincronizado' : 'Salvar Configuração WhatsApp'}
                        </button>

                        {waError && (
                            <div className="flex items-center gap-2 text-red-400 text-[9px] font-bold uppercase tracking-widest bg-red-400/5 p-3 rounded-xl border border-red-400/20">
                                <AlertCircle size={12} /> {waError}
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
                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
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

                        <button
                            onClick={handleSaveEmail}
                            disabled={mailLoading}
                            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all italic ${
                                mailLoading ? 'bg-slate-800 text-slate-600' : 
                                mailSuccess ? 'bg-emerald-500 text-slate-900 shadow-emerald-500/20' : 
                                'bg-blue-500 text-white shadow-blue-500/20 hover:scale-[1.02] active:scale-95'
                            } shadow-xl`}
                        >
                            {mailLoading ? <Activity size={16} className="animate-spin" /> : mailSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                            {mailLoading ? 'Sincronizando...' : mailSuccess ? 'E-mail Sincronizado' : 'Salvar Configuração E-mail'}
                        </button>

                        {mailError && (
                            <div className="flex items-center gap-2 text-red-400 text-[9px] font-bold uppercase tracking-widest bg-red-400/5 p-3 rounded-xl border border-red-400/20">
                                <AlertCircle size={12} /> {mailError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Removed Global Save Action */}
            {/* QR Code Modal Integration */}
            {showQrModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowQrModal(false)}></div>
                    <div className="glass-strong border border-white/10 rounded-[3rem] p-10 max-w-md w-full relative z-[210] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                        
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-pulse"></div>

                        <div className="flex flex-col items-center text-center space-y-8">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center border border-primary/20 mb-4 shadow-xl">
                                    <QrCode className="text-primary" size={32} />
                                </div>
                                <h4 className="text-2xl font-black text-white tracking-tighter uppercase italic">Pareamento de Host</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Escaneie para autorizar a centrifugação</p>
                            </div>

                            <div className="relative group">
                                <div className={`p-4 bg-white rounded-[2rem] transition-all duration-700 ${waStatus === 'connected' ? 'blur-md opacity-20' : ''}`}>
                                    {qrCode ? (
                                        <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl" />
                                    ) : (
                                        <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-100 rounded-xl">
                                            <Loader2 size={40} className="text-primary animate-spin mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 text-center leading-relaxed">Gerando Token de Acesso Seguro...</p>
                                        </div>
                                    )}
                                </div>

                                {waStatus === 'connected' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in-50 duration-500">
                                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                                            <CheckCircle2 className="text-slate-900" size={40} strokeWidth={3} />
                                        </div>
                                        <p className="mt-6 text-emerald-400 font-black text-sm uppercase tracking-[0.2em] italic">Dispositivo Conectado</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full space-y-4 pt-4">
                                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className={`w-3 h-3 rounded-full ${waStatus === 'connected' ? 'bg-emerald-500' : 'bg-primary animate-pulse'}`}></div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Status: {waStatus === 'connected' ? 'Sincronizado' : (waStatus === 'qr' ? 'Aguardando Leitura...' : 'Iniciando Handshake...')}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowQrModal(false)}
                                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] border border-white/5 transition-all active:scale-95 italic"
                                >
                                    {waStatus === 'connected' ? 'Fechar e Continuar' : 'Cancelar Pareamento'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunicationSettingsView;
