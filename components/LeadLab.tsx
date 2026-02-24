import React, { useState, useMemo, useRef } from 'react';
import {
  FlaskConical, Search, Filter, Mail, Phone, ExternalLink,
  MoreHorizontal, ChevronDown, CheckCircle, Database, Sparkles,
  Zap, Globe, Download, LayoutList, Trash2, MapPin, MessageCircle, Layers, Loader2, Square, BrainCircuit, Cpu, Atom, TrendingUp
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import LiquidBattery from './LiquidBattery';
import { Lead, LeadStatus } from '../types';
import { ActivityService } from '../services/activityService';
import { supabase } from '../lib/supabase';
import { useBranding } from './BrandingProvider';

interface LeadLabProps {
  leads: Lead[];
  onEnrich: (lead: Lead) => void;
  onBulkEnrich: (leadsToEnrich: Lead[]) => void;
  isEnriching?: boolean;
  onStopEnrichment?: () => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onConvertToDeal?: (leadId: string) => void;
  userTenantId?: string;
}

const LeadRow = React.memo(({ lead, virtualRow, onEnrich, onDelete, onConvertToDeal }: {
  lead: Lead;
  virtualRow: any;
  onEnrich: any;
  onDelete: any;
  onConvertToDeal: any;
}) => {
  return (
    <tr
      className="group hover:bg-white/[0.03] transition-all absolute top-0 left-0 w-full border-b border-white/[0.02] flex items-center"
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
            {lead.details?.placeImage ? (
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-xl relative group-hover:border-primary/30 transition-colors">
                <img
                  src={lead.details.placeImage}
                  alt="Fachada"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            ) : (
              <div
                className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-700 ml-4 ${lead.status === LeadStatus.ENRICHED ? 'animate-pulse scale-125' : ''}`}
                style={{
                  backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#475569',
                  boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 15px var(--color-primary)' : 'none',
                }}
              ></div>
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

                {lead.status === LeadStatus.ENRICHED && onConvertToDeal && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onConvertToDeal(lead.id); }}
                    className="p-1.5 bg-violet-500/10 text-violet-500 hover:bg-violet-500 hover:text-white rounded-lg transition-all"
                    title="Pipeline"
                  >
                    <TrendingUp size={12} />
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(lead.id); }}
                  className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                  title="Descartar"
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

      {/* STATUS NEURAL - 15% (150px) */}
      <td className="px-10 py-4 text-center align-middle w-[15%] min-w-[150px] shrink-0">
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-[1.5px] border transition-all truncate`}
            style={{
              borderColor: lead.status === LeadStatus.ENRICHED ? 'rgba(var(--color-primary-rgb), 0.2)' : 'rgba(71, 85, 105, 0.2)',
              backgroundColor: lead.status === LeadStatus.ENRICHED ? 'rgba(var(--color-primary-rgb), 0.05)' : 'rgba(71, 85, 105, 0.05)',
              color: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#64748b',
            }}
          >
            {lead.status === LeadStatus.ENRICHED ? 'Neural Enabled' : 'Raw Lead'}
          </span>
        </div>
      </td>

      {/* DATA DE REGISTRO - 25% (250px) */}
      <td className="px-10 py-4 text-right align-middle w-[25%] min-w-[250px] shrink-0">
        <div className="flex flex-col items-end justify-center">
          <span className="text-[10px] text-slate-300 font-bold tracking-tight">{new Date(lead.lastUpdated).toLocaleDateString()}</span>
          <span className="text-[8px] text-slate-600 font-medium uppercase tracking-widest mt-0.5 tracking-tighter">Capturado no Lab</span>
        </div>
      </td>
    </tr>
  );
});

const LeadLab: React.FC<LeadLabProps> = ({
  leads, onEnrich, onBulkEnrich, isEnriching = false,
  onStopEnrichment, onDelete, onBulkDelete, onConvertToDeal, userTenantId
}) => {
  const { config } = useBranding();
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [isEnrichMenuOpen, setIsEnrichMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredLeads = useMemo(() => leads.filter(l => {
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const matchesNiche = !selectedNiche || l.industry === selectedNiche;
    const matchesLocation = !selectedLocation || (l.location && l.location.includes(selectedLocation ?? ''));
    return matchesStatus && matchesNiche && matchesLocation;
  }), [leads, filterStatus, selectedNiche, selectedLocation]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 85,
    overscan: 10,
  });

  const niches = useMemo(() => {
    const allNiches = leads.map(l => l.industry).filter(Boolean) as string[];
    const uniqueNiches = Array.from(new Set(allNiches));
    return uniqueNiches.sort((a, b) => {
      const countA = leads.filter(l => l.industry === a).length;
      const countB = leads.filter(l => l.industry === b).length;
      return countB - countA;
    }).slice(0, 10);
  }, [leads]);

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
                        {leads.filter(l => l.industry === niche).length}
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
                  {leads.length > 0 ? Math.round((leads.filter(l => l.status === LeadStatus.ENRICHED).length / leads.length) * 100) : 0}%
                </h4>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-1000 shadow-[0_0_15px_var(--color-primary)]"
                  style={{ width: `${leads.length > 0 ? (leads.filter(l => l.status === LeadStatus.ENRICHED).length / leads.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Enriquecidos (IA)</span>
            <div className="flex items-end gap-3 relative z-10">
              <h4 className="text-4xl font-black text-white tracking-tighter">
                {leads.filter(l => l.status === LeadStatus.ENRICHED).length}
              </h4>
              <span className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-widest">Leads Qualificados</span>
            </div>
          </div>

          <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Fila Pendente</span>
            <div className="flex items-end gap-3 relative z-10">
              <h4 className="text-4xl font-black text-white/40 tracking-tighter group-hover:text-white transition-colors">
                {leads.filter(l => l.status === LeadStatus.NEW).length}
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
                  {filteredLeads.length} de {leads.length} leads
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
                disabled={leads.filter(l => l.status === LeadStatus.NEW).length === 0 && !isEnriching}
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
                    <Layers size={14} /> Todos os {leads.filter(l => l.status === LeadStatus.NEW).length} Novos
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
              title="Limpar Filtro"
            >
              <Trash2 size={18} />
            </button>
            <button className="p-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all shadow-xl">
              <Download size={18} />
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
                    />
                  );
                })}
              </tbody>
            </table>

            {filteredLeads.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
                <div className="p-6 rounded-full bg-white/5 mb-6 animate-pulse">
                  <Search className="w-10 h-10 text-slate-700" />
                </div>
                <h4 className="text-xl font-black text-white mb-2 tracking-tight">Vazio Estratégico</h4>
                <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] max-w-xs leading-relaxed">Nenhum registro encontrado nos parâmetros de filtro atuais</p>
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
