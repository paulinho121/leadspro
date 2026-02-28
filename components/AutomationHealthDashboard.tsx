
import React, { useState, useEffect, useRef } from 'react';
import {
    Activity, CheckCircle2, XCircle, Clock, Zap,
    BarChart3, RefreshCw, Wifi, WifiOff, AlertTriangle,
    MessageCircle, Mail, GitBranch, TrendingUp, Send,
    Cpu, Shield, Eye, Reply, Play, Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HealthData {
    queue_pending: number;
    queue_processing: number;
    sent_last_24h: number;
    failed_last_24h: number;
    active_campaigns: number;
    active_sequences: number;
    delivery_rate_7d: number;
}

interface WorkerHealth {
    status: 'healthy' | 'degraded' | 'offline' | 'unknown';
    last_run_at: string | null;
    last_results: {
        messages: number;
        sequences: number;
        tasks: number;
        errors: number;
    };
}

interface RecentLog {
    id: string;
    event_type: string;
    status: string;
    lead_id: string;
    created_at: string;
    details: any;
}

interface HourlyStats {
    hour: string;
    count: number;
}

interface AutomationHealthDashboardProps {
    tenantId: string;
}

const AutomationHealthDashboard: React.FC<AutomationHealthDashboardProps> = ({ tenantId }) => {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [workerHealth, setWorkerHealth] = useState<WorkerHealth | null>(null);
    const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
    const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [isLiveMode, setIsLiveMode] = useState(true);
    const [isTriggeringWorker, setIsTriggeringWorker] = useState(false);
    const [workerTriggerResult, setWorkerTriggerResult] = useState<{ success: boolean; results?: any } | null>(null);
    const channelRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    const triggerWorker = async () => {
        setIsTriggeringWorker(true);
        setWorkerTriggerResult(null);
        try {
            const { data, error } = await supabase.functions.invoke('automation-worker', { body: {} });
            if (error) throw error;
            setWorkerTriggerResult({ success: true, results: data?.results });
            setTimeout(() => loadData(), 1500); // Refresh após execução
        } catch (err: any) {
            setWorkerTriggerResult({ success: false });
            console.error('[HealthDashboard] Erro ao disparar worker:', err);
        } finally {
            setIsTriggeringWorker(false);
            setTimeout(() => setWorkerTriggerResult(null), 5000);
        }
    };

    const loadData = async () => {
        try {
            const [healthRes, workerRes, logsRes] = await Promise.all([
                // Dados do health da view
                supabase
                    .from('v_automation_health')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .single(),

                // Status do worker
                supabase
                    .from('worker_health')
                    .select('*')
                    .eq('id', 'main-worker')
                    .single(),

                // Logs recentes
                supabase
                    .from('automation_execution_logs')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(20),
            ]);

            if (healthRes.data) setHealth(healthRes.data);
            if (workerRes.data) setWorkerHealth(workerRes.data as WorkerHealth);
            if (logsRes.data) setRecentLogs(logsRes.data);

            // Calcular estatísticas horárias das últimas 12h
            const stats = buildHourlyStats(logsRes.data || []);
            setHourlyStats(stats);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('[HealthDashboard] Erro ao carregar:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const buildHourlyStats = (logs: RecentLog[]): HourlyStats[] => {
        const hours: Record<string, number> = {};
        const now = new Date();

        // Inicializar últimas 12 horas
        for (let i = 11; i >= 0; i--) {
            const h = new Date(now);
            h.setHours(h.getHours() - i, 0, 0, 0);
            hours[h.getHours().toString().padStart(2, '0') + 'h'] = 0;
        }

        // Contar eventos bem-sucedidos por hora
        logs
            .filter(l => l.event_type === 'message_sent' && l.status === 'success')
            .forEach(log => {
                const h = new Date(log.created_at).getHours().toString().padStart(2, '0') + 'h';
                if (hours[h] !== undefined) hours[h]++;
            });

        return Object.entries(hours).map(([hour, count]) => ({ hour, count }));
    };

    useEffect(() => {
        if (!tenantId) return;
        loadData();

        if (isLiveMode) {
            // Atualização periódica a cada 30s
            intervalRef.current = setInterval(loadData, 30000);

            // Realtime: ouvir novos logs de automação
            channelRef.current = supabase
                .channel(`automation-health-${tenantId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'automation_execution_logs',
                    filter: `tenant_id=eq.${tenantId}`
                }, () => { loadData(); })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'message_queue',
                    filter: `tenant_id=eq.${tenantId}`
                }, () => { loadData(); })
                .subscribe();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [tenantId, isLiveMode]);

    const getWorkerStatusColor = () => {
        if (!workerHealth) return 'text-slate-500';
        switch (workerHealth.status) {
            case 'healthy': return 'text-emerald-500';
            case 'degraded': return 'text-amber-500';
            case 'offline': return 'text-red-500';
            default: return 'text-slate-500';
        }
    };

    const getWorkerStatusBg = () => {
        if (!workerHealth) return 'bg-slate-500/10 border-slate-500/20';
        switch (workerHealth.status) {
            case 'healthy': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'degraded': return 'bg-amber-500/10 border-amber-500/20';
            case 'offline': return 'bg-red-500/10 border-red-500/20';
            default: return 'bg-slate-500/10 border-slate-500/20';
        }
    };

    const getLastRunLabel = () => {
        if (!workerHealth?.last_run_at) return 'Nunca executado';
        const diff = (Date.now() - new Date(workerHealth.last_run_at).getTime()) / 1000 / 60;
        if (diff < 1) return 'Há menos de 1 min';
        if (diff < 60) return `Há ${Math.round(diff)} min`;
        return `Há ${Math.round(diff / 60)}h`;
    };

    const getEventIcon = (eventType: string, status: string) => {
        if (status === 'failure') return <XCircle size={12} className="text-red-500" />;
        switch (eventType) {
            case 'message_sent': return <Send size={12} className="text-emerald-500" />;
            case 'action_executed': return <Zap size={12} className="text-primary" />;
            case 'condition_checked': return <Shield size={12} className="text-blue-500" />;
            case 'error': return <AlertTriangle size={12} className="text-red-500" />;
            default: return <Activity size={12} className="text-slate-500" />;
        }
    };

    const maxCount = Math.max(...hourlyStats.map(h => h.count), 1);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-4 text-slate-500">
                    <RefreshCw size={24} className="animate-spin text-primary" />
                    <span className="text-sm font-mono uppercase tracking-widest">Carregando diagnóstico...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-xl">
                        <Cpu className="text-primary" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                {isLiveMode ? 'Monitoramento Live Ativo' : 'Modo Estático'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Motor de Automação</h2>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-6 md:mt-0">
                    {/* Feedback do trigger */}
                    {workerTriggerResult && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border animate-in fade-in duration-300 ${workerTriggerResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {workerTriggerResult.success ? (
                                <>
                                    <CheckCircle2 size={12} />
                                    {workerTriggerResult.results
                                        ? `✓ ${workerTriggerResult.results.messages}msg · ${workerTriggerResult.results.sequences}seq`
                                        : '✓ Executado'}
                                </>
                            ) : (
                                <><XCircle size={12} /> Falha no worker</>
                            )}
                        </div>
                    )}

                    <button
                        onClick={triggerWorker}
                        disabled={isTriggeringWorker}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {isTriggeringWorker ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                        {isTriggeringWorker ? 'Executando...' : 'Disparar Worker'}
                    </button>
                    <button
                        onClick={() => setIsLiveMode(!isLiveMode)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${isLiveMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5'}`}
                    >
                        {isLiveMode ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {isLiveMode ? 'Live' : 'Offline'}
                    </button>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-5 py-3 bg-white/5 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Worker Status Card */}
            <div className={`p-8 rounded-[2.5rem] border backdrop-blur-xl ${getWorkerStatusBg()}`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${getWorkerStatusBg()}`}>
                            <Activity size={28} className={`${getWorkerStatusColor()} ${workerHealth?.status === 'healthy' ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Worker Server-Side</p>
                            <h3 className={`text-2xl font-black uppercase italic tracking-tight ${getWorkerStatusColor()}`}>
                                {workerHealth?.status === 'healthy' ? '● Operacional' :
                                    workerHealth?.status === 'degraded' ? '◐ Degradado' :
                                        workerHealth?.status === 'offline' ? '○ Offline' : '? Desconhecido'}
                            </h3>
                            <p className="text-[9px] text-slate-500 font-mono mt-1">{getLastRunLabel()}</p>
                        </div>
                    </div>

                    {workerHealth?.last_results && (
                        <div className="grid grid-cols-4 gap-6">
                            {[
                                { label: 'Mensagens', value: workerHealth.last_results.messages, icon: <Send size={14} /> },
                                { label: 'Cadências', value: workerHealth.last_results.sequences, icon: <GitBranch size={14} /> },
                                { label: 'Tarefas', value: workerHealth.last_results.tasks, icon: <Zap size={14} /> },
                                { label: 'Erros', value: workerHealth.last_results.errors, icon: <XCircle size={14} />, danger: true },
                            ].map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className={`flex items-center justify-center gap-1 mb-1 ${stat.danger && stat.value > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {stat.icon}
                                        <span className="text-[8px] font-black uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <span className={`text-2xl font-black tabular-nums ${stat.danger && stat.value > 0 ? 'text-red-500' : 'text-white'}`}>
                                        {stat.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Na Fila', value: health?.queue_pending ?? 0, icon: <Clock size={18} />, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Processando', value: health?.queue_processing ?? 0, icon: <RefreshCw size={18} />, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', animate: true },
                    { label: 'Enviados 24h', value: health?.sent_last_24h ?? 0, icon: <CheckCircle2 size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Falhas 24h', value: health?.failed_last_24h ?? 0, icon: <XCircle size={18} />, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Campanhas', value: health?.active_campaigns ?? 0, icon: <BarChart3 size={18} />, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'Cadências', value: health?.active_sequences ?? 0, icon: <GitBranch size={18} />, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
                ].map((metric) => (
                    <div key={metric.label} className={`p-6 rounded-[2rem] border backdrop-blur-xl ${metric.bg}`}>
                        <div className={`mb-3 ${metric.color} ${(metric as any).animate ? 'animate-spin' : ''}`}>
                            {metric.icon}
                        </div>
                        <div className="text-3xl font-black text-white tabular-nums leading-none">{metric.value}</div>
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">{metric.label}</div>
                    </div>
                ))}
            </div>

            {/* Taxa de Entrega + Throughput */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de Throughput */}
                <div className="p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <TrendingUp size={18} className="text-primary" />
                        <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Throughput — Últimas 12h</h3>
                    </div>
                    <div className="flex items-end gap-1.5 h-24">
                        {hourlyStats.map((stat, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                <div
                                    className="w-full bg-primary/80 rounded-t-sm transition-all duration-700 hover:bg-primary"
                                    style={{ height: `${maxCount > 0 ? (stat.count / maxCount) * 100 : 0}%`, minHeight: stat.count > 0 ? '4px' : '0' }}
                                    title={`${stat.count} enviados`}
                                />
                                <span className="text-[7px] text-slate-700 font-mono">{stat.hour}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Taxa de Entrega */}
                <div className="p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield size={18} className="text-emerald-500" />
                        <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Health Score — 7 Dias</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1 pt-2">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                <circle
                                    cx="50" cy="50" r="40" fill="none"
                                    stroke={health?.delivery_rate_7d && health.delivery_rate_7d > 80 ? '#10b981' : health?.delivery_rate_7d && health.delivery_rate_7d > 50 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="10"
                                    strokeDasharray={`${(health?.delivery_rate_7d ?? 0) * 2.51} 251`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">{health?.delivery_rate_7d ?? 0}%</span>
                                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Entrega</span>
                            </div>
                        </div>
                        <p className={`text-xs font-bold mt-4 ${health?.delivery_rate_7d && health.delivery_rate_7d > 80 ? 'text-emerald-500' : health?.delivery_rate_7d && health.delivery_rate_7d > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {health?.delivery_rate_7d && health.delivery_rate_7d > 80 ? '✓ Excelente — Continue assim' :
                                health?.delivery_rate_7d && health.delivery_rate_7d > 50 ? '⚠ Moderado — Verifique os provedores' :
                                    '✕ Crítico — Cheque integração e providers'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Log de Eventos em Tempo Real */}
            <div className="p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-primary animate-pulse" />
                        <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Feed de Execução em Tempo Real</h3>
                    </div>
                    <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Últimos 20 eventos</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                    {recentLogs.length > 0 ? recentLogs.map(log => (
                        <div key={log.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${log.status === 'failure' ? 'bg-red-500/5 border-red-500/10' : log.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                            <div className="shrink-0">{getEventIcon(log.event_type, log.status)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider truncate">
                                        {log.event_type.replace(/_/g, ' ')}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${log.status === 'success' ? 'bg-emerald-500/20 text-emerald-500' : log.status === 'failure' ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-slate-400'}`}>
                                        {log.status}
                                    </span>
                                </div>
                                {log.details?.error && (
                                    <p className="text-[8px] text-red-400 font-mono mt-0.5 truncate">{log.details.error}</p>
                                )}
                            </div>
                            <span className="text-[8px] text-slate-600 font-mono shrink-0">
                                {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    )) : (
                        <div className="py-16 text-center">
                            <Activity size={32} className="text-slate-800 mx-auto mb-4" />
                            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Aguardando eventos do motor...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutomationHealthDashboard;
