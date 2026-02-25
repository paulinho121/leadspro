
import React, { useState, useEffect } from 'react';
import {
    Play, Pause, Plus, Trash2, Calendar,
    MessageSquare, Mail, ChevronRight, Zap,
    Clock, Target, Sparkles, X, Megaphone,
    Layout, Activity, Server
} from 'lucide-react';
import { OutreachSequence, SequenceStep } from '../types';
import { supabase } from '../lib/supabase';
import { useBranding } from './BrandingProvider';
import AutomationRulesView from './AutomationRulesView';
import MassOutreachView from './MassOutreachView';
import CommunicationSettingsView from './CommunicationSettingsView';
import { Settings } from 'lucide-react';

interface AutomationViewProps {
    tenantId: string;
    apiKeys?: any;
}

const AutomationView: React.FC<AutomationViewProps> = ({ tenantId, apiKeys }) => {
    const { config } = useBranding();
    const [sequences, setSequences] = useState<OutreachSequence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'sequences' | 'rules' | 'campaigns' | 'settings'>('campaigns');
    const [newSequence, setNewSequence] = useState({
        name: '',
        steps: [] as SequenceStep[]
    });

    const loadSequences = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('outreach_sequences')
                .select('*')
                .eq('tenant_id', tenantId);

            if (data) setSequences(data);
        } catch (err) {
            console.error('Error loading sequences:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) loadSequences();
    }, [tenantId]);

    const handleCreateSequence = async () => {
        if (!newSequence.name) return;

        try {
            const { error } = await supabase
                .from('outreach_sequences')
                .insert([{
                    tenant_id: tenantId,
                    name: newSequence.name,
                    steps: newSequence.steps,
                    is_active: true
                }]);

            if (error) throw error;

            setShowNewModal(false);
            setNewSequence({ name: '', steps: [] });
            loadSequences();
        } catch (err) {
            console.error('Error creating sequence:', err);
        }
    };

    const addStep = (channel: 'whatsapp' | 'email') => {
        const lastDelay = newSequence.steps.length > 0
            ? newSequence.steps[newSequence.steps.length - 1].delay_days
            : 0;

        setNewSequence(prev => ({
            ...prev,
            steps: [...prev.steps, { channel, delay_days: lastDelay + 1 }]
        }));
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await supabase
                .from('outreach_sequences')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            loadSequences();
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    const deleteSequence = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta cadência?')) return;
        try {
            await supabase.from('outreach_sequences').delete().eq('id', id);
            loadSequences();
        } catch (err) {
            console.error('Error deleting sequence:', err);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-fade-in max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Centrifugação de Receita</h2>
                    <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] mt-1">Growth_Decision_Center_v5</p>
                </div>
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'campaigns' ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Zap size={14} /> Painel de Controle
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rules' ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Activity size={14} /> Automações
                    </button>
                    <button
                        onClick={() => setActiveTab('sequences')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sequences' ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Layout size={14} /> Cadências
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Server size={14} /> Infraestrutura
                    </button>
                </div>
            </div>

            <div className="mt-8">
                {activeTab === 'campaigns' && <MassOutreachView tenantId={tenantId} />}
                {activeTab === 'rules' && <AutomationRulesView tenantId={tenantId} />}
                {activeTab === 'settings' && <CommunicationSettingsView tenantId={tenantId} />}

                {activeTab === 'sequences' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Cadências de Abordagem Neural</h3>
                                <p className="text-xs text-slate-500 font-mono uppercase mt-1">Sequential_Outreach_Engine</p>
                            </div>
                            <button
                                onClick={() => setShowNewModal(true)}
                                className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-white/5"
                            >
                                <Plus size={16} /> Nova Cadência
                            </button>
                        </div>

                        {/* Grid de Cadências */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sequences.map(seq => (
                                <div key={seq.id} className="glass-strong p-8 rounded-[2.5rem] border border-white/5 premium-card group relative overflow-hidden transition-all hover:border-primary/20">
                                    {/* Background Decor */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>

                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                            <Zap size={24} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleStatus(seq.id, seq.is_active)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${seq.is_active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'}`}
                                            >
                                                {seq.is_active ? 'Ativa' : 'Pausada'}
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight relative z-10">{seq.name}</h3>
                                    <p className="text-xs text-slate-500 mb-8 relative z-10">{seq.steps.length} etapas de abordagem configuradas</p>

                                    <div className="space-y-3 mb-8 relative z-10">
                                        {seq.steps.slice(0, 3).map((step, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-[10px] text-slate-400 font-mono uppercase">
                                                <div className="w-1 h-1 rounded-full bg-primary/50"></div>
                                                <span className="text-primary/70">Dia {step.delay_days}:</span>
                                                {step.channel === 'whatsapp' ? <MessageSquare size={12} className="text-green-500" /> : <Mail size={12} className="text-blue-500" />}
                                                <span className="tracking-widest">{step.channel}</span>
                                            </div>
                                        ))}
                                        {seq.steps.length > 3 && (
                                            <p className="text-[10px] text-slate-600 italic pl-4">+ {seq.steps.length - 3} etapas adicionais</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 relative z-10">
                                        <button className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">Editar Fluxo</button>
                                        <button
                                            onClick={() => deleteSequence(seq.id)}
                                            className="p-4 bg-red-500/10 text-red-500/30 hover:text-red-500 rounded-2xl transition-all border border-red-500/10 hover:border-red-500/30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {sequences.length === 0 && !isLoading && (
                                <div className="col-span-full py-28 flex flex-col items-center justify-center glass rounded-[3rem] border-2 border-dashed border-white/5">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 text-slate-700">
                                        <Target size={48} />
                                    </div>
                                    <h4 className="text-xl font-bold text-white tracking-tight">Nenhuma cadência ativa</h4>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm text-center px-6">Crie sua primeira automação para iniciar prospecção em massa e escalar sua receita.</p>
                                    <button
                                        onClick={() => setShowNewModal(true)}
                                        className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                                    >
                                        Começar agora
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Criação de Cadência */}
            {showNewModal && (
                <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="glass-strong max-w-2xl w-full p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32"></div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Nova Cadência</h3>
                                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mt-1">Automation_Studio_v4</p>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-xl hover:bg-white/10">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-10 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6">Nome da Estratégia</label>
                                <input
                                    autoFocus
                                    value={newSequence.name}
                                    onChange={e => setNewSequence(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Aquisição - Varejo SP"
                                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 text-white focus:outline-none focus:border-primary/50 transition-all text-lg font-bold tracking-tight shadow-inner"
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center px-4">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Roadmap de Abordagem</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => addStep('whatsapp')}
                                            className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-green-500 border border-green-500/20 hover:text-white transition-all transform hover:scale-105"
                                        >+ WhatsApp</button>
                                        <button
                                            onClick={() => addStep('email')}
                                            className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-blue-500 border border-blue-500/20 hover:text-white transition-all transform hover:scale-105"
                                        >+ E-mail</button>
                                    </div>
                                </div>

                                <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-4 -mr-4">
                                    {newSequence.steps.length > 0 ? (
                                        newSequence.steps.map((step, idx) => (
                                            <div key={idx} className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5 flex items-center gap-8 group hover:border-white/10 transition-all">
                                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-sm text-primary border border-primary/20 shadow-lg shadow-black/20">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 flex items-center gap-6">
                                                    <div className={`p-3 rounded-xl ${step.channel === 'whatsapp' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                        {step.channel === 'whatsapp' ? <MessageSquare size={20} /> : <Mail size={20} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-white font-black uppercase tracking-widest">{step.channel}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock size={10} className="text-slate-500" />
                                                            <span className="text-[10px] font-mono text-slate-500 uppercase">Aguardar {step.delay_days} {step.delay_days === 1 ? 'dia' : 'dias'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setNewSequence(prev => ({
                                                        ...prev,
                                                        steps: prev.steps.filter((_, i) => i !== idx)
                                                    }))}
                                                    className="p-3 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-xl"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-16 flex flex-col items-center justify-center bg-white/2 rounded-[2rem] border border-dashed border-white/5">
                                            <Sparkles className="text-slate-800 mb-4" size={32} />
                                            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">Matrix_Awaiting_Input</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateSequence}
                                disabled={!newSequence.name || newSequence.steps.length === 0}
                                className="w-full py-6 bg-primary text-slate-900 font-black text-sm uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                            >
                                Ativar Cadência Neural
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationView;
