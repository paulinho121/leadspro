import React, { useState, useEffect } from 'react';
import { Save, Globe, Palette, Layout, Link2, ShieldCheck, Mail, Database, Loader2, Cpu, Eye, EyeOff, X } from 'lucide-react';
import { useBranding } from './BrandingProvider';
import { supabase } from '../lib/supabase';
import { DEFAULT_BRANDING } from '../types/branding';
import { SecretService } from '../services/secretService';
import { toast } from './Toast';

const WhiteLabelAdmin: React.FC<{ initialTab?: 'branding' | 'domain' | 'users' | 'api' }> = ({ initialTab = 'branding' }) => {
    const { config, refreshBranding } = useBranding();
    const [activeSettingsTab, setSettingsTab] = useState<'branding' | 'domain' | 'users' | 'api' | 'integrations'>(initialTab);
    const [formData, setFormData] = useState<any>({
        platformName: '',
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '',
        secondaryColor: '',
        backgroundColor: '',
        sidebarColor: '',
        customDomain: '',
        subdomain: '',
        apiKeys: { gemini: '', openai: '', serper: '', rdStation: '', hubspot: '', pipedrive: '', salesforce: '' }
    });
    const [saving, setSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<'logo' | 'favicon' | null>(null);
    const [verifyingDomain, setVerifyingDomain] = useState(false);
    const [domainVerificationStatus, setDomainVerificationStatus] = useState<'success' | 'error' | null>(null);

    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [newWebhook, setNewWebhook] = useState({ name: '', url: '', event_type: 'lead.enriched' });
    const [isTestingWebhook, setIsTestingWebhook] = useState<string | null>(null);

    const fetchUsers = async () => {
        if (!config?.tenantId) return;

        // Se for o tenant default (dev), usamos o ID fixo
        const tenantId = config.tenantId === 'default'
            ? '00000000-0000-0000-0000-000000000000'
            : config.tenantId;

        const { data, error } = await supabase
            .from('tenant_users')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (data) setUsers(data);
    };

    const handleInviteUser = async (email: string, name: string) => {
        if (!email || !config) return;

        const tenantId = config.tenantId === 'default'
            ? '00000000-0000-0000-0000-000000000000'
            : config.tenantId;

        const { error } = await supabase.from('tenant_users').insert({
            tenant_id: tenantId,
            email,
            name: email.split('@')[0], // Nome provisório basedo no email
            role: 'vendedor',
            status: 'active'
        });

        if (error) {
            toast.error('Erro ao convidar', error.message);
        } else {
            fetchUsers();
            toast.success('Convite enviado!', `Usuário ${email} adicionado com sucesso.`);
        }
    };

    const handleRevokeUser = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;

        const { error } = await supabase.from('tenant_users').delete().eq('id', id);

        if (error) {
            toast.error('Erro ao remover', error.message);
        } else {
            fetchUsers();
        }
    };

    const fetchWebhooks = async () => {
        if (!config?.tenantId) return;
        const tenantId = config.tenantId === 'default' ? '00000000-0000-0000-0000-000000000000' : config.tenantId;

        const { data, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (data) setWebhooks(data);
    };

    const handleAddWebhook = async () => {
        if (!newWebhook.name || !newWebhook.url || !config) return;
        const tenantId = config.tenantId === 'default' ? '00000000-0000-0000-0000-000000000000' : config.tenantId;

        const { error } = await supabase.from('webhooks').insert({
            tenant_id: tenantId,
            ...newWebhook,
            secret_token: Math.random().toString(36).substring(2, 15)
        });

        if (error) {
            toast.error('Erro no webhook', error.message);
        } else {
            setNewWebhook({ name: '', url: '', event_type: 'lead.enriched' });
            fetchWebhooks();
            toast.success('Webhook configurado!', 'Integração ativa com sucesso.');
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!window.confirm('Excluir este Webhook?')) return;
        const { error } = await supabase.from('webhooks').delete().eq('id', id);
        if (error) toast.error('Erro ao remover', error.message);
        else fetchWebhooks();
    };

    const handleTestWebhook = async (webhook: any) => {
        setIsTestingWebhook(webhook.id);
        try {
            // Simulando um disparo de teste
            const testPayload = {
                event: 'test.webhook',
                timestamp: new Date().toISOString(),
                data: {
                    lead_name: 'Lead de Teste LeadPro',
                    email: 'parceiro@leadpro.com',
                    status: 'enriched'
                }
            };

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': webhook.secret_token || ''
                },
                body: JSON.stringify(testPayload)
            });

            if (response.ok) {
                toast.success('Webhook testado!', 'Sinal recebido com sucesso (200 OK).');
            } else {
                toast.error('Falha no teste', `Servidor retornou status ${response.status}`);
            }
        } catch (err: any) {
            toast.error('Erro de conexão', 'Verifique se a URL permite CORS ou se o endpoint está ativo.');
        } finally {
            setIsTestingWebhook(null);
        }
    };

    useEffect(() => {
        if (activeSettingsTab === 'users') {
            fetchUsers();
        } else if (activeSettingsTab === 'integrations') {
            fetchWebhooks();
        }
    }, [activeSettingsTab, config]);

    const handleVerifyDomain = async () => {
        if (!formData.customDomain) return;
        setVerifyingDomain(true);
        setDomainVerificationStatus(null);

        // Simulação de check DNS
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Para demo, vamos aceitar qualquer domínio que tenha ponto
        if (formData.customDomain.includes('.')) {
            setDomainVerificationStatus('success');
        } else {
            setDomainVerificationStatus('error');
        }
        setVerifyingDomain(false);
    };

    const handleFileUpload = async (type: 'logo' | 'favicon', file: File) => {
        if (!config?.tenantId) return;
        setIsUploading(type);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}-${config.tenantId}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from('branding')
                .upload(filePath, file);

            if (error) throw error;

            if (data) {
                const { data: { publicUrl } } = supabase.storage
                    .from('branding')
                    .getPublicUrl(filePath);

                if (type === 'logo') {
                    setFormData({ ...formData, logoUrl: publicUrl });
                } else {
                    setFormData({ ...formData, faviconUrl: publicUrl });
                }
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Erro no upload', error.message);
        } finally {
            setIsUploading(null);
        }
    };

    useEffect(() => {
        if (config && config.tenantId !== 'default') {
            const loadData = async () => {
                const brandingData = {
                    platformName: config.platformName || '',
                    logoUrl: config.logoUrl || '',
                    faviconUrl: config.faviconUrl || '',
                    primaryColor: config.colors?.primary || '#06b6d4',
                    secondaryColor: config.colors?.secondary || '#3b82f6',
                    backgroundColor: config.colors?.background || '#0f172a',
                    sidebarColor: config.colors?.sidebar || 'rgba(30, 41, 59, 0.7)',
                    customDomain: config.domain || '',
                    subdomain: config.subdomain || '',
                    apiKeys: { gemini: '', openai: '', serper: '', rdStation: '', hubspot: '', pipedrive: '', salesforce: '' }
                };

                // Carregar Segredos separadamente (Segurança Sênior)
                const secrets = await SecretService.getTenantSecrets(config.tenantId);

                // Extrair CRM configs antigas se houver
                const wlc = await supabase.from('white_label_configs').select('api_keys').eq('tenant_id', config.tenantId).maybeSingle();
                const jsonApiKeys = wlc.data?.api_keys || {};

                if (secrets) {
                    brandingData.apiKeys = {
                        gemini: secrets.gemini || '',
                        openai: secrets.openai || '',
                        serper: secrets.serper || '',
                        rdStation: jsonApiKeys.rd_station_token || secrets.rdStation || '',
                        hubspot: jsonApiKeys.hubspot_token || secrets.hubspot || '',
                        pipedrive: jsonApiKeys.pipedrive_token || secrets.pipedrive || '',
                        salesforce: jsonApiKeys.salesforce_token || secrets.salesforce || ''
                    };
                }

                setFormData(brandingData);
            };

            loadData();
        }
    }, [config]);

    // Live Preview: Atualiza as cores em tempo real enquanto o usuário edita
    useEffect(() => {
        const root = document.documentElement;

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
        };

        if (formData.primaryColor) {
            root.style.setProperty('--color-primary', formData.primaryColor);
            root.style.setProperty('--color-primary-rgb', hexToRgb(formData.primaryColor));
        }
        if (formData.secondaryColor) {
            root.style.setProperty('--color-secondary', formData.secondaryColor);
            root.style.setProperty('--color-secondary-rgb', hexToRgb(formData.secondaryColor));
        }
        if (formData.backgroundColor) {
            root.style.setProperty('--color-background', formData.backgroundColor);
        }
        if (formData.sidebarColor) {
            root.style.setProperty('--color-sidebar', formData.sidebarColor);
        }
    }, [formData.primaryColor, formData.secondaryColor, formData.backgroundColor, formData.sidebarColor]);

    const handleResetColors = () => {
        if (!window.confirm('Deseja realmente restaurar as cores originais do sistema?')) return;

        setFormData({
            ...formData,
            primaryColor: DEFAULT_BRANDING.colors.primary,
            secondaryColor: DEFAULT_BRANDING.colors.secondary,
            backgroundColor: DEFAULT_BRANDING.colors.background,
            sidebarColor: DEFAULT_BRANDING.colors.sidebar
        });

        // O useEffect do Live Preview cuidará de atualizar as variáveis CSS automaticamente
        console.log('[WhiteLabelAdmin] Cores restauradas para o padrão.');
    };

    const handleSave = async () => {
        console.log('[WhiteLabelAdmin] Iniciando salvamento...');
        setSaving(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                toast.error('Sessão expirada', 'Faça login novamente.');
                return;
            }

            // Identificar o tenant ID correto
            let activeTenantId = config.tenantId;

            // 1. Prioridade: Buscar o tenant_id do perfil atual (Fonte da Verdade)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('tenant_id, is_master_admin')
                .eq('id', session.user.id)
                .maybeSingle();

            const isMaster = !!profile?.is_master_admin;

            if (profile?.tenant_id) {
                activeTenantId = profile.tenant_id;
                console.log('[WhiteLabelAdmin] ID Identificado:', activeTenantId, 'Master:', isMaster);
            }

            // 2. Normalizar o ID
            if (activeTenantId === 'default') {
                activeTenantId = isMaster ? '00000000-0000-0000-0000-000000000000' : null;
            }

            // 3. Validação de segurança
            if (!activeTenantId || (activeTenantId === '00000000-0000-0000-0000-000000000000' && !isMaster)) {
                console.error('[WhiteLabelAdmin] Bloqueio de segurança acionado.');
                throw new Error('Sua conta não possui uma empresa vinculada. Por favor, saia e entre novamente.');
            }

            console.log('[WhiteLabelAdmin] Executando UPSERT para:', activeTenantId);

            // 4. Salvar Branding (Público)
            const { error: brandingError } = await supabase
                .from('white_label_configs')
                .upsert({
                    tenant_id: activeTenantId,
                    platform_name: formData.platformName,
                    logo_url: formData.logoUrl,
                    favicon_url: formData.faviconUrl,
                    primary_color: formData.primaryColor,
                    secondary_color: formData.secondaryColor,
                    background_color: formData.backgroundColor,
                    sidebar_color: formData.sidebarColor,
                    custom_domain: formData.customDomain || null,
                    subdomain: formData.subdomain || null,
                    api_keys: {
                        gemini: null, openai: null, deepseek: null, // As chaves core ficam no tenant_api_keys
                        rd_station_token: formData.apiKeys?.rdStation?.trim() || null,
                        hubspot_token: formData.apiKeys?.hubspot?.trim() || null,
                        pipedrive_token: formData.apiKeys?.pipedrive?.trim() || null,
                        salesforce_token: formData.apiKeys?.salesforce?.trim() || null
                    },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id' });

            if (brandingError) throw brandingError;

            // 5. Salvar Segredos (Privado - Tabela Isolada)
            const { error: keysError } = await supabase
                .from('tenant_api_keys')
                .upsert({
                    tenant_id: activeTenantId,
                    gemini_key: formData.apiKeys?.gemini?.trim() || null,
                    serper_key: formData.apiKeys?.serper?.trim() || null,
                    openai_key: formData.apiKeys?.openai?.trim() || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id' });

            if (keysError) {
                console.error('[WhiteLabelAdmin] Erro ao salvar chaves:', keysError);
                throw new Error('As cores foram salvas, mas houve um erro ao proteger suas chaves de API.');
            }

            SecretService.clearCache(); // Forçar recarregamento

            await refreshBranding();
            toast.success('Configurações salvas!', 'Plataforma atualizada com sucesso.');
        } catch (err: any) {
            console.error('[WhiteLabelAdmin] Erro crítico:', err);
            toast.error('Falha ao salvar', err.message || 'Erro desconhecido');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation - Horizontal on Mobile, Sidebar on Desktop */}
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 gap-2 no-scrollbar lg:w-64 shrink-0 px-2 lg:px-0">
                    <SettingsTab
                        icon={<Palette size={18} />}
                        label="Visual Identity"
                        active={activeSettingsTab === 'branding'}
                        onClick={() => setSettingsTab('branding')}
                    />
                    <SettingsTab
                        icon={<Globe size={18} />}
                        label="Domains & SSL"
                        active={activeSettingsTab === 'domain'}
                        onClick={() => setSettingsTab('domain')}
                    />
                    <SettingsTab
                        icon={<ShieldCheck size={18} />}
                        label="Gestão de Usuários"
                        active={activeSettingsTab === 'users'}
                        onClick={() => setSettingsTab('users')}
                    />
                    <SettingsTab
                        icon={<Database size={18} />}
                        label="Conexões API"
                        active={activeSettingsTab === 'api'}
                        onClick={() => setSettingsTab('api')}
                    />
                    <SettingsTab
                        icon={<Link2 size={18} />}
                        label="Integrações (CRM)"
                        active={activeSettingsTab === 'integrations'}
                        onClick={() => setSettingsTab('integrations')}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 glass p-6 md:p-8 rounded-3xl space-y-8 min-w-0">
                    <div className="flex items-center justify-between mb-4 md:mb-0">
                        <h2 className="text-xl md:text-2xl font-bold text-white">Configurar Platform</h2>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary hover:opacity-90 text-slate-900 px-4 md:px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 text-xs md:text-base active-scale"
                        >
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            <span className="hidden md:inline">Salvar Alterações</span>
                            <span className="md:hidden">Salvar</span>
                        </button>
                    </div>
                    {activeSettingsTab === 'branding' && (
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Layout className="text-primary" /> Branding Basics
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-400">Nome da Plataforma</label>
                                        <input
                                            type="text"
                                            value={formData.platformName}
                                            onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                                            placeholder="Ex: Minha Agencia Pro"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-400">URL do Logo</label>
                                        <input
                                            type="text"
                                            value={formData.logoUrl}
                                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                            placeholder="https://sua-url.com/logo.png"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Palette className="text-primary" /> Cores & Estilização
                                    </h3>
                                    <button
                                        onClick={handleResetColors}
                                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                    >
                                        Restaurar Padrão
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <ColorPicker
                                        label="Cor Primária"
                                        value={formData.primaryColor}
                                        onChange={(val) => setFormData({ ...formData, primaryColor: val })}
                                    />
                                    <ColorPicker
                                        label="Cor Secundária"
                                        value={formData.secondaryColor}
                                        onChange={(val) => setFormData({ ...formData, secondaryColor: val })}
                                    />
                                    <ColorPicker
                                        label="Cor de Fundo (App)"
                                        value={formData.backgroundColor}
                                        onChange={(val) => setFormData({ ...formData, backgroundColor: val })}
                                    />
                                    <ColorPicker
                                        label="Barra Lateral"
                                        value={formData.sidebarColor}
                                        onChange={(val) => setFormData({ ...formData, sidebarColor: val })}
                                    />
                                </div>
                            </section>

                            <section className="pt-6 border-t border-white/5">
                                <h3 className="text-xl font-bold text-white mb-6">Logo & Assets</h3>
                                <div className="flex items-center gap-8">
                                    <input
                                        type="file"
                                        id="logo-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleFileUpload('logo', e.target.files[0]);
                                        }}
                                    />
                                    <div
                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                        className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <>
                                                {isUploading === 'logo' ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                                <span className="text-[10px] mt-2 font-bold uppercase">{isUploading === 'logo' ? '...' : 'Upload Logo'}</span>
                                            </>
                                        )}
                                    </div>

                                    <input
                                        type="file"
                                        id="favicon-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleFileUpload('favicon', e.target.files[0]);
                                        }}
                                    />
                                    <div
                                        onClick={() => document.getElementById('favicon-upload')?.click()}
                                        className="w-16 h-16 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        {formData.faviconUrl ? (
                                            <img src={formData.faviconUrl} alt="Favicon" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase">{isUploading === 'favicon' ? <Loader2 className="animate-spin" /> : 'Favicon'}</span>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSettingsTab === 'domain' && (
                        <div className="space-y-6">
                            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex gap-4">
                                <Globe className="text-primary shrink-0" />
                                <p className="text-sm text-slate-300">
                                    To use a custom domain, point a <strong>CNAME</strong> record to <code>lb.leadflowpro.com</code> in your DNS provider.
                                    Provisioning may take up to 24 hours.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-semibold text-slate-400">Custom Domain (CNAME)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="leads.yourdomain.com"
                                        value={formData.customDomain}
                                        onChange={(e) => {
                                            setFormData({ ...formData, customDomain: e.target.value });
                                            setDomainVerificationStatus(null); // Reset status on change
                                        }}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleVerifyDomain}
                                        disabled={verifyingDomain || !formData.customDomain}
                                        className="glass px-6 rounded-xl font-bold text-white hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50">
                                        {verifyingDomain ? <Loader2 className="animate-spin" size={18} /> : <Link2 size={18} />}
                                        {verifyingDomain ? 'Checking DNS...' : 'Verify Domain'}
                                    </button>
                                </div>
                                {domainVerificationStatus === 'error' && (
                                    <p className="text-red-400 text-xs font-bold animate-fade-in">❌ Could not verify CNAME record. Please check your DNS settings.</p>
                                )}
                                {domainVerificationStatus === 'success' && (
                                    <p className="text-green-400 text-xs font-bold animate-fade-in">✅ Domain verified successfully! Click Save to apply.</p>
                                )}
                            </div>

                            <div className="pt-6">
                                <h4 className="font-bold text-white mb-4">Domain Status</h4>
                                <div className="bg-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Domain</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">SSL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-white">
                                            {formData.customDomain && (config?.domain === formData.customDomain || domainVerificationStatus === 'success') ? (
                                                <tr className="border-t border-white/5">
                                                    <td className="px-6 py-4 font-mono">{formData.customDomain}</td>
                                                    <td className="px-6 py-4 text-green-500 flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                        {domainVerificationStatus === 'success' ? 'Verified' : 'Active'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 italic">
                                                        {domainVerificationStatus === 'success' ? 'Provisioning...' : 'Secure (Let\'s Encrypt)'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr className="border-t border-white/5">
                                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">
                                                        No active custom domain configured.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSettingsTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Usuários da Revenda</h3>
                                <div className="flex gap-2">
                                    <input
                                        id="inviteEmail"
                                        placeholder="email@exemplo.com"
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                const input = e.currentTarget;
                                                await handleInviteUser(input.value, 'Membro');
                                                input.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('inviteEmail') as HTMLInputElement;
                                            handleInviteUser(input.value, 'Membro');
                                            input.value = '';
                                        }}
                                        className="bg-primary hover:opacity-90 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                                        <Mail size={16} />
                                        Convidar
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {users.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                                        <p className="text-slate-500">Nenhum membro na equipe ainda.</p>
                                    </div>
                                ) : (
                                    users.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-slate-900 text-xs shadow-lg">
                                                    {user.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{user.name}</p>
                                                    <p className="text-xs text-slate-400">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {user.role}
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeUser(user.id)}
                                                    className="text-red-400/50 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10 px-2 py-1 rounded">
                                                    Remover
                                                </button>
                                            </div>
                                        </div>
                                    )))}
                            </div>
                        </div>
                    )}

                    {activeSettingsTab === 'api' && (
                        <div className="space-y-8 animate-in slide-in-from-right duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Configurações de API Própria</h3>
                                <p className="text-sm text-slate-400">Insira suas chaves de API para processar leads usando seus próprios créditos.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <ApiConfigItem
                                    label="Serper.dev API (Search Engine)"
                                    placeholder="8c2a..."
                                    value={formData.apiKeys?.serper || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, serper: val } })}
                                    description="Obrigatória para extração real de geolocalização e busca visual (places, telefones, reviews)."
                                />
                                <ApiConfigItem
                                    label="Google Gemini API"
                                    placeholder="AIzaSy..."
                                    value={formData.apiKeys?.gemini || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, gemini: val } })}
                                    description="Usado para análise neural, score de leads e extração inteligente."
                                />
                                <ApiConfigItem
                                    label="OpenAI API (GPT-4)"
                                    placeholder="sk-..."
                                    value={formData.apiKeys?.openai || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, openai: val } })}
                                    description="Alternativa para enriquecimento de dados e cópia de vendas."
                                />
                            </div>

                            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="p-2 bg-blue-500/20 rounded-lg shrink-0 h-fit">
                                    <ShieldCheck className="text-blue-400" size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-blue-300 uppercase tracking-widest">Aviso de Segurança e Privacidade</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Suas chaves de API são <strong>criptografadas de ponta a ponta</strong> e nunca são compartilhadas com terceiros.
                                        O uso de APIs próprias garante que os dados processados permaneçam em sua conta e <strong>não sejam utilizados para treinamento de modelos públicos</strong>.
                                        Em total conformidade com a LGPD brasiliera.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSettingsTab === 'integrations' && (
                        <div className="space-y-8 animate-in slide-in-from-right duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2 underline decoration-primary decoration-4">Integrações Nativas (CRM)</h3>
                                <p className="text-sm text-slate-400">Integre diretamente com seu CRM via API Push.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <ApiConfigItem
                                    label="Token do RD Station CRM"
                                    placeholder="Coloque seu token da API do RD Station..."
                                    value={formData.apiKeys?.rdStation || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, rdStation: val } })}
                                    description="Requerido para Sincronização. Ache isso nas configurações do RD Station."
                                />
                                <ApiConfigItem
                                    label="HubSpot Private App Token"
                                    placeholder="pat-na1-..."
                                    value={formData.apiKeys?.hubspot || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, hubspot: val } })}
                                    description="Requer um Private App Token do HubSpot com permissões crm.objects.contacts.write."
                                />
                                <ApiConfigItem
                                    label="Pipedrive API Token"
                                    placeholder="Token do Pipedrive (30+ chars)..."
                                    value={formData.apiKeys?.pipedrive || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, pipedrive: val } })}
                                    description="Encontrado nas Preferências Pessoais > API do Pipedrive."
                                />
                                <ApiConfigItem
                                    label="Salesforce Access Token"
                                    placeholder="Bearer token de acesso do Salesforce..."
                                    value={formData.apiKeys?.salesforce || ''}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, salesforce: val } })}
                                    description="Token provisório ou de integração de longa duração."
                                />
                            </div>

                            <div className="pt-8">
                                <h3 className="text-xl font-bold text-white mb-2 underline decoration-primary decoration-4">Power Integrations (Webhooks)</h3>
                                <p className="text-sm text-slate-400">Conecte o LeadPro ao seu ERP ou ferramentas como Zapier e Make.</p>
                            </div>

                            <div className="glass p-6 rounded-2xl border-primary/20 bg-primary/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-500">Nome da Conexão</label>
                                        <input
                                            placeholder="Ex: Pipedrive Leads"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary"
                                            value={newWebhook.name}
                                            onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-500">URL de Destino (Endpoint)</label>
                                        <input
                                            placeholder="https://hooks.zapier.com/..."
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary"
                                            value={newWebhook.url}
                                            onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddWebhook}
                                    className="w-full py-3 bg-primary text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all"
                                >
                                    Ativar Nova Integração
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Suas Conexões Ativas</h4>
                                {webhooks.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl opacity-50">
                                        <p className="text-sm">Nenhuma integração configurada no momento.</p>
                                    </div>
                                ) : (
                                    webhooks.map(wh => (
                                        <div key={wh.id} className="p-5 glass border-white/5 rounded-2xl flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                    <Link2 className="text-primary" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white mb-1">{wh.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-black uppercase">{wh.event_type}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{wh.url}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleTestWebhook(wh)}
                                                    disabled={isTestingWebhook === wh.id}
                                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    {isTestingWebhook === wh.id ? 'Testando...' : 'Testar Agora'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteWebhook(wh.id)}
                                                    className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-primary" size={18} />
                                    Documentação para TI
                                </h4>
                                <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
                                    <p>O LeadPro dispara um <strong>POST JSON</strong> sempre que um lead atinge o status "Enriquecido".</p>
                                    <div className="bg-black/40 p-4 rounded-xl font-mono text-blue-400">
                                        {'{\n  "event": "lead.enriched",\n  "tenant_id": "...",\n  "data": {\n    "name": "Nome da Empresa",\n    "email": "...",\n    "phone": "...",\n    "insights": "..."\n  }\n}'}
                                    </div>
                                    <p>Para segurança, enviamos o header <code>X-Webhook-Secret</code> com o token gerado na ativação.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SettingsTabProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 flex items-center gap-3 px-6 lg:px-4 py-3 rounded-xl transition-all whitespace-nowrap active-scale ${active ? 'bg-primary text-slate-900 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
    >
        {icon}
        <span className="text-sm">{label}</span>
    </button>
);

const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void
}> = ({ label, value, onChange }) => (
    <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-400">{label}</label>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 bg-transparent border-none cursor-pointer"
            />
            <input
                type="text"
                value={(value || '').toUpperCase()}
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent border-none text-white text-sm font-mono outline-none w-24"
            />
        </div>
    </div>
);

const ApiConfigItem: React.FC<{
    label: string;
    placeholder: string;
    description: string;
    value: string;
    onChange: (val: string) => void
}> = ({ label, placeholder, description, value, onChange }) => {
    const [showKey, setShowKey] = useState(false);

    const maskKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 10) return '********';
        return `${key.slice(0, 6)}****************${key.slice(-4)}`;
    };

    return (
        <div className="space-y-4 p-6 glass border-white/5 rounded-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Cpu size={16} className="text-primary" />
                    </div>
                    <h4 className="font-bold text-white tracking-tight">{label}</h4>
                </div>
                <div className={`px-2 py-1 ${value ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} text-[10px] font-black rounded uppercase tracking-widest border border-current/10 animate-pulse`}>
                    {value ? 'Configurado' : 'Pendente'}
                </div>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>

            <div className="relative group/input">
                <input
                    type={showKey ? "text" : "password"}
                    value={showKey ? maskKey(value) : value}
                    onChange={(e) => {
                        if (!showKey) onChange(e.target.value);
                    }}
                    readOnly={showKey}
                    placeholder={placeholder}
                    autoComplete="new-password"
                    className={`w-full bg-slate-900/50 border ${showKey ? 'border-primary/30 text-primary' : 'border-white/10 text-white'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all pr-24 font-mono text-sm`}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {showKey && value && (
                        <button
                            onClick={() => {
                                onChange('');
                                setShowKey(false);
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-2 py-1 rounded transition-all uppercase tracking-tighter"
                            title="Limpar e Editar"
                        >
                            Trocar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${showKey ? 'bg-primary text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {showKey ? 'Ocultar' : 'Ver'}
                    </button>
                </div>

                {showKey && (
                    <div className="absolute -bottom-5 left-0 text-[8px] font-black text-primary/50 uppercase tracking-[0.3em] animate-pulse">
                        Modo de Visualização Censurado
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhiteLabelAdmin;
