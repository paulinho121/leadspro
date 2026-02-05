
import React from 'react';
import {
  Users, Sparkles, CheckCircle, TrendingUp,
  Globe, Activity, Zap, Brain, Map as MapIcon,
  MousePointer2, ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Lead, LeadStatus } from '../types';

interface BentoDashboardProps {
  leads: Lead[];
  onEnrich: (lead: Lead) => void;
}

const BentoDashboard: React.FC<BentoDashboardProps> = ({ leads, onEnrich }) => {
  const chartData = [
    { name: 'Seg', leads: 40 },
    { name: 'Ter', leads: 65 },
    { name: 'Qua', leads: 50 },
    { name: 'Qui', leads: 95 },
    { name: 'Sex', leads: 120 },
    { name: 'Sáb', leads: 80 },
    { name: 'Dom', leads: 110 },
  ];

  const enrichedCount = leads.filter(l => l.status === LeadStatus.ENRICHED).length;
  const totalLeads = leads.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-7xl mx-auto animate-fade-in">

      {/* 1. Main Performance - Fluxo de Leads */}
      <div className="col-span-1 md:col-span-4 lg:col-span-4 glass rounded-[2rem] p-8 premium-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-[100px] -mr-40 -mt-40 transition-all hover:bg-cyan-500/20"></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">Fluxo de Inteligência</h3>
            <p className="text-xs text-cyan-500/60 font-mono tracking-widest uppercase">Lead_Stream_Realtime</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-tighter">Sistemas Ativos</span>
          </div>
        </div>

        <div className="h-[240px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ color: '#06b6d4' }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#06b6d4"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Key Metrics - Estatísticas */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2 glass rounded-[2rem] p-8 flex flex-col premium-card overflow-hidden">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-magenta-500/10 blur-[100px] -mr-32 -mb-32"></div>

        <div className="flex justify-between items-start mb-8 relative z-10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="text-magenta-400" size={18} /> Pulso Operacional
          </h3>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo Estimado</span>
            <span className="text-lg font-mono font-bold text-emerald-400">R$ 142,80</span>
          </div>
        </div>

        <div className="space-y-6 relative z-10 flex-1">
          <StatBox label="Leads Identificados" value={totalLeads.toString()} color="text-cyan-400" icon={<Users size={20} />} />
          <StatBox label="Score de Qualidade" value={enrichedCount > 0 ? "84.2" : "0.0"} color="text-magenta-400" icon={<Sparkles size={20} />} />

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consumo Gemini</span>
              <span className="text-[10px] font-mono text-slate-300">R$ 0,12 / lead</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[35%] rounded-full shadow-[0_0_8px_var(--color-primary)]"></div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
          <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Conversão Estimada</span>
            <span className="text-cyan-400">14.8%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-magenta-500 w-[14.8%] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-1000"></div>
          </div>
        </div>
      </div>

      {/* 3. AI Insights Feed */}
      <div className="col-span-1 md:col-span-4 lg:col-span-4 glass rounded-[2rem] p-8 premium-card relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="text-cyan-400" size={20} /> Sinais Gemini
          </h3>
          <span className="text-[10px] bg-white/5 px-3 py-1.5 rounded-full text-slate-400 font-mono uppercase tracking-widest border border-white/5">
            Auto-Scan Ativo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          <InsightLog status="SUCESSO" msg="Identificado cluster em SP / Tecnologia" time="há 2 min" />
          <InsightLog status="PROGRESSO" msg="Enriquecendo dados de 'Green Power Co.'" time="há 5 min" color="cyan" />
          <InsightLog status="ALERTA" msg="14 novos leads prontos para abordagem" time="há 12 min" type="alert" />
          <InsightLog status="SYNC" msg="Leads sincronizados com CRM local" time="há 1h" color="slate" />
        </div>
      </div>

      {/* 4 & 5. Vertical Stack for Map and Quick Action */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col gap-6">
        <div className="flex gap-6 flex-1">
          {/* Geographic Pulse */}
          <div className="flex-1 glass rounded-[2rem] p-8 flex flex-col premium-card group cursor-pointer border-white/5 hover:border-cyan-500/30">
            <div className="bg-cyan-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform mx-auto">
              <MapIcon size={24} />
            </div>
            <div className="mt-auto text-center">
              <h4 className="text-white font-bold mb-1">Mapa Térmico</h4>
              <p className="text-slate-400 text-[10px] leading-tight mx-auto max-w-[120px]">Concentração máxima em SP e Curitiba.</p>
            </div>
          </div>

          {/* Quick Action - CTA */}
          <div className="flex-1 liquid-gradient rounded-[2rem] p-8 flex flex-col justify-between group cursor-pointer shadow-2xl shadow-cyan-500/20 hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                <Zap size={24} fill="white" />
              </div>
            </div>
            <div className="mt-auto">
              <h4 className="text-white font-bold text-lg mb-1 leading-tight">Extração Massa</h4>
              <p className="text-white/70 text-[10px] leading-tight">500 leads/clique.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const StatBox = ({ label, value, color, icon }: { label: string, value: string, color: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-5 group/stat">
    <div className={`w-12 h-12 rounded-2xl bg-white/5 ${color} flex items-center justify-center transition-all group-hover/stat:bg-white/10 group-hover/stat:scale-105`}>
      {icon}
    </div>
    <div>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-tighter">{label}</span>
      <div className={`text-2xl font-bold font-mono ${color} leading-none mt-1`}>{value}</div>
    </div>
  </div>
);

const InsightLog = ({ status, msg, time, type = 'normal', color = 'cyan' }: { status: string, msg: string, time: string, type?: 'normal' | 'alert', color?: string }) => (
  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4 hover:bg-white/[0.06] transition-all group cursor-default">
    <div className={`w-2 h-2 rounded-full ${type === 'alert' ? 'bg-magenta-500 animate-pulse ring-4 ring-magenta-500/20' : 'bg-cyan-500'} `}></div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-black uppercase tracking-widest ${type === 'alert' ? 'text-magenta-400' : 'text-slate-400'}`}>{status}</span>
        <span className="text-[9px] text-slate-600 font-mono">{time}</span>
      </div>
      <p className="text-slate-300 text-sm truncate group-hover:text-white transition-colors">{msg}</p>
    </div>
  </div>
);

export default BentoDashboard;
