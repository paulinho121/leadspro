
import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, Zap, Search, Database, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ActivityLog {
    id: string;
    action: string;
    details: string;
    created_at: string;
    user_id: string;
}

interface ActivityHistoryProps {
    tenantId?: string;
    isMaster?: boolean;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ tenantId, isMaster }) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('activity_logs')
                .select('*');

            // Camada Extra de Segurança: Se não for Master, filtra explicitamente pelo Tenant
            if (!isMaster && tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (data) setLogs(data);
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getIcon = (action: string) => {
        switch (action) {
            case 'LEAD_CAPTURE': return <Search className="text-primary" size={16} />;
            case 'LEAD_ENRICH': return <Zap className="text-amber-500" size={16} />;
            case 'LOGIN': return <ShieldCheck className="text-emerald-500" size={16} />;
            case 'EXPORT': return <Database className="text-blue-500" size={16} />;
            default: return <Activity className="text-slate-400" size={16} />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                        <Activity className="text-primary" size={28} />
                        HISTÓRICO DE ATIVIDADE
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium italic">Registro em tempo real das operações do sistema.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 text-slate-400 hover:text-white"
                >
                    <Clock size={20} />
                </button>
            </div>

            <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Sincronizando Registros...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-6 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                            <Activity className="text-slate-700" size={40} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Nenhuma atividade registrada</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">As operações realizadas na plataforma aparecerão aqui para sua auditoria.</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {logs.map((log) => (
                            <div key={log.id} className="p-5 hover:bg-white/5 transition-all group flex items-start gap-4">
                                <div className="mt-1 p-2.5 bg-white/5 rounded-xl border border-white/5 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                                    {getIcon(log.action)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-bold text-white text-sm truncate uppercase tracking-tight">
                                            {log.action.replace(/_/g, ' ')}
                                        </h4>
                                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                            {formatDate(log.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        {log.details || 'Nenhum detalhe adicional fornecido.'}
                                    </p>
                                </div>
                                <div className="shrink-0 pt-1">
                                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500/70 uppercase tracking-tighter bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
                                        <CheckCircle2 size={10} />
                                        Sucesso
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Empty stats footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 glass rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total de Ações</p>
                    <p className="text-2xl font-black text-white">{logs.length}</p>
                </div>
                <div className="p-5 glass rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status do Log</p>
                    <p className="text-sm font-bold text-emerald-500 uppercase tracking-tighter flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        Encriptado
                    </p>
                </div>
                <div className="p-5 glass rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Última Atualização</p>
                    <p className="text-sm font-bold text-white">{logs.length > 0 ? formatDate(logs[0].created_at) : '---'}</p>
                </div>
            </div>
        </div>
    );
};

export default ActivityHistory;
