import React, { useState, useMemo, useCallback } from 'react';
import {
    Archive, Trash2, RotateCcw, Search, Filter,
    MapPin, Phone, Globe, MessageCircle, Mail,
    Building2, ChevronDown, AlertTriangle, Check,
    X, FlaskConical, Inbox, Ban, MoreVertical, Sparkles, TrendingUp
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

interface LeadAdminViewProps {
    leads: Lead[];
    onRefetch: () => void;
    onRestoreToLab: (leadId: string) => void;
    onPermanentDelete: (leadId: string) => void;
    onConvertToDeal?: (leadId: string) => void;
    userTenantId?: string;
}

type AdminTab = 'parked' | 'discarded';

const LeadAdminView: React.FC<LeadAdminViewProps> = ({
    leads, onRefetch, onRestoreToLab, onPermanentDelete, onConvertToDeal, userTenantId
}) => {
    const [activeSection, setActiveSection] = useState<AdminTab>('parked');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const parkedLeads = useMemo(() =>
        leads.filter(l => l.status === LeadStatus.PARKED), [leads]);

    const discardedLeads = useMemo(() =>
        leads.filter(l => l.status === LeadStatus.DISCARDED), [leads]);

    const displayed = useMemo(() => {
        const base = activeSection === 'parked' ? parkedLeads : discardedLeads;
        if (!search.trim()) return base;
        const s = search.toLowerCase();
        return base.filter(l =>
            (l.name || '').toLowerCase().includes(s) ||
            (l.industry || '').toLowerCase().includes(s) ||
            (l.location || '').toLowerCase().includes(s)
        );
    }, [activeSection, parkedLeads, discardedLeads, search]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === displayed.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayed.map(l => l.id)));
        }
    };

    const updateStatus = useCallback(async (ids: string[], newStatus: LeadStatus) => {
        if (!userTenantId || ids.length === 0) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ status: newStatus })
                .in('id', ids)
                .eq('tenant_id', userTenantId);
            if (error) throw error;
            onRefetch();
            setSelectedIds(new Set());
        } catch (err: any) {
            toast.error('Erro ao atualizar', err.message);
        } finally {
            setIsProcessing(false);
        }
    }, [userTenantId, onRefetch]);

    const handlePermanentDelete = useCallback(async (ids: string[]) => {
        if (!userTenantId || ids.length === 0) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .in('id', ids)
                .eq('tenant_id', userTenantId);
            if (error) throw error;
            toast.success('Excluído permanentemente', `${ids.length} lead(s) removido(s).`);
            onRefetch();
            setSelectedIds(new Set());
            setConfirmDelete(null);
        } catch (err: any) {
            toast.error('Erro ao excluir', err.message);
        } finally {
            setIsProcessing(false);
        }
    }, [userTenantId, onRefetch]);

    const openWhatsApp = (phone: string, name: string) => {
        const clean = phone.replace(/\D/g, '');
        const full = clean.startsWith('55') ? clean : `55${clean}`;
        window.open(`https://wa.me/${full}?text=${encodeURIComponent(`Olá ${name}! Gostaria de retomar nosso contato.`)}`, '_blank');
    };

    const tabs: { id: AdminTab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
        { id: 'parked', label: 'Leads em Pausa', icon: <Archive size={16} />, count: parkedLeads.length, color: 'amber' },
        { id: 'discarded', label: 'Descartados', icon: <Ban size={16} />, count: discardedLeads.length, color: 'red' },
    ];

    return (
        <div className="flex flex-col gap-6 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-12 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] hidden xl:block" />
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter flex items-center gap-4">
                            Administração de Leads
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 uppercase tracking-[0.2em]">
                                {parkedLeads.length + discardedLeads.length} total
                            </span>
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">
                            Gerencie leads pausados, descartados e restaurações
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-72">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar lead..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-primary/40 focus:bg-white/8 transition-all"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveSection(tab.id); setSelectedIds(new Set()); }}
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-sm border transition-all ${activeSection === tab.id
                                ? tab.color === 'amber'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${activeSection === tab.id ? 'bg-white/10 text-white' : 'bg-white/5'
                            }`}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 p-4 glass border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <span className="text-[11px] font-black text-primary uppercase tracking-widest">
                        {selectedIds.size} selecionado(s)
                    </span>
                    <div className="flex-1" />
                    {activeSection === 'parked' && (
                        <>
                            <button
                                onClick={() => updateStatus([...selectedIds], LeadStatus.NEW)}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-primary/20"
                            >
                                <RotateCcw size={12} /> Restaurar ao Lab
                            </button>
                            <button
                                onClick={() => updateStatus([...selectedIds], LeadStatus.DISCARDED)}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                            >
                                <Ban size={12} /> Descartar
                            </button>
                        </>
                    )}
                    {activeSection === 'discarded' && (
                        <>
                            <button
                                onClick={() => updateStatus([...selectedIds], LeadStatus.NEW)}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-primary/20"
                            >
                                <RotateCcw size={12} /> Restaurar
                            </button>
                            <button
                                onClick={() => handlePermanentDelete([...selectedIds])}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-600/20"
                            >
                                <Trash2 size={12} /> Excluir Permanente
                            </button>
                        </>
                    )}
                    <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-500 hover:text-white">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Empty State */}
            {displayed.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center glass rounded-3xl border border-white/5">
                    <div className="p-6 rounded-full bg-white/5 mb-6">
                        {activeSection === 'parked'
                            ? <Inbox size={40} className="text-slate-700" />
                            : <Ban size={40} className="text-slate-700" />}
                    </div>
                    <h4 className="text-xl font-black text-white mb-2 tracking-tight">
                        {activeSection === 'parked' ? 'Nenhum lead em pausa' : 'Nenhum descartado'}
                    </h4>
                    <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] max-w-xs leading-relaxed">
                        {activeSection === 'parked'
                            ? 'Mova leads do Laboratório para cá para organizar sem perder dados'
                            : 'Leads descartados do Laboratório aparecerão aqui'}
                    </p>
                </div>
            )}

            {/* Lead Cards Grid */}
            {displayed.length > 0 && (
                <div>
                    {/* Select all row */}
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <button
                            onClick={selectAll}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.size === displayed.length && displayed.length > 0
                                    ? 'bg-primary border-primary text-slate-900'
                                    : 'border-white/20 hover:border-primary/50'
                                }`}
                        >
                            {selectedIds.size === displayed.length && displayed.length > 0 && <Check size={12} />}
                        </button>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                            Selecionar todos ({displayed.length})
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {displayed.map(lead => (
                            <LeadAdminCard
                                key={lead.id}
                                lead={lead}
                                isSelected={selectedIds.has(lead.id)}
                                onSelect={() => toggleSelect(lead.id)}
                                onRestoreToLab={() => updateStatus([lead.id], LeadStatus.NEW)}
                                onParkLead={() => updateStatus([lead.id], activeSection === 'discarded' ? LeadStatus.NEW : LeadStatus.DISCARDED)}
                                onPermanentDelete={() => {
                                    if (activeSection === 'discarded') {
                                        setConfirmDelete(lead.id);
                                    } else {
                                        updateStatus([lead.id], LeadStatus.DISCARDED);
                                    }
                                }}
                                onConvertToDeal={onConvertToDeal}
                                onWhatsApp={() => openWhatsApp(lead.phone, lead.name)}
                                activeSection={activeSection}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Confirm Permanent Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="glass-strong border border-red-500/30 rounded-3xl p-8 w-full max-w-md animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-500/20 rounded-2xl">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Exclusão Permanente</h3>
                                <p className="text-[11px] text-slate-400">Esta ação não pode ser desfeita.</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                            Você está prestes a <strong className="text-red-400">excluir permanentemente</strong> este lead.
                            Todos os dados, histórico e insights serão apagados para sempre.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-sm font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handlePermanentDelete([confirmDelete])}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Excluindo...' : 'Excluir Agora'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Lead Admin Card ─────────────────────────────────────────────────────────

interface LeadAdminCardProps {
    lead: Lead;
    isSelected: boolean;
    onSelect: () => void;
    onRestoreToLab: () => void;
    onParkLead: () => void;
    onPermanentDelete: () => void;
    onConvertToDeal?: (id: string) => void;
    onWhatsApp: () => void;
    activeSection: AdminTab;
}

const LeadAdminCard: React.FC<LeadAdminCardProps> = ({
    lead, isSelected, onSelect, onRestoreToLab, onParkLead,
    onPermanentDelete, onConvertToDeal, onWhatsApp, activeSection
}) => {
    const isEnriched = lead.status === LeadStatus.ENRICHED || lead.details?.ai_score;
    const score = lead.details?.ai_score ?? 0;

    return (
        <div className={`group relative glass rounded-3xl border transition-all duration-300 p-5 flex flex-col gap-4 ${isSelected
                ? 'border-primary/40 bg-primary/5'
                : activeSection === 'discarded'
                    ? 'border-red-500/10 hover:border-red-500/20'
                    : 'border-white/5 hover:border-amber-500/20'
            }`}>

            {/* Status ribbon */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-tr-3xl rounded-bl-2xl text-[8px] font-black uppercase tracking-widest ${activeSection === 'parked'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                {activeSection === 'parked' ? '⏸ Em Pausa' : '✕ Descartado'}
            </div>

            {/* Header row */}
            <div className="flex items-start gap-3 pt-2">
                {/* Checkbox */}
                <button
                    onClick={onSelect}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${isSelected ? 'bg-primary border-primary text-slate-900' : 'border-white/20 hover:border-primary/50'
                        }`}
                >
                    {isSelected && <Check size={10} />}
                </button>

                {/* Avatar + Info */}
                <div className="flex-1 min-w-0">
                    {lead.details?.placeImage ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 mb-2">
                            <img src={lead.details.placeImage} alt="" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-2 border border-white/5">
                            <Building2 size={18} className="text-slate-500" />
                        </div>
                    )}
                    <h4 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                        {lead.details?.tradeName || lead.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                        <MapPin size={10} className="text-slate-500 shrink-0" />
                        <span className="text-[10px] text-slate-500 truncate">{lead.location}</span>
                    </div>
                    <div className="mt-1">
                        <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{lead.industry}</span>
                    </div>
                </div>
            </div>

            {/* Score badge if enriched */}
            {score > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-xl">
                    <Sparkles size={12} className="text-primary" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score Neural</span>
                    <span className="text-[10px] font-black text-primary ml-auto">{(score / 10).toFixed(1)}/10</span>
                </div>
            )}

            {/* Contact quick buttons */}
            {lead.phone && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={onWhatsApp}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase transition-all"
                    >
                        <MessageCircle size={12} /> WhatsApp
                    </button>
                    <a
                        href={`tel:${lead.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase transition-all"
                    >
                        <Phone size={12} /> Ligar
                    </a>
                </div>
            )}

            {/* Action footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                    onClick={onRestoreToLab}
                    title="Restaurar ao Laboratório"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-primary/10 text-slate-500 hover:text-primary rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-primary/20"
                >
                    <RotateCcw size={11} />
                    <span className="hidden sm:inline">Restaurar Lab</span>
                    <span className="sm:hidden">Lab</span>
                </button>

                {isEnriched && onConvertToDeal && activeSection === 'parked' && (
                    <button
                        onClick={() => onConvertToDeal(lead.id)}
                        title="Converter em Oportunidade"
                        className="p-2 bg-violet-500/10 hover:bg-violet-500 text-violet-500 hover:text-white rounded-xl transition-all border border-violet-500/20"
                    >
                        <TrendingUp size={14} />
                    </button>
                )}

                <button
                    onClick={onPermanentDelete}
                    title={activeSection === 'parked' ? 'Descartar' : 'Excluir Permanente'}
                    className={`p-2 rounded-xl transition-all border ${activeSection === 'parked'
                            ? 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/20'
                            : 'bg-red-700/20 hover:bg-red-700 text-red-400 hover:text-white border-red-700/20'
                        }`}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

export default LeadAdminView;
