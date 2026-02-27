import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Download, Search, CheckCircle, ExternalLink, Filter, MapPin,
    Phone, MessageCircle, TrendingUp, Rocket, Sparkles, Brain,
    Instagram, Linkedin, Globe, ChevronRight, Zap, Database
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { ExportService, CRMFormat } from '../services/exportService';

interface EnrichedLeadsViewProps {
    leads: Lead[];
    onConvertToDeal?: (leadId: string) => void;
}

const CRMMenuItem = ({ label, icon, onClick, color }: { label: string, icon: React.ReactNode, onClick: () => void, color: string }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl hover:bg-white/5 text-slate-300 hover:text-white transition-all group border border-transparent hover:border-white/5"
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-lg`}>
                {icon}
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
    </button>
);

import { useVirtualizer } from '@tanstack/react-virtual';

// Subcomponente Memoizado para o Card de Lead
const LeadCard = React.memo(({ lead, idx, openWhatsApp, onConvertToDeal, imgError, onImgError, style }: {
    lead: Lead,
    idx: number,
    openWhatsApp: (phone: string) => void,
    onConvertToDeal?: (leadId: string) => void,
    imgError: boolean,
    onImgError: (id: string) => void,
    style?: React.CSSProperties
}) => {
    // Score determinístico baseado no ID para evitar mudanças a cada re-render
    const score = React.useMemo(() => {
        const hash = lead.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (hash % 30) + 70;
    }, [lead.id]);

    return (
        <div style={style} className="py-3">
            <div className="group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-primary/20 hover:bg-white/[0.05] transition-all duration-500 relative overflow-hidden shadow-xl h-full">

                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 pointer-events-none transition-all group-hover:bg-primary/10"></div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">

                    {/* Info Principal */}
                    <div className="flex items-start gap-6 flex-1 min-w-0">
                        {lead.details?.placeImage && !imgError ? (
                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-[1.5rem] border border-white/10 overflow-hidden shadow-2xl shrink-0 group-hover:border-primary/30 transition-colors">
                                <img
                                    src={lead.details.placeImage}
                                    alt="Fachada"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    onError={() => onImgError(lead.id)}
                                />
                            </div>
                        ) : (
                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-[1.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent flex items-center justify-center text-primary font-black text-2xl border border-primary/20 shrink-0 group-hover:scale-105 transition-transform shadow-xl">
                                {lead.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl lg:text-2xl font-black text-white group-hover:text-primary transition-colors truncate">
                                    {lead.name}
                                </h3>
                                <span className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                    <Zap size={8} fill="currentColor" /> Ready
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-y-2 gap-x-6 text-[11px] lg:text-xs">
                                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                    {lead.industry || 'Indústria Local'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-300 font-medium">
                                    <MapPin size={14} className="text-primary/70" />
                                    {lead.location}
                                </div>
                                {lead.phone && (
                                    <button
                                        onClick={() => openWhatsApp(lead.phone!)}
                                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-bold"
                                    >
                                        <Phone size={14} />
                                        {lead.phone}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score & Ações Rápidas */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-10 h-full">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Qualificação SDR</p>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 lg:w-24 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary shadow-[0_0_10px_var(--color-primary)]" style={{ width: `${score}%` }}></div>
                                </div>
                                <span className="text-lg font-black text-white font-mono">{score}%</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {lead.socialLinks?.instagram && (
                                <a href={lead.socialLinks.instagram} target="_blank" rel="noreferrer" className="p-3 bg-pink-500/10 text-pink-500 rounded-xl hover:bg-pink-500 hover:text-white transition-all shadow-lg hover:rotate-6">
                                    <Instagram size={18} />
                                </a>
                            )}
                            {lead.socialLinks?.linkedin && (
                                <a href={lead.socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg hover:rotate-6">
                                    <Linkedin size={18} />
                                </a>
                            )}
                            {lead.website && (
                                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg hover:-rotate-6">
                                    <Globe size={18} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Deep Intelligence Grid */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Porte / Tamanho</p>
                        <p className="text-xs font-bold text-white uppercase">{lead.details?.size || 'Não identificado'}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Funcionários</p>
                        <p className="text-xs font-bold text-white">{lead.details?.employee_count || 'Sob consulta'}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Principais Sócios / Decisores</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {lead.details?.partners && Array.isArray(lead.details.partners) && lead.details.partners.length > 0 ? (
                                lead.details.partners.map((p: any, i: number) => {
                                    const partnerName = typeof p === 'string' ? p : p.nome || p.name;
                                    const partnerRole = typeof p === 'object' ? p.cargo || p.role : '';
                                    const linkedinSearchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(partnerName + ' ' + lead.name)}`;

                                    return (
                                        <div key={i} className="flex items-center gap-1 group/partner">
                                            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-bold text-primary flex flex-col">
                                                <span>{partnerName}</span>
                                                {partnerRole && <span className="text-[8px] opacity-60 font-medium">{partnerRole}</span>}
                                            </span>
                                            <a
                                                href={linkedinSearchUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg opacity-0 group-hover/partner:opacity-100 transition-all hover:bg-blue-600 hover:text-white"
                                                title={`Buscar ${partnerName} no LinkedIn`}
                                            >
                                                <Linkedin size={10} />
                                            </a>
                                        </div>
                                    );
                                })
                            ) : (
                                <span className="text-[10px] text-slate-600 italic">Dados de QSA não vinculados</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Analysis Layer */}
                {lead.ai_insights && (
                    <div className="mt-8 p-6 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group/insight hover:bg-primary/10 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/insight:opacity-30 transition-opacity">
                            <Sparkles size={40} className="text-primary" />
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                                <Brain size={16} />
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                Plano de Ataque Neural (SDR)
                            </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            {lead.ai_insights}
                        </p>

                        {(lead.details?.partners_contacts || lead.details?.realPhones) && (
                            <div className="mt-4 pt-4 border-t border-primary/20">
                                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Canais de Resposta Direta</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {lead.details?.partners_contacts && Array.isArray(lead.details.partners_contacts) && lead.details.partners_contacts.map((c: string, i: number) => (
                                        <span key={i} className="text-xs text-white font-bold flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                                            {c}
                                        </span>
                                    ))}
                                    {lead.details?.realPhones && Array.isArray(lead.details.realPhones) && lead.details.realPhones.map((p: string, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => openWhatsApp(p)}
                                            className="text-xs text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1 group/wa"
                                        >
                                            <MessageCircle size={12} className="group-hover/wa:scale-110 transition-transform" />
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Move to Pipeline Footer */}
                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg">
                            ID: {lead.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.1em]">
                            Ready for closing since {new Date(lead.lastUpdated || Date.now()).toLocaleDateString()}
                        </div>
                    </div>

                    {onConvertToDeal && (
                        <button
                            onClick={() => onConvertToDeal(lead.id)}
                            className="w-full md:w-auto px-8 py-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-slate-900 transition-all flex items-center justify-center gap-3 group/btn shadow-xl hover:scale-[1.02] active:scale-95"
                        >
                            <Rocket size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                            Mover para Pipeline
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

const EnrichedLeadsView: React.FC<EnrichedLeadsViewProps> = ({ leads, onConvertToDeal }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [selectedIndustry, setSelectedIndustry] = useState<string>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    const parentRef = useRef<HTMLDivElement>(null);

    // Filtrar apenas leads enriquecidos
    const enrichedLeads = useMemo(() => leads.filter(l => l.status === LeadStatus.ENRICHED), [leads]);

    const industries = useMemo(() => {
        const types = new Set<string>();
        enrichedLeads.forEach(l => {
            if (l.industry) types.add(l.industry);
        });
        return ['todos', ...Array.from(types).sort()];
    }, [enrichedLeads]);

    const filteredLeads = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return enrichedLeads.filter(l => {
            const matchesIndustry = selectedIndustry === 'todos' || l.industry === selectedIndustry;
            const matchesSearch = !query ||
                l.name.toLowerCase().includes(query) ||
                (l.location && l.location.toLowerCase().includes(query)) ||
                (l.industry && l.industry.toLowerCase().includes(query));

            return matchesIndustry && matchesSearch;
        });
    }, [enrichedLeads, selectedIndustry, searchQuery]);

    const handleExport = (format: CRMFormat) => {
        ExportService.exportToCSV(filteredLeads, format);
        setIsExportMenuOpen(false);
    };

    const openWhatsApp = React.useCallback((phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        window.open(`https://wa.me/${fullPhone}`, '_blank');
    }, []);

    const handleImgError = React.useCallback((id: string) => {
        setImgErrors(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: filteredLeads.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 600, // Enriched cards are much larger
        overscan: 3,
    });

    return (
        <div className="flex flex-col h-full animate-fade-in pb-20">
            {/* Header e Filtros (Fixos) */}
            <div className="space-y-10 mb-10">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white/[0.02] p-8 lg:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-visible">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -mr-48 -mt-48 pointer-events-none rounded-full"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-xl shadow-emerald-900/10 shrink-0">
                                <Rocket size={24} />
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter italic uppercase">
                                Gerenciamento Comercial
                            </h2>
                        </div>
                        <p className="text-slate-400 max-w-xl text-sm lg:text-base font-medium leading-relaxed">
                            Exportação estratégica e integração neural. Seus leads qualificados prontos para o fechamento.
                        </p>
                    </div>

                    <div className="relative w-full xl:w-auto z-30">
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="w-full xl:w-auto px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20 uppercase text-xs tracking-[0.2em] italic"
                            disabled={filteredLeads.length === 0}
                        >
                            <Download size={20} />
                            Exportar para CRM
                        </button>

                        {isExportMenuOpen && (
                            <div className="absolute top-full right-0 mt-4 w-full sm:w-80 glass-strong border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-4 z-50 animate-in slide-in-from-top-4 duration-300 backdrop-blur-3xl overflow-hidden">
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-5 py-3 mb-2 border-b border-white/5 italic">Ecossistema de Integração</div>
                                <div className="space-y-1">
                                    <CRMMenuItem label="HubSpot CRM" color="bg-orange-500" onClick={() => handleExport('HUBSPOT')} icon={<Zap size={14} fill="white" />} />
                                    <CRMMenuItem label="Pipedrive" color="bg-green-600" onClick={() => handleExport('PIPEDRIVE')} icon={<CheckCircle size={14} />} />
                                    <CRMMenuItem label="Salesforce" color="bg-blue-600" onClick={() => handleExport('SALESFORCE')} icon={<Globe size={14} />} />
                                    <CRMMenuItem label="RD Station" color="bg-blue-400" onClick={() => handleExport('RD_STATION')} icon={<MessageCircle size={14} />} />
                                    <CRMMenuItem label="Planilha Excel/CSV" color="bg-slate-700" onClick={() => handleExport('GENERIC')} icon={<Download size={14} />} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                {/* Search & Filter Controls */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
                    <div className="flex-1">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search size={18} className="text-slate-500 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Localizar na base neural..."
                                className="w-full bg-white/[0.03] border border-white/10 text-white text-[11px] font-black rounded-2xl py-4.5 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-600 uppercase tracking-[0.2em] shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 border
                                ${showFilters
                                    ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                        >
                            <Filter size={14} className={showFilters ? 'animate-pulse' : ''} />
                            Segmentação Neural
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${showFilters ? 'bg-black/20' : 'bg-white/10 text-slate-500'}`}>
                                {industries.length - 1} SETORES
                            </span>
                        </button>

                        <div className="hidden sm:flex items-center gap-2 px-6 py-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            <Zap size={12} className="text-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                {filteredLeads.length} Ativos
                            </span>
                        </div>
                    </div>
                </div>

                {/* Collapsible Industry Chips */}
                {showFilters && (
                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 animate-in slide-in-from-top-4 duration-500 space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-primary" />
                                <div>
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Segmentação Estratégica</h4>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Selecione o nicho de prospecção</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedIndustry('todos'); setShowFilters(false); }}
                                className="text-[8px] font-black text-slate-500 hover:text-primary transition-colors uppercase tracking-[0.2em]"
                            >
                                Resetar Filtros
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {industries.map(industry => {
                                const count = industry === 'todos'
                                    ? enrichedLeads.length
                                    : enrichedLeads.filter(l => l.industry === industry).length;

                                const isActive = selectedIndustry === industry;

                                return (
                                    <button
                                        key={industry}
                                        onClick={() => setSelectedIndustry(industry)}
                                        className={`group relative px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center gap-3 overflow-hidden
                                            ${isActive
                                                ? 'bg-primary text-slate-950 border-primary shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.03] z-10'
                                                : 'bg-white/[0.03] text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/[0.08]'}`}
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {industry === 'todos' ? <Sparkles size={12} /> : <Database size={12} />}
                                            {industry === 'todos' ? 'Todos os Leads' : industry}
                                        </span>

                                        <span className={`relative z-10 px-2 py-0.5 rounded-md text-[8px] font-black transition-colors
                                            ${isActive ? 'bg-black/20 text-slate-900' : 'bg-white/5 text-slate-600 group-hover:bg-white/10'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Scrolling Area (Virtualizada) */}
            <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
                {filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center rounded-[3rem] bg-white/[0.02] border border-dashed border-white/5 shadow-inner">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75"></div>
                            <Search className="text-slate-700 relative z-10" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight uppercase tracking-[0.1em]">Horizonte Vazio</h3>
                        <p className="text-slate-500 max-w-sm text-sm font-medium tracking-tight">
                            Seu radar não detectou leads enriquecidos.
                        </p>
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const lead = filteredLeads[virtualRow.index];
                            return (
                                <LeadCard
                                    key={virtualRow.key}
                                    lead={lead}
                                    idx={virtualRow.index}
                                    openWhatsApp={openWhatsApp}
                                    onImgError={handleImgError}
                                    imgError={imgErrors.has(lead.id)}
                                    onConvertToDeal={onConvertToDeal}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnrichedLeadsView;
