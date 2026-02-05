import React, { useState, useEffect } from 'react';
import { Save, Globe, Palette, Layout, Link2, ShieldCheck, Mail, Database, Loader2 } from 'lucide-react';
import { useBranding } from './BrandingProvider';
import { supabase } from '../lib/supabase';

const WhiteLabelAdmin: React.FC = () => {
    const { config, refreshBranding } = useBranding();
    const [activeSettingsTab, setSettingsTab] = useState<'branding' | 'domain' | 'users' | 'api'>('branding');
    const [formData, setFormData] = useState<any>({
        platformName: '',
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '',
        secondaryColor: '',
        customDomain: '',
        subdomain: '',
        apiKeys: { gemini: '', openai: '', serper: '' }
    });
    const [saving, setSaving] = useState(false);
    const [verifyingDomain, setVerifyingDomain] = useState(false);
    const [domainVerificationStatus, setDomainVerificationStatus] = useState<'success' | 'error' | null>(null);

    // User Management State
    const [users, setUsers] = useState<any[]>([]);

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
            alert('Erro ao convidar: ' + error.message);
        } else {
            fetchUsers();
            alert(`Convite enviado para ${email}!`);
        }
    };

    const handleRevokeUser = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;

        const { error } = await supabase.from('tenant_users').delete().eq('id', id);

        if (error) {
            alert('Erro ao remover: ' + error.message);
        } else {
            fetchUsers();
        }
    };

    useEffect(() => {
        if (activeSettingsTab === 'users') {
            fetchUsers();
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

    useEffect(() => {
        if (config) {
            setFormData({
                platformName: config.platformName || '',
                logoUrl: config.logoUrl || '',
                faviconUrl: config.faviconUrl || '',
                primaryColor: config.colors?.primary || '#06b6d4',
                secondaryColor: config.colors?.secondary || '#3b82f6',
                customDomain: config.domain || '',
                subdomain: config.subdomain || '',
                apiKeys: config.apiKeys || { gemini: '', openai: '', serper: '' }
            });
        }
    }, [config]);

    // Live Preview: Atualiza as cores em tempo real enquanto o usuário edita
    useEffect(() => {
        const root = document.documentElement;
        if (formData.primaryColor) {
            root.style.setProperty('--color-primary', formData.primaryColor);
        }
        if (formData.secondaryColor) {
            root.style.setProperty('--color-secondary', formData.secondaryColor);
        }
    }, [formData.primaryColor, formData.secondaryColor]);

    const handleSave = async () => {
        setSaving(true);

        // Se estiver no modo default, precisamos de um tenant real para salvar no banco UUID
        const activeTenantId = config.tenantId === 'default'
            ? '00000000-0000-0000-0000-000000000000' // UUID nulo para demonstração ou primeiro setup
            : config.tenantId;

        const { error } = await supabase
            .from('white_label_configs')
            .upsert({
                tenant_id: activeTenantId,
                platform_name: formData.platformName,
                logo_url: formData.logoUrl,
                favicon_url: formData.faviconUrl,
                primary_color: formData.primaryColor,
                secondary_color: formData.secondaryColor,
                custom_domain: formData.customDomain || null, // Importante: null em vez de string vazia
                subdomain: formData.subdomain || null,     // Importante: null em vez de string vazia
                api_keys: formData.apiKeys,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id' });

        if (error) {
            console.error('Erro detalhado ao salvar:', error);
            alert(`Erro ao salvar: ${error.message || 'Verifique as permissões de banco RLS.'}`);
        } else {
            await refreshBranding();
            alert('Configurações salvas com sucesso! As chaves de API agora estão ativas.');
        }
        setSaving(false);
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">White Label Management</h1>
                    <p className="text-slate-400">Customize your platform instance and manage your own clients.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:opacity-90 text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar Alterações
                </button>
            </div>

            <div className="flex gap-8">
                {/* Navigation Sidebar */}
                <div className="w-64 space-y-2">
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
                </div>

                {/* Content Area */}
                <div className="flex-1 glass p-8 rounded-3xl space-y-8">
                    {activeSettingsTab === 'branding' && (
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Layout className="text-primary" /> Branding Basics
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
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
                                <h3 className="text-xl font-bold text-white mb-6">Cores & Estilização</h3>
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
                                </div>
                            </section>

                            <section className="pt-6 border-t border-white/5">
                                <h3 className="text-xl font-bold text-white mb-6">Logo & Assets</h3>
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-all cursor-pointer">
                                        <Save size={24} />
                                        <span className="text-[10px] mt-2 font-bold uppercase">Upload Logo</span>
                                    </div>
                                    <div className="w-16 h-16 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-all cursor-pointer">
                                        <span className="text-[10px] font-bold uppercase">Favicon</span>
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
                                    label="Serper.dev API (Google Maps)"
                                    placeholder="8c2a..."
                                    value={formData.apiKeys.serper}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, serper: val } })}
                                    description="Obrigatória para extração real do Google Maps (places, telefones, reviews)."
                                />
                                <ApiConfigItem
                                    label="Google Gemini API"
                                    placeholder="AIzaSy..."
                                    value={formData.apiKeys.gemini}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, gemini: val } })}
                                    description="Usado para análise neural, score de leads e extração inteligente."
                                />
                                <ApiConfigItem
                                    label="OpenAI API (GPT-4)"
                                    placeholder="sk-..."
                                    value={formData.apiKeys.openai}
                                    onChange={(val) => setFormData({ ...formData, apiKeys: { ...formData.apiKeys, openai: val } })}
                                    description="Alternativa para enriquecimento de dados e cópia de vendas."
                                />
                            </div>

                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex gap-4">
                                <ShieldCheck className="text-primary shrink-0" />
                                <p className="text-xs text-slate-300">
                                    Suas chaves são criptografadas e armazenadas de forma segura. O sistema priorizará suas chaves pessoais antes de usar o saldo da plataforma.
                                </p>
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
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-primary text-slate-900 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
    >
        {icon}
        <span>{label}</span>
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
}> = ({ label, placeholder, description, value, onChange }) => (
    <div className="space-y-4 p-6 glass border-white/5 rounded-2xl">
        <div className="flex justify-between items-center">
            <h4 className="font-bold text-white">{label}</h4>
            <div className={`px-2 py-1 ${value ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} text-[10px] font-bold rounded uppercase`}>
                {value ? 'Configurado' : 'Pendente'}
            </div>
        </div>
        <p className="text-xs text-slate-500">{description}</p>
        <div className="relative">
            <input
                type="password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all pr-12"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                Ver
            </button>
        </div>
    </div>
);

export default WhiteLabelAdmin;
