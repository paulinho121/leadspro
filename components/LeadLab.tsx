import React, { useState } from 'react';
import {
  FlaskConical, Search, Filter, Mail, Phone, ExternalLink,
  MoreHorizontal, ChevronDown, CheckCircle, Database, Sparkles,
  Zap, Globe, Download, LayoutList, Trash2, MapPin, MessageCircle, Layers, Loader2
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadLabProps {
  leads: Lead[];
  onEnrich: (lead: Lead) => void;
  onBulkEnrich: (leadsToEnrich: Lead[]) => void;
  isEnriching?: boolean;
}

const LeadLab: React.FC<LeadLabProps> = ({ leads, onEnrich, onBulkEnrich, isEnriching = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [isEnrichMenuOpen, setIsEnrichMenuOpen] = useState(false);

  const filteredLeads = leads.filter(l => {
    // 1. Filtro de Status
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;

    // 2. Filtro de Nicho (Sidebar)
    const matchesNiche = !selectedNiche || l.industry === selectedNiche;

    // 3. Filtro de Localização (Sidebar)
    const matchesLocation = !selectedLocation || (l.location && l.location.includes(selectedLocation));

    // 4. Busca Textual (Barra Superior) - agora filtro adicional
    const matchesSearch = !searchTerm ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.industry.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesNiche && matchesLocation && matchesSearch;
  });

  return (
    <div className="flex h-full gap-6 animate-fade-in">

      {/* Lead Drawer (Sidebar Filters) */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6">
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

          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">

            {/* Status Filter */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Filter size={10} /> Status do Processo
              </label>
              <div className="flex flex-col gap-2">
                <FilterOption
                  active={filterStatus === 'ALL'}
                  onClick={() => setFilterStatus('ALL')}
                  label="Todos os Leads"
                  count={leads.length}
                />
                <FilterOption
                  active={filterStatus === LeadStatus.NEW}
                  onClick={() => setFilterStatus(LeadStatus.NEW)}
                  label="Novas Descobertas"
                  count={leads.filter(l => l.status === LeadStatus.NEW).length}
                  icon={<Zap size={12} />}
                />
                <FilterOption
                  active={filterStatus === LeadStatus.ENRICHED}
                  onClick={() => setFilterStatus(LeadStatus.ENRICHED)}
                  label="Enriquecidos com IA"
                  count={leads.filter(l => l.status === LeadStatus.ENRICHED).length}
                  icon={<Sparkles size={12} />}
                  color="magenta"
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
                    onClick={() => setSelectedNiche(selectedNiche === industry ? null : industry)}>
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

            {/* Location Filter (Simplified for Drawer) */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin size={10} /> Regiões Ativas
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(leads.map(l => l.location.split(',')[1]?.trim() || 'BR'))).slice(0, 8).map(uf => (
                  <button
                    key={uf}
                    onClick={() => setSelectedLocation(selectedLocation === uf ? null : uf)}
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
          <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FlaskConical size={64} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Capturado</p>
            <div className="text-3xl font-black text-white">{leads.length}</div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Base Bruta
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={64} />
            </div>
            <p className="text-magenta-500/80 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Enriquecidos (IA)</p>
            <div className="text-3xl font-black text-white">{leads.filter(l => l.status === LeadStatus.ENRICHED).length}</div>
            <div className="text-[10px] text-magenta-500/60 mt-2 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-pulse"></span> Dados Completos
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={64} />
            </div>
            <p className="text-cyan-500/80 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Novos (Fila)</p>
            <div className="text-3xl font-black text-white">{leads.filter(l => l.status === LeadStatus.NEW).length}</div>
            <div className="text-[10px] text-cyan-500/60 mt-2 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Aguardando Processamento
            </div>
          </div>
        </div>

        {/* Dynamic Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-5">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Laboratório</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] font-bold">{filteredLeads.length} de {leads.length} Filtrados</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {leads.some(l => l.status === LeadStatus.NEW) && (
              <div className="relative">
                <button
                  onClick={() => setIsEnrichMenuOpen(!isEnrichMenuOpen)}
                  disabled={isEnriching}
                  className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-magenta-500 to-primary text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-magenta-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isEnriching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isEnriching ? 'Processando...' : 'Enriquecer com IA'}
                  {!isEnriching && <ChevronDown size={14} className={`transition-transform ${isEnrichMenuOpen ? 'rotate-180' : ''}`} />}
                </button>

                {isEnrichMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 w-64 glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <button
                      onClick={() => {
                        const allNewLeads = leads.filter(l => l.status === LeadStatus.NEW);
                        onBulkEnrich(allNewLeads);
                        setIsEnrichMenuOpen(false);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5"
                    >
                      <Layers size={16} className="text-primary" />
                      <div>
                        <div className="text-white font-bold text-xs uppercase tracking-wider">Toda a Fila</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{leads.filter(l => l.status === LeadStatus.NEW).length} leads aguardando</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const filteredNewLeads = filteredLeads.filter(l => l.status === LeadStatus.NEW);
                        onBulkEnrich(filteredNewLeads);
                        setIsEnrichMenuOpen(false);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <Filter size={16} className="text-magenta-500" />
                      <div>
                        <div className="text-white font-bold text-xs uppercase tracking-wider">Apenas Filtro Atual</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{filteredLeads.filter(l => l.status === LeadStatus.NEW).length} leads visíveis</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative group">
              <input
                type="text"
                placeholder="Buscar amostra..."
                className="bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-64 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none text-white transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-4 w-5 h-5 text-slate-600 group-focus-within:text-primary transition-colors" />
            </div>

            <button className="p-4 glass rounded-2xl text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-xl">
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Experimental Data Grid */}
        <div className="flex-1 glass rounded-[2.5rem] overflow-hidden border border-white/5 flex flex-col shadow-2xl min-h-0">
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-md">
                <tr className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.25em]">
                  <th className="px-10 py-6 font-black border-b border-white/5">Amostra / Razão Social</th>
                  <th className="px-10 py-6 font-black border-b border-white/5">Localização</th>
                  <th className="px-10 py-6 font-black border-b border-white/5">Status</th>
                  <th className="px-10 py-6 font-black border-b border-white/5">Atualização</th>
                  <th className="px-10 py-6 font-black border-b border-white/5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-white/[0.02] transition-all relative">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className={`w-3 h-3 rounded-full ${lead.status === LeadStatus.ENRICHED ? 'bg-magenta-500 shadow-[0_0_12px_#d946ef]' : 'bg-cyan-500 shadow-[0_0_12px_#06b6d4]'} transition-all group-hover:scale-125`}></div>
                        <div>
                          <div className="font-bold text-white text-base group-hover:text-primary transition-colors leading-tight">
                            {lead.details?.tradeName || lead.name}
                          </div>
                          {lead.socialLinks?.cnpj ? (
                            <div className="text-[10px] text-primary/60 font-mono mt-1 flex items-center gap-1.5">
                              <Database size={10} /> {lead.socialLinks.cnpj}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-600 font-mono mt-1">ID: {lead.id.slice(0, 8)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-300 font-semibold text-xs">{lead.location}</span>
                        <div className="text-[10px] text-slate-500">
                          {lead.industry}
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${lead.status === LeadStatus.ENRICHED
                        ? 'border-magenta-500/30 text-magenta-400 bg-magenta-500/5'
                        : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5'
                        }`}>
                        {lead.status === LeadStatus.ENRICHED ? <Sparkles size={10} /> : <Zap size={10} fill="currentColor" />}
                        {lead.status === LeadStatus.ENRICHED ? 'COMPLETO' : 'NOVO'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-[10px] text-slate-500 font-mono">
                      {new Date(lead.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            const clean = lead.phone?.replace(/\D/g, '');
                            if (!clean) return;

                            const ddi = clean.startsWith('55') ? '' : '55';
                            const fullPhone = `${ddi}${clean}`;

                            // Smart Outreach Logic
                            const hour = new Date().getHours();
                            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
                            const company = lead.details?.tradeName || lead.name;
                            const city = lead.location.split(',')[0];

                            let message = '';

                            if (lead.status === LeadStatus.ENRICHED && lead.aiInsights) {
                              // Mensagem Hiper-Personalizada (IA)
                              message = `${greeting}, tudo bem na ${company}?\n\nVi aqui que vocês tem uma presença forte em ${city}. ${lead.aiInsights.split('.')[0]}.\n\nAchei interessante e queria conversar sobre uma oportunidade de parceria. Podemos falar?`;
                            } else {
                              // Mensagem Contextual (Padrão)
                              message = `${greeting}! Vi que a ${company} é referência em ${lead.industry} aqui em ${city}.\n\nGostaria de apresentar uma solução ideal para o seu perfil. Tem um minuto?`;
                            }

                            window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                        >
                          <MessageCircle size={16} fill="currentColor" fillOpacity={0.2} />
                        </button>
                        <button
                          onClick={() => onEnrich(lead)}
                          className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-slate-900 rounded-lg transition-all"
                        >
                          <FlaskConical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                <Search className="w-6 h-6 text-slate-700" />
              </div>
              <h4 className="text-xl font-black text-white mb-2 tracking-tight">Filtro Vazio</h4>
              <p className="text-slate-500 max-w-xs text-xs">Nenhum lead encontrado com os critérios selecionados na gaveta.</p>
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
        <div className={`p-1.5 rounded-lg ${active ? color === 'magenta' ? 'bg-magenta-500 text-white' : 'bg-primary text-slate-900' : 'bg-white/5 text-slate-500'}`}>
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
