
import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, TrendingUp, DollarSign, Target,
    ChevronRight, MoreVertical, Filter, Plus,
    CheckCircle2, Clock, AlertCircle, ArrowUpRight, Sparkles, MessageSquare,
    Zap, RefreshCw
} from 'lucide-react';
import { Deal, DealStage, Lead } from '../types';
import { RevenueService } from '../services/revenueService';
import { SdrService } from '../services/sdrService';
import { SequenceService } from '../services/sequenceService';
import { useBranding } from './BrandingProvider';
import { OutreachSequence } from '../types';
import { supabase } from '../lib/supabase';

interface PipelineViewProps {
    tenantId: string;
    userId?: string;
    apiKeys?: any;
}

const STAGES = [
    { id: DealStage.DISCOVERY, label: 'Descoberta', color: '#94a3b8' },
    { id: DealStage.PRESENTATION, label: 'Apresentação', color: '#3b82f6' },
    { id: DealStage.PROPOSAL, label: 'Proposta', color: '#8b5cf6' },
    { id: DealStage.NEGOTIATION, label: 'Negociação', color: '#f59e0b' },
    { id: DealStage.WON, label: 'Ganho', color: '#10b981' },
    { id: DealStage.LOST, label: 'Perdido', color: '#ef4444' }
];

