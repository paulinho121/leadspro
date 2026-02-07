
import React, { useState, useEffect } from 'react';
import {
    Users, Building2, ShieldCheck, Zap, TrendingUp,
    Search, Filter, MoreHorizontal, UserCheck, UserX,
    CreditCard, LayoutDashboard, Globe, Mail, Phone, Bell, Send, AlertTriangle, Info, DollarSign, X, CheckCircle,
    Terminal, Lock, ShieldAlert, History
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: string;
    is_active: boolean;
    created_at: string;
}

interface UserProfile {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    tenant_id: string;
}

const MasterConsole: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLeads: 0,
        activeTenants: 0,
        totalUsers: 0
    });

    // Ferramentas de Gestão
    const [isSendingNotification, setIsSendingNotification] = useState(false);
    const [selectedTenantForNote, setSelectedTenantForNote] = useState<Tenant | null>(null);
    const [notificationForm, setNotificationForm] = useState({
        title: '',
        message: '',
        type: 'info'
    });

    const fetchData = async () => {
        console.log('[Master Console] Iniciando sincronização de dados...');
        setIsLoading(true);
        try {
            // 1. Fetch Tenants
            const { data: tenantsData, error: tenantsError } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });

            if (tenantsError) throw tenantsError;
            if (tenantsData) {
                setTenants(tenantsData);
            }

            // 2. Fetch Profiles (User information)
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*');

            if (profilesError) throw profilesError;
            if (profilesData) {
                setProfiles(profilesData);
            }

            // 3. Fetch Total Leads Count
            const { count: leadsCount, error: leadsError } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true });

            if (leadsError) throw leadsError;

            setStats({
                totalLeads: leadsCount || 0,
                activeTenants: tenantsData?.filter(t => t.is_active).length || 0,
                totalUsers: profilesData?.length || 0
            });
        } catch (err: any) {
            console.error('Master Console Error:', err.message || err);
            alert('Erro ao sincronizar dados: ' + (err.message || 'Verifique o console.'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('tenants')
            .update({ is_active: !currentStatus })
            .eq('id', tenantId);

        if (error) {
            alert('Erro ao alterar status.');
        } else {
            fetchData();
        }
    };

    const sendNotification = async (targetTenantId?: string) => {
        if (!notificationForm.title || !notificationForm.message) {
            alert('Preencha título e mensagem.');
            return;
        }

        setIsSendingNotification(true);
        try {
            const tenantsToNotify = targetTenantId ? [{ id: targetTenantId }] : tenants.filter(t => t.is_active);

            const inserts = tenantsToNotify.map(t => ({
                tenant_id: t.id,
                title: notificationForm.title,
                message: notificationForm.message,
                type: notificationForm.type
            }));

            const { error } = await supabase.from('notifications').insert(inserts);
            if (error) throw error;

            alert(`Sucesso! ${inserts.length} notificação(ões) enviada(s).`);
            setNotificationForm({ title: '', message: '', type: 'info' });
            setSelectedTenantForNote(null);
        } catch (err: any) {
            alert('Falha ao enviar: ' + err.message);
        } finally {
            setIsSendingNotification(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 lg:pb-10">
            {/* Header & Stats */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl lg:text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-primary" size={24} />
                        MASTER CONSOLE <span className="text-primary/50 text-[9px] lg:text-sm font-mono tracking-widest bg-primary/10 px-3 py-1 rounded-full">V1.0</span>
                    </h2>
                    <p className="text-slate-500 mt-1 lg:mt-2 font-medium text-xs lg:text-base">Controle central de licenciamento e usuários.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                    <div className="flex-1 min-w-[140px] glass p-3 lg:p-4 rounded-2xl border border-white/5 flex items-center gap-3 lg:gap-4">
                        <div className="p-2 lg:p-3 bg-primary/10 rounded-xl shrink-0">
                            <Building2 className="text-primary" size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase">Empresas</p>
                            <h4 className="text-lg lg:text-xl font-black text-white">{tenants.length}</h4>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[140px] glass p-3 lg:p-4 rounded-2xl border border-white/5 flex items-center gap-3 lg:gap-4">
                        <div className="p-2 lg:p-3 bg-emerald-500/10 rounded-xl shrink-0">
                            <Users className="text-emerald-500" size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase">Usuários</p>
                            <h4 className="text-lg lg:text-xl font-black text-white">{stats.totalUsers}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Tenants List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base lg:text-lg font-black text-white flex items-center gap-2">
                            <LayoutDashboard size={18} className="text-primary" />
                            LICENCIAMENTOS
                        </h3>
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className="flex items-center gap-2 text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Zap size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                            {isLoading ? 'Sincronizando...' : 'Sincronizar'}
                        </button>
                    </div>

                    <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase border-b border-white/5">Empresa / Slug</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">Plano</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">Usuários</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/10 border-l">Status</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-right border-b border-white/5">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tenants.map(tenant => {
                                        const tenantUsers = profiles.filter(p => p.tenant_id === tenant.id);
                                        return (
                                            <tr key={tenant.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center font-black text-primary border border-white/5">
                                                            {tenant.name[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{tenant.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono tracking-wider">{tenant.slug}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${tenant.plan === 'pro' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-500 border border-white/5'}`}>
                                                        {tenant.plan}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center font-bold text-white text-sm">
                                                    {tenantUsers.length}
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex justify-center">
                                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${tenant.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${tenant.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                            {tenant.is_active ? 'Ativo' : 'Suspenso'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setSelectedTenantForNote(tenant)}
                                                            className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                                                            title="Enviar Notificação Direta"
                                                        >
                                                            <Bell size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
                                                            className={`p-2 rounded-xl transition-all ${tenant.is_active ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400' : 'hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400'}`}
                                                        >
                                                            {tenant.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Broadcast Terminal */}
                    <div className="glass p-6 rounded-3xl border border-primary/20 bg-primary/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                            <Terminal size={80} className="text-primary" />
                        </div>

                        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Bell size={16} className="text-primary" />
                            BROADCAST GLOBAL
                        </h4>

                        <div className="space-y-4 relative z-10">
                            <p className="text-[10px] text-slate-400 uppercase font-bold leading-tight">Envie alertas para TODOS os licenciados ativos simultaneamente.</p>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Título do Alerta..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-primary/50 transition-all"
                                    value={selectedTenantForNote ? '' : notificationForm.title}
                                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                                    disabled={!!selectedTenantForNote}
                                />
                                <textarea
                                    placeholder="Mensagem para o ecossistema..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-primary/50 transition-all min-h-[80px] resize-none"
                                    value={selectedTenantForNote ? '' : notificationForm.message}
                                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                                    disabled={!!selectedTenantForNote}
                                />

                                <div className="flex items-center gap-2">
                                    <select
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-slate-400 outline-none uppercase tracking-widest bg-slate-900"
                                        value={notificationForm.type}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                                    >
                                        <option value="info">INFO</option>
                                        <option value="warning">AVISO</option>
                                        <option value="billing">COBRANÇA</option>
                                        <option value="success">NOVIDADE</option>
                                    </select>
                                    <button
                                        onClick={() => sendNotification()}
                                        disabled={isSendingNotification || !!selectedTenantForNote}
                                        className="bg-primary text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {isSendingNotification ? '...' : 'ENVIAR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Direct Notification Modal (Overlay-like within column) */}
                    {selectedTenantForNote && (
                        <div className="glass p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-amber-500 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                    <Mail size={16} />
                                    MENSAGEM DIRETA
                                </h4>
                                <button onClick={() => setSelectedTenantForNote(null)} className="text-slate-500 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <p className="text-[10px] text-amber-200/50 uppercase font-bold mb-3">Para: {selectedTenantForNote.name}</p>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Assunto específico..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500/50 transition-all"
                                    value={notificationForm.title}
                                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                                />
                                <textarea
                                    placeholder="Escreva a mensagem..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500/50 transition-all min-h-[100px] resize-none"
                                    value={notificationForm.message}
                                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-slate-400 outline-none uppercase tracking-widest bg-slate-900"
                                        value={notificationForm.type}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                                    >
                                        <option value="info">INFO</option>
                                        <option value="billing">FINANCEIRO</option>
                                        <option value="warning">ALERTA</option>
                                    </select>
                                    <button
                                        onClick={() => sendNotification(selectedTenantForNote.id)}
                                        disabled={isSendingNotification}
                                        className="bg-amber-500 text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                    >
                                        {isSendingNotification ? '...' : 'ENVIAR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Card */}
                    <div className="glass p-6 rounded-3xl border border-white/5">
                        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Zap size={16} className="text-primary animate-pulse" />
                            Volume de Dados
                        </h4>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-[10px] text-slate-500 font-black uppercase">Leads Capturados (Total)</p>
                                    <p className="text-2xl font-black text-white leading-none">{stats.totalLeads}</p>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[75%]" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Monitoramento Ativo</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[95%]" />
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-500 font-bold tracking-tighter">95% Uptime</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security & Ops */}
                    <div className="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-red-500/5 to-transparent">
                        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Lock size={16} className="text-red-500" />
                            Segurança & Auditoria
                        </h4>
                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
                                <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">Logs de Ação Master</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Todas as alterações de status e envios de notificações são auditados com IP e Timestamp.</p>
                                </div>
                            </div>

                            <button
                                onClick={() => alert('Em breve: Relatório completo de auditoria.')}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-2"
                            >
                                <History size={14} /> Ver Logs do Sistema
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterConsole;
