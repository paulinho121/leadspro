import React, { useState } from 'react';
import {
  FlaskConical, Search, Filter, Mail, Phone, ExternalLink,
  MoreHorizontal, ChevronDown, CheckCircle, Database, Sparkles,
  Zap, Globe, Download, LayoutList, Trash2, MapPin, MessageCircle, Layers, Loader2, Square, BrainCircuit, Cpu, Atom
} from 'lucide-react';
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
  userTenantId?: string;
}

const LeadLab: React.FC<LeadLabProps> = ({ leads, onEnrich, onBulkEnrich, isEnriching = false, onStopEnrichment, onDelete, onBulkDelete, userTenantId }) => {
  const { config } = useBranding();
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [isEnrichMenuOpen, setIsEnrichMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredLeads = leads.filter(l => {
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const matchesNiche = !selectedNiche || l.industry === selectedNiche;
    const matchesLocation = !selectedLocation || (l.location && l.location.includes(selectedLocation));
    return matchesStatus && matchesNiche && matchesLocation;
  });

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in relative">

      {/* Mobile Toggle Drawer */}
      <button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="lg:hidden flex items-center justify-center gap-2 w-full py-4 glass border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-primary hover:bg-white/10 transition-all shrink-0"
      >
        <Filter size={14} />
        {isDrawerOpen ? 'Fechar Filtros' : 'Filtrar & Organizar'}
      </button>

      {/* Lead Drawer (Sidebar Filters) */}
      <div className={`
        ${isDrawerOpen ? 'flex' : 'hidden'} lg:flex
        w-full lg:w-80 flex-shrink-0 flex-col gap-6 transition-all duration-300
      `}>
        <div className="glass rounded-[2rem] p-6 border border-white/5 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <LayoutList size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Gaveta de Leads</h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Filtros & Organização</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar max-h-[60vh] lg:max-h-none">

            {/* Status Filter */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Filter size={10} /> Status do Processo
              </label>
              <div className="flex flex-col gap-2">
                <FilterOption
                  active={filterStatus === 'ALL'}
                  onClick={() => { setFilterStatus('ALL'); if (window.innerWidth < 1024) setIsDrawerOpen(false); }}
                  label="Todos os Leads"
                  count={leads.length}
                />
                <FilterOption
                  active={filterStatus === LeadStatus.NEW}
                  onClick={() => { setFilterStatus(LeadStatus.NEW); if (window.innerWidth < 1024) setIsDrawerOpen(false); }}
                  label="Novas Descobertas"
                  count={leads.filter(l => l.status === LeadStatus.NEW).length}
                  icon={<Zap size={12} />}
                />
                <FilterOption
                  active={filterStatus === LeadStatus.ENRICHED}
                  onClick={() => { setFilterStatus(LeadStatus.ENRICHED); if (window.innerWidth < 1024) setIsDrawerOpen(false); }}
                  label="Enriquecidos com IA"
                  count={leads.filter(l => l.status === LeadStatus.ENRICHED).length}
                  icon={<Sparkles size={12} className="animate-pulse" />}
                  color="primary"
                />
              </div>
            </div>

            {/* Niche Filter */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Database size={10} /> Nichos / Atividades
              </label>
              <div className="flex flex-col gap-2">
                {Array.from(new Set(leads.map(l => l.industry))).slice(0, 10).map(industry => (
                  <div key={industry} className={`flex items-center justify-between group cursor-pointer p-2 rounded-lg transition-all ${selectedNiche === industry ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-white/5'}`}
                    onClick={() => { setSelectedNiche(selectedNiche === industry ? null : industry); if (window.innerWidth < 1024) setIsDrawerOpen(false); }}>
                    <span className={`text-xs font-bold transition-colors ${selectedNiche === industry ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {industry}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${selectedNiche === industry ? 'bg-primary text-slate-900' : 'bg-white/5 text-slate-600'}`}>
                      {leads.filter(l => l.industry === industry).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-4 pb-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin size={10} /> Regiões Ativas
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(leads.map(l => l.location.split(',')[1]?.trim() || 'BR'))).slice(0, 8).map(uf => (
                  <button
                    key={uf}
                    onClick={() => { setSelectedLocation(selectedLocation === uf ? null : uf); if (window.innerWidth < 1024) setIsDrawerOpen(false); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${selectedLocation === uf
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-primary/30'}`}>
                    {uf}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="glass rounded-2xl border border-white/5 relative overflow-hidden group h-[120px]">
            <LiquidBattery
              percentage={leads.length > 0 ? (leads.filter(l => l.status === LeadStatus.ENRICHED).length / leads.length) * 100 : 0}
              isScanning={isEnriching}
              label={isEnriching ? "ENRIQUECENDO..." : "PROGRESSO GERAL"}
              subLabel={`${leads.filter(l => l.status === LeadStatus.ENRICHED).length} / ${leads.length} LEADS`}
            />
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-20 transition-all duration-700 ${isEnriching ? 'animate-neural opacity-20 scale-110' : 'group-hover:scale-110'}`}>
              <BrainCircuit size={80} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70" style={{ color: 'var(--color-primary)' }}>Enriquecidos (IA)</p>
              <div className="text-3xl font-black text-white tracking-tighter">{leads.filter(l => l.status === LeadStatus.ENRICHED).length}</div>
              <div className="text-[10px] mt-2 font-mono flex items-center gap-1.5 opacity-60" style={{ color: 'var(--color-primary)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-current"></div>
                <span className="font-bold tracking-tight">DADOS NEURAIS COMPLETOS</span>
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110">
              <Cpu size={80} style={{ color: 'var(--color-secondary)' }} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70" style={{ color: 'var(--color-secondary)' }}>Novos na Fila</p>
              <div className="text-3xl font-black text-white tracking-tighter">{leads.filter(l => l.status === LeadStatus.NEW).length}</div>
              <div className="text-[10px] mt-2 font-mono flex items-center gap-1.5 opacity-60" style={{ color: 'var(--color-secondary)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                <span className="font-bold tracking-tight">AGUARDANDO PROCESSAMENTO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Header & Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 px-2 lg:px-0">
          <div className="flex items-center gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl lg:text-2xl font-black text-white tracking-tight">Laboratório</h3>
                {isEnriching && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Motor Ativo</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] font-bold mt-0.5">{filteredLeads.length} leads</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {leads.some(l => l.status === LeadStatus.NEW) && (
                <div className="relative flex-1 sm:flex-none">
                  {isEnrichMenuOpen && !isEnriching && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 glass border border-white/10 rounded-2xl p-2 z-[60] animate-in slide-in-from-bottom-2 duration-300">
                      <button
                        onClick={() => {
                          const toEnrich = leads.filter(l =>
                            l.status === LeadStatus.NEW &&
                            (!selectedNiche || l.industry === selectedNiche)
                          );
                          onBulkEnrich(toEnrich);
                          setIsEnrichMenuOpen(false);

                          supabase.auth.getSession().then(({ data: { session } }) => {
                            if (session?.user && userTenantId) {
                              ActivityService.log(userTenantId, session.user.id, 'LEAD_ENRICH', `Iniciado enriquecimento em massa para o nicho "${selectedNiche}".`);
                            }
                          });
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:text-primary transition-all flex items-center gap-2"
                      >
                        <Zap size={14} /> Enriquecer Nicho Selecionado
                      </button>
                      <button
                        onClick={() => {
                          const toEnrich = leads.filter(l => l.status === LeadStatus.NEW);
                          onBulkEnrich(toEnrich);
                          setIsEnrichMenuOpen(false);

                          supabase.auth.getSession().then(({ data: { session } }) => {
                            if (session?.user && userTenantId) {
                              ActivityService.log(userTenantId, session.user.id, 'LEAD_ENRICH', `Iniciado enriquecimento completo para ${toEnrich.length} leads novos.`);
                            }
                          });
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:text-primary transition-all flex items-center gap-2"
                      >
                        <Layers size={14} /> Todos os Novos
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (isEnriching && onStopEnrichment) {
                        onStopEnrichment();
                      } else {
                        const hasNew = leads.some(l => l.status === LeadStatus.NEW);
                        if (hasNew) {
                          setIsEnrichMenuOpen(!isEnrichMenuOpen);
                        } else {
                          alert('Nenhum lead novo para enriquecer.');
                        }
                      }
                    }}
                    className={`flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border relative overflow-hidden group/enrich ${isEnriching
                      ? 'bg-red-600 text-white border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:bg-red-700 animate-pulse'
                      : 'bg-slate-900 text-white border-white/10 hover:border-primary/50 shadow-2xl'
                      }`}
                  >
                    {/* Background Progress / Animation */}
                    {isEnriching ? (
                      <>
                        <div className="absolute inset-0 bg-black/20 animate-scan pointer-events-none" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-cyan-500 opacity-90 group-hover/enrich:opacity-100 transition-opacity" />
                    )}

                    <div className="relative z-10 flex items-center gap-3">
                      {isEnriching ? (
                        <>
                          <Square size={16} fill="white" className="animate-pulse" />
                          <span className="tracking-[0.2em] font-black">INTERROMPER LAB</span>
                        </>
                      ) : (
                        <>
                          <BrainCircuit size={16} className={`${leads.some(l => l.status === LeadStatus.NEW) ? 'animate-neural' : ''}`} />
                          <span className="group-hover/enrich:tracking-widest transition-all duration-500">IA ENRICH</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {onBulkDelete && filteredLeads.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`Tem certeza que deseja excluir TODOS OS ${filteredLeads.length} leads listados? Esta ação é irreversível.`)) {
                      onBulkDelete(filteredLeads.map(l => l.id));
                    }
                  }}
                  className="p-3.5 glass rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-xl shrink-0 border border-white/5 hover:border-red-500/30"
                  title="Limpar Lista"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <button className="p-3.5 glass rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl shrink-0 border border-white/5 disabled:opacity-50">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Experimental Data Grid */}
        <div className={`flex-1 glass rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border transition-all duration-500 flex flex-col shadow-2xl min-h-0 ${isEnriching ? 'border-primary/50 shadow-primary/20' : 'border-white/5'}`}>
          {isEnriching && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan z-30"></div>
          )}
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
              <thead className="sticky top-0 z-20 bg-[#0f172a]/80 backdrop-blur-xl">
                <tr className="text-slate-500 font-black text-[10px] uppercase tracking-[0.25em]">
                  <th className="px-8 lg:px-12 py-6 border-b border-white/5">Razão Social</th>
                  <th className="px-8 lg:px-12 py-6 border-b border-white/5">Localização & Nicho</th>
                  <th className="px-8 lg:px-12 py-6 border-b border-white/5 text-center">Status</th>
                  <th className="px-8 lg:px-12 py-6 border-b border-white/5 text-center">Data</th>
                  <th className="px-8 lg:px-12 py-6 border-b border-white/5 text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-white/[0.02] transition-all relative">
                    <td className="px-8 lg:px-12 py-6 align-middle">
                      <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                          <div
                            className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-700 ${lead.status === LeadStatus.ENRICHED ? 'animate-pulse scale-125' : ''}`}
                            style={{
                              backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : 'var(--color-secondary)',
                              boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 15px var(--color-primary)' : '0 0 10px var(--color-secondary)',
                            }}
                          ></div>
                          {lead.status === LeadStatus.ENRICHED && (
                            <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping bg-primary opacity-30"></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm lg:text-[15px] group-hover:text-primary transition-all duration-300 leading-none mb-1.5 truncate">
                            {lead.details?.tradeName || lead.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 tracking-wider">
                            <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/5 uppercase">UUID</span>
                            {lead.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 lg:px-12 py-6 align-middle">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs tracking-tight">
                          <MapPin size={12} className="text-slate-500" />
                          {lead.location}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-2 uppercase tracking-widest pl-5">
                          <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                          {lead.industry}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 lg:px-12 py-6 text-center align-middle">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[2px] border-2 transition-all shadow-lg shadow-black/20`}
                        style={{
                          borderColor: lead.status === LeadStatus.ENRICHED ? 'rgba(var(--color-primary-rgb), 0.3)' : 'rgba(var(--color-secondary-rgb), 0.3)',
                          backgroundColor: lead.status === LeadStatus.ENRICHED ? 'rgba(var(--color-primary-rgb), 0.15)' : 'rgba(var(--color-secondary-rgb), 0.15)',
                          color: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : 'var(--color-secondary)',
                        }}
                      >
                        {lead.status === LeadStatus.ENRICHED ? 'Enriquecido' : 'Novo Lab'}
                      </span>
                    </td>
                    <td className="px-8 lg:px-12 py-6 text-center align-middle">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] text-white font-black tracking-tighter">{new Date(lead.lastUpdated).toLocaleDateString()}</span>
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mt-0.5">Capturado</span>
                      </div>
                    </td>
                    <td className="px-8 lg:px-12 py-6 text-right align-middle">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            const clean = lead.phone?.replace(/\D/g, '');
                            if (!clean) return;
                            const fullPhone = clean.startsWith('55') ? clean : `55${clean}`;
                            const company = lead.details?.tradeName || lead.name;
                            const city = lead.location.split(',')[0];
                            const message = `Olá! Vi que a ${company} atua em ${city}. Gostaria de conversar.`;
                            window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="p-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-90"
                          title="WhatsApp Scout"
                        >
                          <MessageCircle size={15} />
                        </button>
                        <button
                          onClick={() => onEnrich(lead)}
                          className="p-3 bg-primary/10 text-primary hover:bg-primary hover:text-slate-900 rounded-2xl transition-all shadow-lg hover:shadow-primary/20 active:scale-90"
                          title="Análise Neural"
                        >
                          <FlaskConical size={15} />
                        </button>
                        {onDelete && (
                          <button
                            onClick={() => {
                              if (window.confirm('Tem certeza que deseja excluir este lead?')) {
                                onDelete(lead.id);
                              }
                            }}
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-lg hover:shadow-red-500/20 active:scale-90"
                            title="Descartar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-slate-700 mb-4" />
              <h4 className="text-lg font-black text-white mb-1 tracking-tight">Filtro Vazio</h4>
              <p className="text-slate-500 text-[10px] uppercase">Nenhum resultado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const FilterOption = ({ active, onClick, label, count, icon, color = 'cyan' }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${active
      ? `bg-primary/10 border-primary/30 text-white shadow-lg`
      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
  >
    <div className="flex items-center gap-3">
      {icon ? (
        <div
          className={`p-1.5 rounded-lg ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-500'}`}
          style={{ color: active ? 'var(--color-primary)' : undefined }}
        >
          {icon}
        </div>
      ) : (
        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-primary' : 'bg-slate-700'}`}></div>
      )}
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
    </div>
    {count !== undefined && (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${active ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-600'}`}>
        {count}
      </span>
    )}
  </button>
);

export default LeadLab;
