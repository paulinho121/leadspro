import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  FlaskConical, Search, Filter, Mail, Phone, ExternalLink,
  MoreHorizontal, CheckCircle, Database, Sparkles,
  Zap, Globe, LayoutList, Trash2, MapPin, MessageCircle, Layers,
  Loader2, Square, BrainCircuit, TrendingUp,
  Linkedin, Archive, Ban, ChevronDown, Command
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import LiquidBattery from './LiquidBattery';
import { Lead, LeadStatus } from '../types';
import { ActivityService } from '../services/activityService';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import LeadSearchPalette from './LeadSearchPalette';

// FIX #3: Formatter estático — criado UMA vez, reutilizado em toda a lista
// evita chamar new Date() + toLocaleDateString() em cada row a cada render
const DATE_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface LeadLabProps {
  leads: Lead[];
  onEnrich: (lead: Lead) => void;
  onBulkEnrich: (leadsToEnrich: Lead[]) => void;
  isEnriching?: boolean;
  onStopEnrichment?: () => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onConvertToDeal?: (leadId: string) => void;
  onParkLead?: (leadId: string) => void;
  onDiscardLead?: (leadId: string) => void;
  userTenantId?: string;
  // Pagination
  hasMoreLeads?: boolean;
  totalCount?: number;
  onLoadMore?: () => void;
}

