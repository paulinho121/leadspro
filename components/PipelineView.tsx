
import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, TrendingUp, DollarSign, Target,
    ChevronRight, MoreVertical, Filter, Plus,
    CheckCircle2, Clock, AlertCircle, ArrowUpRight, Sparkles, MessageSquare
} from 'lucide-react';
import { Deal, DealStage, Lead } from '../types';
import { RevenueService } from '../services/revenueService';
import { SdrService } from '../services/sdrService';
import { SequenceService } from '../services/sequenceService';
import { useBranding } from './BrandingProvider';
import { OutreachSequence } from '../types';

interface PipelineViewProps {
    tenantId: string;
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

const PipelineView: React.FC<PipelineViewProps> = ({ tenantId, apiKeys }) => {
    const { config } = useBranding();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [stats, setStats] = useState({ total: 0, weighted: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [sequences, setSequences] = useState<OutreachSequence[]>([]);
    const [selectedDealForAi, setSelectedDealForAi] = useState<{ deal: Deal, message: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data } = await (RevenueService as any).supabase
                .from('deals')
                .select('*, lead:leads(*)')
                .eq('tenant_id', tenantId);

            if (data) setDeals(data);

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

    return (
        <div className="p-6 md:p-10 space-y-8 animate-fade-in overflow-x-auto custom-scrollbar h-full flex flex-col relative">
            {/* Header com Stats de Receita */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2rem] p-4 space-y-4 overflow-y-auto custom-scrollbar">
                            {getDealsByStage(stage.id).map(deal => (
                                <DealCard
                                    key={deal.id}
                                    deal={deal}
                                    color={stage.color}
                                    onAiClick={() => handleGenerateAiMessage(deal)}
                                    isGenerating={isGenerating}
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
}

const DealCard = ({ deal, color, onAiClick, isGenerating }: DealCardProps) => (
    <div className="glass-strong p-5 rounded-3xl border border-white/5 hover:border-white/20 transition-all group cursor-pointer premium-card relative overflow-hidden">
        {deal.probability_to_close > 0.7 && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
        )}

        <div className="flex justify-between items-start mb-3 relative z-10">
            <h5 className="text-sm font-bold text-white tracking-tight group-hover:text-primary transition-colors truncate pr-8">
                {deal.lead?.name || 'Cliente Sem Nome'}
            </h5>
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onAiClick(); }}
                    disabled={isGenerating}
                    className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
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
                <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Probabilidade</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold" style={{ color }}>
                        {Math.round(deal.probability_to_close * 100)}%
                    </span>
                    <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${deal.probability_to_close * 100}%`, backgroundColor: color }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
            <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-lg bg-primary/20 border border-white/10 flex items-center justify-center text-[8px] font-black text-primary">AI</div>
                {deal.lead?.p2c_score && (
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-white/10 flex items-center justify-center text-[8px] font-black text-emerald-500">P</div>
                )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock size={10} />
                <span className="font-mono">Ativo</span>
            </div>
        </div>
    </div>
);

export default PipelineView;