const PipelineView: React.FC<PipelineViewProps> = ({ tenantId, userId, apiKeys }) => {
    const { config } = useBranding();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [stats, setStats] = useState({ total: 0, weighted: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [sequences, setSequences] = useState<OutreachSequence[]>([]);
    const [selectedDealForAi, setSelectedDealForAi] = useState<{ deal: Deal, message: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [draggingDealId, setDraggingDealId] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await RevenueService.getDeals(tenantId);
            setDeals(data || []);

            const pipelineStats = await RevenueService.getPipelineValue(tenantId);
            setStats(pipelineStats);

            const seqs = await SequenceService.getSequences(tenantId);
            setSequences(seqs);
        } catch (err) {
            console.error('Error loading pipeline:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) loadData();
    }, [tenantId]);

    const handleGenerateAiMessage = async (deal: Deal) => {
        if (!deal.lead) return;
        setIsGenerating(true);
        try {
            const msg = await SdrService.generateOutreachMessage(deal.lead as Lead, 'whatsapp', apiKeys);
            setSelectedDealForAi({ deal, message: msg });
        } catch (err) {
            console.error('AI SDR Error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnrollInSequence = async (deal: Deal, sequenceId: string) => {
        if (!deal.lead_id) return;
        try {
            await SequenceService.enrollLead(tenantId, deal.lead_id, sequenceId);
            alert('Lead inscrito na cadência automatizada com sucesso!');
        } catch (err) {
            console.error('Error enrolling in sequence:', err);
            alert('Falha ao inscrever na cadência.');
        }
    };

    const getDealsByStage = (stage: DealStage) => deals.filter(d => d.stage === stage);

    const handleDragStart = (e: React.DragEvent, dealId: string) => {
        setDraggingDealId(dealId);
        e.dataTransfer.setData('dealId', dealId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
        e.preventDefault();
        const dealId = draggingDealId || e.dataTransfer.getData('dealId');
        if (!dealId) return;

        // Otimismo visual: atualiza o estado local imediatamente
        const updatedDeals = deals.map(d =>
            d.id === dealId ? { ...d, stage: newStage } : d
        );
        setDeals(updatedDeals);
        setDraggingDealId(null);

        try {
            await RevenueService.updateDealStage(dealId, newStage, userId);
            // Recarregar estatísticas após mudança de estágio
            const pipelineStats = await RevenueService.getPipelineValue(tenantId);
            setStats(pipelineStats);
        } catch (err) {
            console.error('Erro ao mover lead:', err);
            // Reverter se falhar
            loadData();
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-fade-in overflow-x-auto custom-scrollbar h-full flex flex-col relative">
            {/* Header com Stats de Receita e Ações */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                    <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={48} />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Valor Total do Pipeline</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter">
                            {stats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h3>
                    </div>

                    <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={48} />
                        </div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Previsão Realista (Ponderada)</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter" style={{ color: config.colors.primary }}>
                            {stats.weighted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h3>
                    </div>

                    <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign size={48} />
                        </div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Conversão Média</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter">
                            24.8%
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 transition-all group active:scale-95"
                        title="Atualizar Pipeline"
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                        <Plus size={16} /> Novo Negócio
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-6 flex-1 min-h-0 pb-4">
                {STAGES.map(stage => (
                    <div key={stage.id} className="w-80 shrink-0 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">{stage.label}</h4>
                                <span className="bg-white/5 px-2 py-0.5 rounded-full text-[10px] text-slate-500 font-bold">
                                    {getDealsByStage(stage.id).length}
                                </span>
                            </div>
                        </div>

                        <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id as DealStage)}
                            className={`flex-1 bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 space-y-4 overflow-y-auto custom-scrollbar transition-colors ${draggingDealId ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
                        >
                            {getDealsByStage(stage.id as DealStage).map(deal => (
                                <DealCard
                                    key={deal.id}
                                    deal={deal}
                                    color={stage.color}
                                    onAiClick={() => handleGenerateAiMessage(deal)}
                                    isGenerating={isGenerating}
                                    onDragStart={(e) => handleDragStart(e, deal.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* AI SDR OVERLAY */}
            {selectedDealForAi && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="glass-strong max-w-lg w-full p-8 rounded-[2.5rem] border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-white tracking-tight">AI SDR Assistant</h4>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Outreach_Draft_Beta</p>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-8">
                            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                {selectedDealForAi.message}
                            </p>
                        </div>

                        {/* Sequence Enrollment Option */}
                        {sequences.length > 0 && (
                            <div className="mb-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 ml-2">Automatizar Outreach Futuro?</p>
                                <select
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary/50"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleEnrollInSequence(selectedDealForAi.deal, e.target.value);
                                        }
                                    }}
                                >
                                    <option value="">Não inscrever em cadência</option>
                                    {sequences.map(seq => (
                                        <option key={seq.id} value={seq.id}>{seq.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectedDealForAi(null)}
                                className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={() => {
                                    const leadPhone = selectedDealForAi.deal.lead?.phone || '';
                                    const text = encodeURIComponent(selectedDealForAi.message);
                                    window.open(`https://wa.me/${leadPhone.replace(/\D/g, '')}?text=${text}`, '_blank');
                                    setSelectedDealForAi(null);
                                }}
                                className="flex-1 py-4 rounded-2xl bg-primary text-slate-900 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={16} /> Enviar WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface DealCardProps {
    key?: string | number;
    deal: Deal;
    color: string;
    onAiClick: () => void;
    isGenerating: boolean;
    onDragStart: (e: React.DragEvent) => void;
}

const DealCard = ({ deal, color, onAiClick, isGenerating, onDragStart }: DealCardProps) => {
    const p2c = deal.lead?.p2c_score ? Number(deal.lead.p2c_score) : deal.probability_to_close;
    const isHot = p2c > 0.7;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={`glass-strong p-5 rounded-3xl border transition-all group cursor-grab active:cursor-grabbing premium-card relative overflow-hidden ${isHot ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-white/5 hover:border-white/20'}`}
        >
            {isHot && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -mr-12 -mt-12 pointer-events-none animate-pulse"></div>
            )}

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="min-w-0 pr-8">
                    <h5 className="text-sm font-bold text-white tracking-tight group-hover:text-primary transition-colors truncate">
                        {deal.lead?.name || 'Cliente Sem Nome'}
                    </h5>
                    {isHot && (
                        <div className="flex items-center gap-1 mt-1">
                            <Zap size={10} className="text-primary fill-primary" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Hot Lead</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAiClick(); }}
                        disabled={isGenerating}
                        className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Draft Neural por SDR"
                    >
                        <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Valor</span>
                    <span className="text-xs font-black text-white">
                        {deal.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Conversão IA</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: isHot ? 'var(--color-primary)' : color }}>
                            {Math.round(p2c * 100)}%
                        </span>
                        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${p2c * 100}%`,
                                    backgroundColor: isHot ? 'var(--color-primary)' : color
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 border border-white/10 flex items-center justify-center text-[8px] font-black text-primary" title="Análise Neural Ativa">AI</div>
                    {deal.lead?.socialLinks?.instagram && (
                        <div className="w-6 h-6 rounded-lg bg-pink-500/20 border border-white/10 flex items-center justify-center text-[8px] font-black text-pink-500">IG</div>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <Clock size={10} />
                    <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};

export default PipelineView;
