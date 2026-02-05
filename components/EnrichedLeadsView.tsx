
import React, { useState } from 'react';
import { Download, Search, CheckCircle, ExternalLink, Filter, MapPin, Phone, MessageCircle } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface EnrichedLeadsViewProps {
    leads: Lead[];
}

const EnrichedLeadsView: React.FC<EnrichedLeadsViewProps> = ({ leads }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar apenas leads enriquecidos e aplicar busca
    const enrichedLeads = leads.filter(l =>
        l.status === LeadStatus.ENRICHED &&
        (l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.location?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleExportCSV = () => {
        if (enrichedLeads.length === 0) return;

        // Cabeçalhos
        const headers = ['Nome', 'Website', 'Telefone', 'Setor', 'Localização', 'Insights IA', 'Instagram', 'Facebook', 'LinkedIn'];

        // Dados
        const rows = enrichedLeads.map(lead => [
            `"${lead.name.replace(/"/g, '""')}"`,
            lead.website || '',
            lead.phone || '',
            lead.industry || '',
            lead.location || '',
            `"${(lead.aiInsights || '').replace(/"/g, '""')}"`,
            lead.socialLinks?.instagram || '',
            lead.socialLinks?.facebook || '',
            lead.socialLinks?.linkedin || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'leads_enriquecidos.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
                            Gerenciamento Comercial
                        </span>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            {enrichedLeads.length} Leads Prontos
                        </span>
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">
                        Baixe, filtre e entre em contato com seus leads qualificados e enriquecidos pela IA.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                        disabled={enrichedLeads.length === 0}
                    >
                        <Download size={18} />
                        Exportar Planilha
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por empresa, setor ou cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold px-4">
                    <Filter size={16} />
                    <span>Filtros Automáticos:</span>
                    <span className="px-2 py-1 rounded bg-white/5 text-white">Status: Enriquecido</span>
                </div>
            </div>

            {/* Leads Grid */}
            {enrichedLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Filter className="text-slate-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum Lead Enriquecido Encontrado</h3>
                    <p className="text-slate-400 max-w-md">
                        Vá até o "Laboratório de Leads" e execute o enriquecimento com IA para popular esta lista.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {enrichedLeads.map((lead, idx) => (
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

                            {lead.aiInsights && (
                                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></span>
                                            AI Insight
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {lead.aiInsights}
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
