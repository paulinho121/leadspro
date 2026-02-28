import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, X, Loader2, Phone, MapPin, MessageCircle,
    FlaskConical, Archive, Ban, Building2, Sparkles, Zap,
    ArrowUp, ArrowDown, CornerDownLeft, Hash
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { useLeadSearch, SearchResult } from '../hooks/useLeadSearch';

interface LeadSearchPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    onEnrich: (lead: Lead) => void;
    onPark: (id: string) => void;
    onDiscard: (id: string) => void;
}

// Destaca o trecho que casou com a query
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query || !text) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-primary/30 text-primary rounded px-0.5 not-italic">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
};

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
    if (status === LeadStatus.ENRICHED)
        return <span className="flex items-center gap-1 text-[8px] font-black text-primary uppercase tracking-widest"><Sparkles size={8} /> Neural</span>;
    if (status === LeadStatus.PARKED)
        return <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase tracking-widest"><Archive size={8} /> Pausa</span>;
    if (status === LeadStatus.DISCARDED)
        return <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase tracking-widest"><Ban size={8} /> Descartado</span>;
    return <span className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase tracking-widest"><Zap size={8} /> Raw</span>;
};

const LeadSearchPalette: React.FC<LeadSearchPaletteProps> = ({
    isOpen, onClose, tenantId, onEnrich, onPark, onDiscard
}) => {
    const { query, setQuery, results, isSearching, clear } = useLeadSearch(tenantId);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Foca o input ao abrir
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setActiveIndex(0);
        } else {
            clear();
        }
    }, [isOpen]);

    // Reset active index quando resultados mudam
    useEffect(() => { setActiveIndex(0); }, [results]);

    // Scroll automático do item ativo
    useEffect(() => {
        const item = listRef.current?.children[activeIndex] as HTMLElement | undefined;
        item?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { onClose(); return; }
        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            onEnrich(results[activeIndex]);
            onClose();
        }
    }, [results, activeIndex, onEnrich, onClose]);

    const openWhatsApp = (lead: SearchResult) => {
        const clean = (lead.phone || '').replace(/\D/g, '');
        if (!clean) return;
        const full = clean.startsWith('55') ? clean : `55${clean}`;
        const name = lead.details?.tradeName || lead.name;
        window.open(`https://wa.me/${full}?text=${encodeURIComponent(`Olá ${name}!`)}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh] px-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

            {/* Palette */}
            <div
                className="relative w-full max-w-2xl glass-strong border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Input Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
                    {isSearching
                        ? <Loader2 size={18} className="text-primary animate-spin shrink-0" />
                        : <Search size={18} className="text-primary shrink-0" />
                    }
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar lead por nome, empresa, cidade, telefone..."
                        className="flex-1 bg-transparent text-white text-base placeholder-slate-600 outline-none font-medium"
                    />
                    {query && (
                        <button onClick={() => { clear(); inputRef.current?.focus(); }} className="text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    )}
                    <kbd className="hidden sm:flex items-center gap-1 text-[9px] text-slate-600 border border-white/10 rounded-lg px-2 py-1 font-mono">
                        ESC
                    </kbd>
                </div>

                {/* Status line */}
                {query.length >= 2 && (
                    <div className="px-6 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">
                            {isSearching ? 'Buscando em toda a base...' : results.length === 0 ? 'Nenhum resultado' : `${results.length} lead(s) encontrado(s) — busca no banco completo`}
                        </span>
                        <div className="flex items-center gap-2 text-slate-700">
                            <ArrowUp size={10} />
                            <ArrowDown size={10} />
                            <span className="text-[8px]">navegar</span>
                            <CornerDownLeft size={10} className="ml-2" />
                            <span className="text-[8px]">enriquecer</span>
                        </div>
                    </div>
                )}

                {/* Empty prompt */}
                {query.length < 2 && (
                    <div className="py-12 flex flex-col items-center gap-4 text-center">
                        <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-600 font-black uppercase tracking-widest px-8">
                            {[
                                { icon: <Building2 size={14} />, label: 'Nome da empresa' },
                                { icon: <MapPin size={14} />, label: 'Cidade / Estado' },
                                { icon: <Hash size={14} />, label: 'Telefone' },
                            ].map(({ icon, label }) => (
                                <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                                    <span className="text-primary">{icon}</span>
                                    {label}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Digite pelo menos 2 caracteres para buscar</p>
                    </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div ref={listRef} className="max-h-[420px] overflow-y-auto custom-scrollbar py-2">
                        {results.map((lead, idx) => (
                            <div
                                key={lead.id}
                                className={`group flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${idx === activeIndex
                                        ? 'bg-primary/8 border-l-2 border-primary'
                                        : 'border-l-2 border-transparent hover:bg-white/[0.03]'
                                    }`}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => { onEnrich(lead); onClose(); }}
                            >
                                {/* Avatar / Status dot */}
                                <div className="shrink-0">
                                    {lead.details?.placeImage ? (
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                                            <img src={lead.details.placeImage} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${lead.status === LeadStatus.ENRICHED
                                                ? 'bg-primary/10 border-primary/20 text-primary'
                                                : 'bg-white/5 border-white/5 text-slate-600'
                                            }`}>
                                            <Building2 size={16} />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-white truncate">
                                            <Highlight text={lead.details?.tradeName || lead.name} query={query} />
                                        </span>
                                        <StatusBadge status={lead.status} />
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                        {lead.location && (
                                            <span className="flex items-center gap-1 truncate">
                                                <MapPin size={9} className="text-primary/50 shrink-0" />
                                                <Highlight text={lead.location} query={query} />
                                            </span>
                                        )}
                                        {lead.industry && (
                                            <span className="truncate opacity-60">
                                                <Highlight text={lead.industry} query={query} />
                                            </span>
                                        )}
                                    </div>
                                    {lead.phone && (
                                        <div className="text-[9px] text-slate-600 font-mono mt-0.5">
                                            <Highlight text={lead.phone} query={query} />
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions — visíveis no hover / item ativo */}
                                <div className={`flex items-center gap-1.5 transition-opacity ${idx === activeIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}>
                                    {lead.phone && (
                                        <button
                                            onClick={e => { e.stopPropagation(); openWhatsApp(lead); }}
                                            className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                            title="WhatsApp"
                                        >
                                            <MessageCircle size={12} />
                                        </button>
                                    )}
                                    <button
                                        onClick={e => { e.stopPropagation(); onEnrich(lead); onClose(); }}
                                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-slate-900 rounded-xl transition-all"
                                        title="Abrir / Enriquecer"
                                    >
                                        <FlaskConical size={12} />
                                    </button>
                                    {lead.status !== LeadStatus.PARKED && (
                                        <button
                                            onClick={e => { e.stopPropagation(); onPark(lead.id); onClose(); }}
                                            className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-900 rounded-xl transition-all"
                                            title="Mover para Admin"
                                        >
                                            <Archive size={12} />
                                        </button>
                                    )}
                                    {lead.status !== LeadStatus.DISCARDED && (
                                        <button
                                            onClick={e => { e.stopPropagation(); onDiscard(lead.id); onClose(); }}
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                            title="Descartar"
                                        >
                                            <Ban size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[8px] text-slate-700 uppercase tracking-widest font-black">
                        Laboratório Neural — Busca Inteligente
                    </span>
                    <div className="flex items-center gap-3 text-[8px] text-slate-700">
                        <span>Ctrl+K para abrir</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadSearchPalette;
