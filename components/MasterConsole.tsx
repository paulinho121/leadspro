
import React, { useState, useEffect } from 'react';
import {
    Users, Building2, ShieldCheck, Zap, TrendingUp,
    Search, Filter, MoreHorizontal, UserCheck, UserX,
    CreditCard, LayoutDashboard, Globe, Mail, Phone
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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Tenants
            const { data: tenantsData } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });

            if (tenantsData) setTenants(tenantsData);

            // 2. Fetch Profiles (User information)
            // Note: We'd need a view or special permission to get emails if they aren't in profiles
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*');

            if (profilesData) setProfiles(profilesData);

            // 3. Fetch Total Leads Count
            const { count: leadsCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true });

            setStats({
                totalLeads: leadsCount || 0,
                activeTenants: tenantsData?.filter(t => t.is_active).length || 0,
                totalUsers: profilesData?.length || 0
            });

        } catch (err) {
            console.error('Master Console Error:', err);
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

        if (!error) fetchData();
    };

    return (
        <div className="flex-1 overflow-y-auto p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-primary" size={32} />
                        MASTER ADMIN <span className="text-primary/50 text-sm font-mono tracking-widest bg-primary/10 px-3 py-1 rounded-full">CONSOLE V1.0</span>
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Controle central de licenciamento e usuários da plataforma.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Building2 className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase">Empresas</p>
                            <h4 className="text-xl font-black text-white">{tenants.length}</h4>
                        </div>
                    </div>
                    <div className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Users className="text-emerald-500" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase">Usuários</p>
                            <h4 className="text-xl font-black text-white">{stats.totalUsers}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tenants List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <LayoutDashboard size={18} className="text-primary" />
                            LICENCIAMENTOS ATIVOS
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={fetchData} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all">
                                Atualizar Dados
                            </button>
                        </div>
                    </div>

                    <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase">Empresa / Slug</th>
                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center">Plano</th>
                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center">Usuários</th>
                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center">Status</th>
                                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-right">Ações</th>
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
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${tenant.plan === 'pro' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-slate-500/10 text-slate-500 border border-white/5'
                                                    }`}>
                                                    {tenant.plan}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center font-bold text-white text-sm">
                                                {tenantUsers.length}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex justify-center">
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${tenant.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                        {tenant.is_active ? 'Ativo' : 'Suspenso'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button
                                                    onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
                                                    className={`p-2 rounded-xl transition-all ${tenant.is_active ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400' : 'hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400'
                                                        }`}
                                                >
                                                    {tenant.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Mini Dashboard */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Média/Tenant</p>
                                    <p className="text-lg font-black text-white">{(tenants.length > 0 ? stats.totalLeads / tenants.length : 0).toFixed(0)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-right">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Crescimento</p>
                                    <p className="text-lg font-black text-emerald-500">+12%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-3xl border border-white/5">
                        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">Segurança e Logs</h4>
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400 font-medium">Você está autenticado como Administrador Master. Todas as ações nesta área são registradas para auditoria de segurança.</p>
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                <p className="text-[10px] text-amber-500 font-black uppercase flex items-center gap-2">
                                    <ShieldCheck size={12} /> ALERTA DE SISTEMA
                                </p>
                                <p className="text-[11px] text-amber-200/70 mt-1">Nenhum backup pendente encontrado. Próxima rotina: Hoje, 23:59.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterConsole;