const LeadRow = React.memo(({ lead, virtualRow, onEnrich, onDelete, onConvertToDeal, onPark, onDiscard }: {
  lead: Lead;
  virtualRow: any;
  onEnrich: any;
  onDelete: any;
  onConvertToDeal: any;
  onPark: (id: string) => void;
  onDiscard: (id: string) => void;
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <tr
      className="group hover:bg-white/[0.015] transition-all absolute top-0 left-0 w-full border-b border-white/[0.03] hidden lg:flex items-center"
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        minWidth: '1100px'
      }}
    >
      {/* IDENTIFICAÇÃO & AÇÕES - 40% (420px) */}
      <td className="px-10 py-5 align-middle w-[40%] min-w-[420px] overflow-hidden shrink-0">
        <div className="flex items-center gap-5 w-full overflow-hidden">
          <div className="relative shrink-0">
            {lead.details?.placeImage && !imgError ? (
              <div className="w-12 h-12 rounded-[1rem] overflow-hidden border border-white/[0.05] shadow-[0_5px_15px_rgba(0,0,0,0.5)] relative group-hover:border-primary/20 transition-colors">
                <img
                  src={lead.details.placeImage}
                  alt="Fachada"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div
                className={`w-2.5 h-2.5 rounded-full ml-4 transition-colors duration-500`}
                style={{
                  backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#334155',
                  boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 15px var(--color-primary)' : 'none',
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
            <div className="font-black text-white text-[15px] group-hover:text-primary transition-all duration-300 leading-tight mb-1 truncate block w-full drop-shadow-md">
              {lead.details?.tradeName || lead.name}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest bg-black/20 px-1.5 py-0.5 rounded">ID</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest opacity-60">
                  {lead.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* ACÕES RÁPIDAS - Visíveis no Hover */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 border-l border-white/5 pl-4 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const clean = lead.phone?.replace(/\D/g, '');
                    if (!clean) return;
                    const fullPhone = clean.startsWith('55') ? clean : `55${clean}`;
                    const company = lead.details?.tradeName || lead.name;
                    const city = lead.location.split(',')[0];
                    const message = `Olá! Vi que a ${company} atua em ${city}. Gostaria de conversar.`;
                    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="p-1.5 bg-emerald-500/5 text-emerald-500/70 hover:bg-emerald-500 hover:text-white rounded-lg transition-all shadow-sm"
                  title="WhatsApp"
                >
                  <MessageCircle size={14} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onEnrich(lead); }}
                  className="p-1.5 bg-primary/5 text-primary/70 hover:bg-primary hover:text-slate-900 rounded-lg transition-all shadow-sm"
                  title="Análise Neural"
                >
                  <FlaskConical size={14} />
                </button>

                {lead.socialLinks?.linkedin && (
                  <a
                    href={lead.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-blue-600/5 text-blue-500/70 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm"
                    title="LinkedIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin size={14} />
                  </a>
                )}

                {lead.status === LeadStatus.ENRICHED && onConvertToDeal && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onConvertToDeal(lead.id); }}
                    className="p-1.5 bg-violet-500/5 text-violet-500/70 hover:bg-violet-500 hover:text-white rounded-lg transition-all shadow-sm"
                    title="Pipeline"
                  >
                    <TrendingUp size={14} />
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); onPark(lead.id); }}
                  className="p-1.5 bg-amber-500/5 text-amber-500/70 hover:bg-amber-500 hover:text-slate-900 rounded-lg transition-all shadow-sm"
                  title="Mover para Administração"
                >
                  <Archive size={14} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onDiscard(lead.id); }}
                  className="p-1.5 bg-red-500/5 text-red-500/70 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm"
                  title="Descartar Lead"
                >
                  <Ban size={14} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(lead.id); }}
                  className="p-1.5 bg-slate-500/5 text-slate-500 hover:bg-slate-500 hover:text-white rounded-lg transition-all shadow-sm ml-2"
                  title="Excluir do Banco (Hard Delete)"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* ATIVIDADE & LOCAL - 25% (250px) */}
      <td className="px-10 py-5 align-middle w-[25%] min-w-[250px] shrink-0">
        <div className="flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2 text-slate-300 font-bold text-[12px] tracking-tight truncate">
            <MapPin size={12} className="text-primary/40 shrink-0" />
            <span className="truncate drop-shadow-sm">{lead.location}</span>
          </div>
          <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1.5 pl-[20px] opacity-70 truncate">
            {lead.industry}
          </div>
        </div>
      </td>

      {/* STATUS NEURAL */}
      <td className="px-10 py-5 text-center align-middle w-[15%] min-w-[150px] shrink-0">
        <div className="flex justify-center">
          <span className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl border transition-all duration-300 ${lead.status === LeadStatus.ENRICHED
            ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
            : 'bg-white/[0.02] text-slate-500 border-white/5'
            }`}>
            {lead.status === LeadStatus.ENRICHED ? 'Neural Enabled' : 'Raw Trace'}
          </span>
        </div>
      </td>

      {/* DATA DE REGISTRO - 20% (200px) */}
      <td className="px-10 py-5 text-right align-middle w-[20%] min-w-[200px] shrink-0">
        <div className="flex flex-col items-end justify-center">
          <span className="text-[11px] text-slate-300 font-black tracking-widest font-mono">
            {DATE_FMT.format(new Date(lead.lastUpdated))}
          </span>
          <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">Data Fixada</span>
        </div>
      </td>
    </tr>
  );
});

const MobileLeadCard = ({ lead, onEnrich, onDelete, onConvertToDeal }: any) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="mobile-card flex flex-col gap-4 mb-4 active:scale-[0.98] transition-all">
      <div className="flex items-center gap-4">
        {lead.details?.placeImage && !imgError ? (
          <img src={lead.details.placeImage} className="w-12 h-12 rounded-xl object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Database size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{lead.details?.tradeName || lead.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin size={10} className="text-primary/60" />
            <span className="text-[10px] text-slate-400 truncate">{lead.location}</span>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${lead.status === LeadStatus.ENRICHED ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-slate-700'}`} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{lead.industry}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => onEnrich(lead)} className="p-2 bg-primary/10 text-primary rounded-lg active:bg-primary active:text-slate-900 transition-colors">
            <Zap size={14} />
          </button>
          {lead.status === LeadStatus.ENRICHED && onConvertToDeal && (
            <button onClick={() => onConvertToDeal(lead.id)} className="p-2 bg-violet-500/10 text-violet-500 rounded-lg">
              <TrendingUp size={14} />
            </button>
          )}
          <button onClick={() => onDelete(lead.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadLab: React.FC<LeadLabProps> = ({
  leads, onEnrich, onBulkEnrich, isEnriching = false,
  onStopEnrichment, onDelete, onBulkDelete, onConvertToDeal,
  onParkLead, onDiscardLead, userTenantId,
  hasMoreLeads = false, totalCount = 0, onLoadMore
}) => {
  // FIX #6: removido useBranding()
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [isEnrichMenuOpen, setIsEnrichMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Atalho global Ctrl+K / Cmd+K para abrir a Busca Inteligente
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Lab only shows NEW and ENRICHED leads — PARKED/DISCARDED go to Admin
  const labLeads = useMemo(() =>
    leads.filter(l => l.status !== LeadStatus.PARKED && l.status !== LeadStatus.DISCARDED),
    [leads]);

  const filteredLeads = useMemo(() => labLeads.filter(l => {
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const matchesNiche = !selectedNiche || l.industry === selectedNiche;
    const matchesLocation = !selectedLocation || (l.location && l.location.includes(selectedLocation ?? ''));
    return matchesStatus && matchesNiche && matchesLocation;
  }), [labLeads, filterStatus, selectedNiche, selectedLocation]);

  const handlePark = React.useCallback((id: string) => {
    onParkLead?.(id);
    toast.success('Movido para Administração', 'Lead pausado. Acesse a aba Adm. Leads.');
  }, [onParkLead]);

  const handleDiscard = React.useCallback((id: string) => {
    onDiscardLead?.(id);
    toast.info('Lead descartado', 'Visível em Adm. Leads > Descartados.');
  }, [onDiscardLead]);

  const parentRef = useRef<HTMLDivElement>(null);

  // FIX #2: overscan reduzido de 10 para 3 — evita renderizar 20 rows fora da viewport
  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 85,
    overscan: 3,
  });

  const { niches, nicheCount } = useMemo(() => {
    // O(n) single-pass count using Map instead of O(n²) nested .filter
    const countMap = new Map<string, number>();
    for (const l of labLeads) {
      if (l.industry) countMap.set(l.industry, (countMap.get(l.industry) ?? 0) + 1);
    }
    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return { niches: sorted.map(([n]) => n), nicheCount: countMap };
  }, [labLeads]);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in relative overflow-hidden">

      {/* Sidebar - Gaveta de Leads */}
      <aside className={`
        ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 fixed lg:relative z-40 lg:z-auto
        w-[300px] h-full transition-transform duration-500
      `}>
        <div className="h-full glass-strong border border-white/[0.03] rounded-[2.5rem] p-8 flex flex-col gap-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-slate-900/40 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>

          <div className="relative z-10 w-full">
            <div className="flex items-center gap-4 mb-10 px-1 hover:scale-[1.02] transition-transform origin-left cursor-default">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[1.25rem] text-primary border border-primary/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                <Database size={20} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[14px] font-black text-white uppercase tracking-[0.2em] leading-tight mb-1">Gaveta Core</h3>
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.25em]">Filtros & Rotas</span>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse shadow-[0_0_8px_var(--color-primary)]"></span>
                  Status do Processo
                </label>
                <div className="flex flex-col gap-2.5">
                  <FilterOption
                    active={filterStatus === 'ALL'}
                    onClick={() => setFilterStatus('ALL')}
                    label="Todos os Leads"
                    count={leads.length}
                    variant="primary"
                    icon={<LayoutList size={14} />}
                  />
                  <FilterOption
                    active={filterStatus === LeadStatus.NEW}
                    onClick={() => setFilterStatus(LeadStatus.NEW)}
                    label="Descobertas"
                    count={leads.filter(l => l.status === LeadStatus.NEW).length}
                    variant="secondary"
                    icon={<Zap size={14} />}
                  />
                  <FilterOption
                    active={filterStatus === LeadStatus.ENRICHED}
                    onClick={() => setFilterStatus(LeadStatus.ENRICHED)}
                    label="Qualificados"
                    count={leads.filter(l => l.status === LeadStatus.ENRICHED).length}
                    variant="accent"
                    icon={<Sparkles size={14} />}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Nichos Industriais
                </label>
                <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2">
                  {niches.map(niche => (
                    <button
                      key={niche}
                      onClick={() => setSelectedNiche(selectedNiche === niche ? null : niche)}
                      className={`flex items-center justify-between p-4 rounded-[1.25rem] transition-all text-[11px] font-black tracking-widest uppercase border group
                        ${selectedNiche === niche
                          ? 'bg-gradient-to-r from-white/10 to-white/5 text-white border-white/10 translate-x-1 shadow-lg'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] border-transparent'}`}
                    >
                      <span className="truncate pr-4 leading-tight group-hover:pl-1 transition-all">{niche.toLowerCase()}</span>
                      <span className={`text-[9px] font-mono px-2 py-1 rounded-lg shrink-0 ${selectedNiche === niche ? 'bg-white/10 text-white' : 'bg-black/20 group-hover:bg-white/5 group-hover:text-white transition-colors'}`}>
                        {nicheCount.get(niche) ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Intelligence Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">

          {/* Card 1: Maturidade Neural */}
          <div className="glass-strong rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10 rounded-full group-hover:bg-primary/30 transition-all duration-700"></div>
            <div className="absolute right-6 top-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <BrainCircuit size={48} className="text-primary" />
            </div>
            <div className="flex flex-col h-full justify-between gap-6 relative z-10">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-2 block">Maturidade Neural</span>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-5xl font-black text-white tracking-tighter">
                    {labLeads.length > 0 ? Math.round((labLeads.filter(l => l.status === LeadStatus.ENRICHED).length / labLeads.length) * 100) : 0}
                  </h4>
                  <span className="text-xl font-bold text-primary/70">%</span>
                </div>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-primary h-full transition-all duration-1000 relative"
                  style={{ width: `${labLeads.length > 0 ? (labLeads.filter(l => l.status === LeadStatus.ENRICHED).length / labLeads.length) * 100 : 0}%` }}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent to-white/30 truncate"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Enriquecidos */}
          <div className="glass rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="flex flex-col h-full justify-between relative z-10">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em] mb-4 block">Enriquecidos (IA)</span>
              <div className="flex items-baseline gap-4 mt-auto">
                <h4 className="text-5xl font-black text-white tracking-tighter">
                  {labLeads.filter(l => l.status === LeadStatus.ENRICHED).length}
                </h4>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest break-words max-w-[80px] leading-tight flex-1">Leads<br />Qualificados</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 text-emerald-500 opacity-5 group-hover:opacity-10 transition-all duration-700 w-32 h-32 flex items-center justify-center">
              <Sparkles size={120} />
            </div>
          </div>

          {/* Card 3: Fila Pendente */}
          <div className="glass rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-transparent"></div>
            <div className="flex flex-col h-full justify-between relative z-10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 block">Fila Pendente</span>
              <div className="flex items-baseline gap-4 mt-auto">
                <h4 className="text-5xl font-black text-white/40 tracking-tighter group-hover:text-white transition-colors duration-500">
                  {labLeads.filter(l => l.status === LeadStatus.NEW).length}
                </h4>
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-slate-600 group-hover:text-slate-400" />
                  <span className="text-[10px] text-slate-600 group-hover:text-slate-400 font-bold uppercase tracking-widest font-mono transition-colors">Scanning...</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 text-white opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700 w-32 h-32 flex items-center justify-center">
              <Database size={100} />
            </div>
          </div>

        </div>

        {/* Action Header */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 px-4 mt-2">
          <div className="flex items-center gap-6">
            <div className="w-2 h-16 bg-gradient-to-b from-primary to-orange-400 rounded-full hidden xl:block shadow-[0_0_20px_var(--color-primary)]"></div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                Laboratório
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 uppercase tracking-[0.2em] shadow-inner">
                  {filteredLeads.length} de {labLeads.length}
                  {totalCount > labLeads.length && <span className="text-slate-500"> ({totalCount} total)</span>}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Ambiente Científico de Extração e Refinamento Neural</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full xl:w-auto">
            <div className="relative flex-1 xl:flex-none">
              <button
                onClick={() => {
                  if (isEnriching && onStopEnrichment) onStopEnrichment();
                  else setIsEnrichMenuOpen(!isEnrichMenuOpen);
                }}
                disabled={labLeads.filter(l => l.status === LeadStatus.NEW).length === 0 && !isEnriching}
                className={`flex items-center justify-center gap-3 w-full px-8 py-5 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group
                  ${isEnriching
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-900/40 border border-red-400/20'
                    : 'bg-gradient-to-r from-primary to-orange-400 text-slate-900 border border-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale'}`}
              >
                {isEnriching ? <Square size={14} fill="white" /> : <Zap size={15} fill="currentColor" />}
                {isEnriching ? 'Parar Motor Neural' : 'Enriquecimento IA'}
                {!isEnriching && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>}
              </button>

              {isEnrichMenuOpen && !isEnriching && (
                <div className="absolute top-full right-0 mt-3 w-72 glass-strong border border-white/10 rounded-[1.5rem] p-3 z-[60] shadow-2xl animate-in fade-in slide-in-from-top-4">
                  <div className="mb-2 px-3 py-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Opções de Motor Neural</span>
                  </div>
                  <button
                    onClick={() => {
                      const toEnrich = leads.filter(l => l.status === LeadStatus.NEW);
                      onBulkEnrich(toEnrich);
                      setIsEnrichMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-primary transition-all flex items-center gap-3"
                  >
                    <Layers size={14} /> Processar {labLeads.filter(l => l.status === LeadStatus.NEW).length} Leads Soltos
                  </button>
                  <button
                    onClick={() => {
                      const toEnrich = leads.filter(l => l.status === LeadStatus.NEW && (selectedNiche ? l.industry === selectedNiche : true));
                      onBulkEnrich(toEnrich);
                      setIsEnrichMenuOpen(false);
                    }}
                    disabled={!selectedNiche}
                    className="w-full text-left px-5 py-4 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-primary transition-all flex items-center gap-3 disabled:opacity-30 disabled:grayscale"
                  >
                    <Filter size={14} /> Focar no Nicho Filtrado
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onBulkDelete?.(filteredLeads.map(l => l.id))}
              className="p-5 bg-white/[0.02] hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-[1.25rem] border border-white/5 transition-all shadow-xl group"
              title="Limpar seleção"
            >
              <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
            </button>

            {/* Comando Inteligente */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="flex items-center gap-3 p-5 bg-white/[0.02] hover:bg-primary/10 text-slate-400 hover:text-primary rounded-[1.25rem] border border-white/5 hover:border-primary/20 transition-all shadow-xl group"
              title="Busca Inteligente (Ctrl+K)"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" />
              <kbd className="hidden xl:flex items-center gap-1 text-[9px] font-black font-mono bg-white/5 group-hover:bg-primary/10 px-2 py-1 rounded border border-white/10 text-slate-500 group-hover:text-primary shadow-inner tracking-widest uppercase">
                Ctrl + K
              </kbd>
            </button>
          </div>
        </div>

        {/* Data Grid Section */}
        <div className={`flex-1 glass-strong rounded-[2.5rem] border border-white/[0.05] overflow-hidden flex flex-col min-h-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-700 bg-slate-900/20 ${isEnriching ? 'ring-2 ring-primary/40 shadow-[0_0_50px_rgba(249,115,22,0.15)]' : ''}`}>
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative" ref={parentRef}>
            <table className="w-full table-fixed text-left border-separate border-spacing-0 min-w-[1100px]">
              <thead className="sticky top-0 z-20 glass-strong backdrop-blur-3xl shadow-sm">
                <tr className="text-slate-500 font-black text-[9px] uppercase tracking-[0.3em]">
                  <th className="px-10 py-7 border-b border-white/[0.05] w-[40%] bg-slate-950/40">Identificação & Ações</th>
                  <th className="px-10 py-7 border-b border-white/[0.05] w-[25%] bg-slate-950/40">Atividade & Local</th>
                  <th className="px-10 py-7 border-b border-white/[0.05] w-[15%] text-center bg-slate-950/40">Status Neural</th>
                  <th className="px-10 py-7 border-b border-white/[0.05] w-[20%] text-right bg-slate-950/40">Data do Scan</th>
                </tr>
              </thead>
              <tbody className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {/* Desktop Table Rendering */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const lead = filteredLeads[virtualRow.index];
                  if (!lead) return null;
                  return (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      virtualRow={virtualRow}
                      onEnrich={onEnrich}
                      onDelete={onDelete}
                      onConvertToDeal={onConvertToDeal}
                      onPark={handlePark}
                      onDiscard={handleDiscard}
                    />
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card Rendering */}
            <div className="lg:hidden p-4 space-y-4">
              {filteredLeads.map(lead => (
                <MobileLeadCard
                  key={lead.id}
                  lead={lead}
                  onEnrich={onEnrich}
                  onDelete={onDelete}
                  onConvertToDeal={onConvertToDeal}
                />
              ))}
            </div>

            {filteredLeads.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-40 text-center animate-fade-in">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                  <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative z-10 shadow-2xl">
                    <Search className="w-12 h-12 text-slate-600" />
                  </div>
                </div>
                <h4 className="text-2xl font-black text-white mb-3 tracking-tighter">Vazio Tático</h4>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] max-w-sm leading-relaxed">Nenhum registro encontrado nos parâmetros de filtro atuais</p>
              </div>
            )}

            {/* Botão Carregar Mais */}
            {hasMoreLeads && filteredLeads.length > 0 && filterStatus === 'ALL' && !selectedNiche && (
              <div className="flex flex-col items-center py-12 gap-4 border-t border-white/5 bg-gradient-to-t from-black/20 to-transparent">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  Exibindo {leads.length} de {totalCount} leads no banco global
                </p>
                <button
                  onClick={() => {
                    setIsLoadingMore(true);
                    onLoadMore?.();
                    setTimeout(() => setIsLoadingMore(false), 1500);
                  }}
                  disabled={isLoadingMore}
                  className="flex items-center gap-3 px-10 py-4 bg-white/[0.02] hover:bg-primary/10 text-slate-300 hover:text-primary rounded-[1.25rem] border border-white/10 hover:border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl group disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <><Loader2 size={16} className="animate-spin text-primary" /> Carregando Setor...</>
                  ) : (
                    <><ChevronDown size={16} className="group-hover:translate-y-1 transition-transform" /> Carregar lote de {Math.min(100, totalCount - leads.length)} leads</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Busca Inteligente — Command Palette */}
      <LeadSearchPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        tenantId={userTenantId ?? ''}
        onEnrich={(lead) => { onEnrich(lead); }}
        onPark={(id) => { onParkLead?.(id); toast.success('Movido para Administração', 'Acesse a aba Adm. Leads.'); }}
        onDiscard={(id) => { onDiscardLead?.(id); toast.info('Lead descartado', 'Visível em Adm. Leads.'); }}
      />
    </div>
  );
};

const FilterOption = ({ active, onClick, label, count, icon, variant }: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
  variant: 'primary' | 'secondary' | 'accent' | 'default';
}) => {
  let styleClasses = '';
  switch (variant) {
    case 'primary': styleClasses = active ? 'bg-primary/10 border-primary/30 text-white' : 'hover:bg-primary/5'; break;
    case 'secondary': styleClasses = active ? 'bg-blue-500/10 border-blue-500/30 text-white' : 'hover:bg-blue-500/5'; break;
    case 'accent': styleClasses = active ? 'bg-violet-500/10 border-violet-500/30 text-white' : 'hover:bg-violet-500/5'; break;
    default: styleClasses = active ? 'bg-white/10 border-white/20 text-white' : 'hover:bg-white/5'; break;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border text-left
        ${styleClasses} ${!active && 'border-transparent text-slate-500'}`}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? 'text-primary' : 'text-slate-700'}`}>{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${active ? 'bg-white/10 text-white' : 'bg-white/5'}`}>
        {count}
      </span>
    </button>
  );
};

export default LeadLab;
