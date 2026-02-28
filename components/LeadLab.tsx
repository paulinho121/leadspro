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
      className="group hover:bg-white/[0.03] transition-all absolute top-0 left-0 w-full border-b border-white/[0.02] hidden lg:flex items-center"
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        minWidth: '1000px'
      }}
    >
      {/* IDENTIFICAÇÃO & AÇÕES - 35% (350px) */}
      <td className="px-10 py-4 align-middle w-[35%] min-w-[350px] overflow-hidden shrink-0">
        <div className="flex items-center gap-4 w-full overflow-hidden">
          <div className="relative shrink-0">
            {lead.details?.placeImage && !imgError ? (
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-xl relative group-hover:border-primary/30 transition-colors">
                <img
                  src={lead.details.placeImage}
                  alt="Fachada"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              // FIX #4: removido animate-pulse dos 162+ dots simultanâneos — causava jank no compositor CSS
              <div
                className={`w-2.5 h-2.5 rounded-full ml-4 transition-colors duration-500 ${lead.status === LeadStatus.ENRICHED ? 'scale-125' : ''}`}
                style={{
                  backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#475569',
                  boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 12px var(--color-primary)' : 'none',
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
            <div className="font-bold text-white text-[14px] lg:text-[15px] group-hover:text-primary transition-all duration-300 leading-tight mb-1 truncate block w-full">
              {lead.details?.tradeName || lead.name}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">ID</span>
                <span className="text-[9px] text-slate-500 font-mono tracking-widest opacity-60">
                  {lead.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* ACÕES RÁPIDAS - Visíveis no Hover */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0 border-l border-white/10 pl-3">
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
                  className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                  title="WhatsApp"
                >
                  <MessageCircle size={12} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onEnrich(lead); }}
                  className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-slate-900 rounded-lg transition-all"
                  title="Análise Neural"
                >
                  <FlaskConical size={12} />
                </button>

                {lead.socialLinks?.linkedin && (
                  <a
                    href={lead.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                    title="LinkedIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin size={12} />
                  </a>
                )}

                {lead.status === LeadStatus.ENRICHED && onConvertToDeal && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onConvertToDeal(lead.id); }}
                    className="p-1.5 bg-violet-500/10 text-violet-500 hover:bg-violet-500 hover:text-white rounded-lg transition-all"
                    title="Pipeline"
                  >
                    <TrendingUp size={12} />
                  </button>
                )}

                {/* Mover para Admin (Pausar) */}
                <button
                  onClick={(e) => { e.stopPropagation(); onPark(lead.id); }}
                  className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-900 rounded-lg transition-all"
                  title="Mover para Administração"
                >
                  <Archive size={12} />
                </button>

                {/* Descartar */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDiscard(lead.id); }}
                  className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                  title="Descartar Lead"
                >
                  <Ban size={12} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(lead.id); }}
                  className="p-1.5 bg-slate-500/10 text-slate-600 hover:bg-slate-500 hover:text-white rounded-lg transition-all"
                  title="Excluir do Banco"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* ATIVIDADE & LOCAL - 25% (250px) */}
      <td className="px-10 py-4 align-middle w-[25%] min-w-[250px] shrink-0">
        <div className="flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2 text-slate-300 font-medium text-[11px] tracking-tight truncate">
            <MapPin size={10} className="text-primary/50 shrink-0" />
            <span className="truncate">{lead.location}</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-1 pl-[18px] opacity-50 truncate">
            {lead.industry}
          </div>
        </div>
      </td>

      {/* STATUS NEURAL - FIX #5: CSS classes ao invés de inline style objects (evita reconciliação forçada) */}
      <td className="px-10 py-4 text-center align-middle w-[15%] min-w-[150px] shrink-0">
        <div className="flex justify-center">
          <span className={`lead-status-badge ${lead.status === LeadStatus.ENRICHED ? 'lead-status-enriched' : 'lead-status-raw'
            }`}>
            {lead.status === LeadStatus.ENRICHED ? 'Neural Enabled' : 'Raw Lead'}
          </span>
        </div>
      </td>

      {/* DATA DE REGISTRO - 25% (250px) */}
      <td className="px-10 py-4 text-right align-middle w-[25%] min-w-[250px] shrink-0">
        <div className="flex flex-col items-end justify-center">
          {/* FIX #3: usando DATE_FMT estático ao invés de new Date().toLocaleDateString() por row */}
          <span className="text-[10px] text-slate-300 font-bold tracking-tight">
            {DATE_FMT.format(new Date(lead.lastUpdated))}
          </span>
          <span className="text-[8px] text-slate-600 font-medium uppercase tracking-widest mt-0.5 tracking-tighter">Capturado no Lab</span>
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
        w-72 h-full transition-transform duration-300
      `}>
        <div className="h-full glass border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-10 shadow-2xl">
          <div>
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Database size={18} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Gaveta de Leads</h3>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtros & Organização</span>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"></span>
                  Status do Processo
                </label>
                <div className="flex flex-col gap-2">
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
                    label="Novas Descobertas"
                    count={leads.filter(l => l.status === LeadStatus.NEW).length}
                    variant="secondary"
                    icon={<Zap size={14} />}
                  />
                  <FilterOption
                    active={filterStatus === LeadStatus.ENRICHED}
                    onClick={() => setFilterStatus(LeadStatus.ENRICHED)}
                    label="Enriquecidos (IA)"
                    count={leads.filter(l => l.status === LeadStatus.ENRICHED).length}
                    variant="accent"
                    icon={<Sparkles size={14} />}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Nichos Ativos
                </label>
                <div className="flex flex-col gap-1 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                  {niches.map(niche => (
                    <button
                      key={niche}
                      onClick={() => setSelectedNiche(selectedNiche === niche ? null : niche)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-[11px] font-bold tracking-tight border
                        ${selectedNiche === niche
                          ? 'bg-white/10 text-white border-white/10 translate-x-1'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent'}`}
                    >
                      <span className="capitalize">{niche.toLowerCase()}</span>
                      <span className="text-[9px] opacity-40 font-mono">
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
          <div className="glass-strong rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <BrainCircuit size={80} />
            </div>
            <div className="flex flex-col h-full justify-between gap-4 relative z-10">
              <div>
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">Maturidade Neural</span>
                <h4 className="text-3xl font-black text-white tracking-tighter">
                  {labLeads.length > 0 ? Math.round((labLeads.filter(l => l.status === LeadStatus.ENRICHED).length / labLeads.length) * 100) : 0}%
                </h4>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-1000 shadow-[0_0_15px_var(--color-primary)]"
                  style={{ width: `${labLeads.length > 0 ? (labLeads.filter(l => l.status === LeadStatus.ENRICHED).length / labLeads.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Enriquecidos (IA)</span>
            <div className="flex items-end gap-3 relative z-10">
              <h4 className="text-4xl font-black text-white tracking-tighter">
                {labLeads.filter(l => l.status === LeadStatus.ENRICHED).length}
              </h4>
              <span className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest">Leads Qualificados</span>
            </div>
          </div>

          <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Fila Pendente</span>
            <div className="flex items-end gap-3 relative z-10">
              <h4 className="text-4xl font-black text-white/40 tracking-tighter group-hover:text-white transition-colors">
                {labLeads.filter(l => l.status === LeadStatus.NEW).length}
              </h4>
              <span className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest font-mono">Scanning...</span>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 px-2">
          <div className="flex items-center gap-5">
            <div className="w-1.5 h-12 bg-primary rounded-full hidden xl:block shadow-[0_0_20px_var(--color-primary)]"></div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter flex items-center gap-4">
                Laboratório
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 uppercase tracking-[0.2em]">
                  {filteredLeads.length} de {labLeads.length}
                  {totalCount > labLeads.length && <span className="text-slate-500"> ({totalCount} total)</span>}
                </span>
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Ambiente de extração e refinamento de dados</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 xl:flex-none">
              <button
                onClick={() => {
                  if (isEnriching && onStopEnrichment) onStopEnrichment();
                  else setIsEnrichMenuOpen(!isEnrichMenuOpen);
                }}
                disabled={labLeads.filter(l => l.status === LeadStatus.NEW).length === 0 && !isEnriching}
                className={`flex items-center justify-center gap-3 w-full px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all shadow-xl relative overflow-hidden group
                  ${isEnriching
                    ? 'bg-red-600 text-white shadow-red-900/40'
                    : 'bg-primary text-slate-900 shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale'}`}
              >
                {isEnriching ? <Square size={14} fill="white" /> : <Zap size={14} fill="currentColor" />}
                {isEnriching ? 'Parar Motor' : 'IA Enrich'}
              </button>

              {isEnrichMenuOpen && !isEnriching && (
                <div className="absolute bottom-full right-0 mb-3 w-64 glass-strong border border-white/10 rounded-[1.5rem] p-2 z-[60] shadow-2xl animate-in slide-in-from-bottom-3">
                  <button
                    onClick={() => {
                      const toEnrich = leads.filter(l => l.status === LeadStatus.NEW);
                      onBulkEnrich(toEnrich);
                      setIsEnrichMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-primary transition-all flex items-center gap-3"
                  >
                    <Layers size={14} /> Todos os {labLeads.filter(l => l.status === LeadStatus.NEW).length} Novos
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
                    <Filter size={14} /> Somente Nicho Atual
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onBulkDelete?.(filteredLeads.map(l => l.id))}
              className="p-4 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-2xl border border-white/5 transition-all shadow-xl"
              title="Limpar seleção"
            >
              <Trash2 size={18} />
            </button>

            {/* Botão Busca Inteligente */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="flex items-center gap-2 p-4 bg-white/5 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-2xl border border-white/5 hover:border-primary/20 transition-all shadow-xl group"
              title="Busca Inteligente (Ctrl+K)"
            >
              <Search size={18} />
              <kbd className="hidden xl:flex items-center gap-1 text-[8px] font-mono bg-white/5 group-hover:bg-primary/10 px-1.5 py-0.5 rounded-md border border-white/10 text-slate-600 group-hover:text-primary">
                Ctrl K
              </kbd>
            </button>

          </div>
        </div>

        {/* Data Grid Section */}
        <div className={`flex-1 glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col min-h-0 shadow-2xl transition-all duration-500 ${isEnriching ? 'ring-1 ring-primary/30' : ''}`}>
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative" ref={parentRef}>
            <table className="w-full table-fixed text-left border-separate border-spacing-0 min-w-[1000px]">
              <thead className="sticky top-0 z-20 glass-strong backdrop-blur-2xl">
                <tr className="text-slate-500 font-black text-[9px] uppercase tracking-[0.3em]">
                  <th className="px-10 py-6 border-b border-white/5 w-[35%]">Identificação & Ações</th>
                  <th className="px-10 py-6 border-b border-white/5 w-[25%]">Atividade & Local</th>
                  <th className="px-10 py-6 border-b border-white/5 w-[15%] text-center">Status Neural</th>
                  <th className="px-10 py-6 border-b border-white/5 w-[25%] text-right">Data</th>
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
            <div className="lg:hidden p-2">
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
              <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
                <div className="p-6 rounded-full bg-white/5 mb-6">
                  <Search className="w-10 h-10 text-slate-700" />
                </div>
                <h4 className="text-xl font-black text-white mb-2 tracking-tight">Vazio Estratégico</h4>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] max-w-xs leading-relaxed">Nenhum registro encontrado nos parâmetros de filtro atuais</p>
              </div>
            )}

            {/* Botão Carregar Mais */}
            {hasMoreLeads && filteredLeads.length > 0 && filterStatus === 'ALL' && !selectedNiche && (
              <div className="flex flex-col items-center py-8 gap-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  Mostrando {leads.length} de {totalCount} leads no banco
                </p>
                <button
                  onClick={() => {
                    setIsLoadingMore(true);
                    onLoadMore?.();
                    setTimeout(() => setIsLoadingMore(false), 1500);
                  }}
                  disabled={isLoadingMore}
                  className="flex items-center gap-3 px-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl border border-primary/20 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <><Loader2 size={14} className="animate-spin" /> Carregando...</>
                  ) : (
                    <><ChevronDown size={14} /> Carregar mais {Math.min(100, totalCount - leads.length)} leads</>
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
