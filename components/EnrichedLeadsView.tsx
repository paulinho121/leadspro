
import React, { useState } from 'react';
import { Download, Search, CheckCircle, ExternalLink, Filter, MapPin, Phone, MessageCircle } from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { ExportService, CRMFormat } from '../services/exportService';

interface EnrichedLeadsViewProps {
    leads: Lead[];
}

const CRMMenuItem = ({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-all text-xs font-bold text-left group"
    >
        <span className="opacity-40 group-hover:opacity-100 transition-opacity">{icon}</span>
        {label}
    </button>
);

const EnrichedLeadsView: React.FC<EnrichedLeadsViewProps> = ({ leads }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [selectedIndustry, setSelectedIndustry] = useState<string>('todos');

    // Filtrar apenas leads enriquecidos
    const enrichedLeads = leads.filter(l => l.status === LeadStatus.ENRICHED);

    // Mapear indústrias únicas para o filtro
    const industries = React.useMemo(() => {
        const types = new Set<string>();
        enrichedLeads.forEach(l => {
            if (l.industry) types.add(l.industry);
        });
        return ['todos', ...Array.from(types).sort()];
    }, [enrichedLeads]);

    // Filtrar por indústria selecionada
    const filteredLeads = selectedIndustry === 'todos'
        ? enrichedLeads
        : enrichedLeads.filter(l => l.industry === selectedIndustry);

    const handleExport = (format: CRMFormat) => {
        ExportService.exportToCSV(filteredLeads, format); // Exporta apenas o filtro atual se desejar, ou manter enrichedLeads
        setIsExportMenuOpen(false);
    };

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                            Gerenciamento Comercial
                        </span>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            {filteredLeads.length} de {enrichedLeads.length} Leads Prontos
                        </span>
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">
                        Baixe, filtre e integre seus leads qualificados diretamente no seu CRM favorito.
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black flex items-center gap-3 transition-all hover:scale-105 shadow-[0_10px_30px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:hover:scale-100 uppercase text-xs tracking-widest"
                        disabled={filteredLeads.length === 0}
                    >
                        <Download size={20} />
                        Exportar para CRM
                    </button>

                    {isExportMenuOpen && (
                        <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-2 mb-2 border-b border-white/5">Selecione o Formato</div>
                            <CRMMenuItem label="HubSpot CRM" onClick={() => handleExport('HUBSPOT')} icon={<div className="w-2 h-2 rounded-full bg-orange-500" />} />
                            <CRMMenuItem label="Pipedrive" onClick={() => handleExport('PIPEDRIVE')} icon={<div className="w-2 h-2 rounded-full bg-green-500" />} />
                            <CRMMenuItem label="Salesforce" onClick={() => handleExport('SALESFORCE')} icon={<div className="w-2 h-2 rounded-full bg-blue-500" />} />
                            <CRMMenuItem label="RD Station / Kommo" onClick={() => handleExport('RD_STATION')} icon={<div className="w-2 h-1 rounded-full bg-blue-400" />} />
                            <CRMMenuItem label="Brevo (Sendinblue)" onClick={() => handleExport('BREVO')} icon={<div className="w-2 h-2 rounded-full bg-cyan-500" />} />
                            <CRMMenuItem label="Planilha Padrão (CSV)" onClick={() => handleExport('GENERIC')} icon={<Download size={12} />} />
                        </div>
                    )}
                </div>
            </div>

            {/* Category Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 mr-4 px-3 py-2 border-r border-white/10 shrink-0">
                    <Filter size={16} className="text-slate-500" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Filtrar por Setor:</span>
                </div>
                {industries.map(industry => (
                    <button
                        key={industry}
                        onClick={() => setSelectedIndustry(industry)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0
                            ${selectedIndustry === industry
                                ? 'bg-primary text-slate-900 border-primary shadow-[0_5px_15px_rgba(6,182,212,0.3)]'
                                : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10 hover:bg-white/[0.08]'}`}
                    >
                        {industry === 'todos' ? '🎯 Todos os Tipos' : industry}
                    </button>
                ))}
            </div>

            {/* Leads Grid */}
            {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Filter className="text-slate-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum Lead Encontrado</h3>
                    <p className="text-slate-400 max-w-md">
                        Não existem leads para a categoria selecionada neste momento.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredLeads.map((lead, idx) => (
                        <div key={lead.id || idx} className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                {lead.phone && (
                                    <button
                                        onClick={() => openWhatsApp(lead.phone!)}
                                        className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"
                                        title="Abrir WhatsApp"
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                )}
                                {lead.website && (
                                    <a
                                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                )}
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg border border-emerald-500/20">
                                    {lead.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                                        {lead.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-slate-400">
                                        {lead.industry && (
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                {lead.industry}
                                            </span>
                                        )}
                                        {lead.location && (
                                            <span className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-primary" />
                                                {lead.location}
                                            </span>
                                        )}
                                        {lead.phone && (
                                            <span className="flex items-center gap-1.5 text-slate-300">
                                                <Phone size={12} className="text-emerald-500" />
                                                {lead.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {lead.ai_insights && (
                                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></span>
                                            AI Insight
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {lead.ai_insights}
                                    </p>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex gap-2">
                                    {lead.socialLinks?.instagram && (
                                        <a href={lead.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 text-xs hover:underline flex items-center gap-1">Instagram</a>
                                    )}
                                    {lead.socialLinks?.linkedin && (
                                        <a href={lead.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1">LinkedIn</a>
                                    )}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-600">
                                    Enriquecido em: {new Date(lead.lastUpdated || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EnrichedLeadsView;
