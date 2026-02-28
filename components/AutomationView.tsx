
import React, { useState, useEffect } from 'react';
import {
    Play, Pause, Plus, Trash2, Calendar,
    MessageSquare, Mail, ChevronRight, Zap,
    Clock, Target, Sparkles, X, Megaphone,
    Layout, Activity, Server, Cpu
} from 'lucide-react';
import { OutreachSequence, SequenceStep } from '../types';
import { supabase } from '../lib/supabase';
import { useBranding } from './BrandingProvider';
import AutomationRulesView from './AutomationRulesView';
import MassOutreachView from './MassOutreachView';
import CommunicationSettingsView from './CommunicationSettingsView';
import VisualWorkflowBuilder from './VisualWorkflowBuilder';

interface AutomationViewProps {
    tenantId: string;
    apiKeys?: any;
}

const AutomationView: React.FC<AutomationViewProps> = ({ tenantId, apiKeys }) => {
    const { config } = useBranding();
    const [sequences, setSequences] = useState<OutreachSequence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'sequences' | 'rules' | 'campaigns' | 'settings' | 'visual'>('campaigns');
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
        <div className="p-6 md:p-10 space-y-12 animate-fade-in max-w-7xl mx-auto pb-24">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-xl">
                        <Cpu className="text-primary" size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Centrifugação de Receita</h2>
                        <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-2 italic shadow-sm">Growth_Decision_Center_v5.Neural</p>
                    </div>
                </div>

                {/* Dashboard Control Tabs */}
                <div className="bg-white/[0.02] p-1.5 rounded-[2rem] border border-white/5 backdrop-blur-xl flex flex-wrap md:flex-nowrap gap-1">
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${activeTab === 'campaigns' ? 'bg-primary text-slate-900 shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Zap size={14} /> Disparos
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${activeTab === 'rules' ? 'bg-primary text-slate-900 shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Activity size={14} /> Automações
                    </button>
                    <button
                        onClick={() => setActiveTab('sequences')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${activeTab === 'sequences' ? 'bg-primary text-slate-900 shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout size={14} /> Cadências
                    </button>
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${activeTab === 'visual' ? 'bg-primary text-slate-900 shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Activity size={14} /> Fluxo Visual
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${activeTab === 'settings' ? 'bg-primary text-slate-900 shadow-xl shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Server size={14} /> Integração
                    </button>

                </div>
            </div>

            <div className="mt-4 min-h-[600px]">
                {activeTab === 'campaigns' && <MassOutreachView tenantId={tenantId} />}
                {activeTab === 'rules' && <AutomationRulesView tenantId={tenantId} />}
                {activeTab === 'settings' && <CommunicationSettingsView tenantId={tenantId} />}
                {activeTab === 'visual' && <VisualWorkflowBuilder tenantId={tenantId} />}


                {activeTab === 'sequences' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-center bg-white/[0.02] p-8 md:p-12 rounded-[3.5rem] border border-white/5 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48 pointer-events-none transition-all group-hover:bg-primary/10"></div>

                            <div className="relative z-10 text-center md:text-left">
                                <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase mb-2">Abordagem Neural</h3>
                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em italic leading-relaxed max-w-md">Flujos sequenciais de alta conversão para escala massiva de aquisição.</p>
                            </div>

                            <button
                                onClick={() => setShowNewModal(true)}
                                className="mt-8 md:mt-0 flex items-center gap-4 px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/5 shadow-xl italic active:scale-95"
                            >
                                <Plus size={18} className="text-primary" /> Definir Novo Fluxo
                            </button>
                        </div>

                        {/* Grid de Cadências Premium */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {sequences.map(seq => (
                                <div key={seq.id} className="relative group p-10 rounded-[3.5rem] bg-slate-900/40 border border-white/5 hover:border-primary/20 transition-all duration-500 backdrop-blur-xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-primary/10 transition-all"></div>

                                    <div className="flex justify-between items-start mb-10 relative z-10">
                                        <div className={`p-4 rounded-2xl border transition-all duration-500 ${seq.is_active ? 'bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                                            <Zap size={24} className={seq.is_active ? 'animate-pulse' : ''} />
                                        </div>
                                        <button
                                            onClick={() => toggleStatus(seq.id, seq.is_active)}
                                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all italic border ${seq.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}
                                        >
                                            {seq.is_active ? 'Operacional' : 'Inativo'}
                                        </button>
                                    </div>

                                    <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase italic relative z-10">{seq.name}</h3>
                                    <p className="text-[10px] text-slate-600 mb-8 font-black uppercase tracking-widest relative z-10">{seq.steps.length} Camadas de Contato</p>

                                    <div className="space-y-4 mb-10 flex-grow relative z-10">
                                        {seq.steps.slice(0, 3).map((step, idx) => (
                                            <div key={idx} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/[0.03] group/step hover:border-white/10 transition-all">
                                                <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-[10px] font-black text-primary/60 border border-primary/10">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        {step.channel === 'whatsapp' ? <MessageSquare size={10} className="text-emerald-500" /> : <Mail size={10} className="text-blue-500" />}
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{step.channel}</span>
                                                    </div>
                                                    <span className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter leading-none italic font-bold">Aguardar {step.delay_days} {step.delay_days === 1 ? 'Dia' : 'Dias'}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {seq.steps.length > 3 && (
                                            <div className="px-6 py-2 bg-white/5 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest italic w-fit mx-auto mt-2">
                                                + {seq.steps.length - 3} Etapas Ocultas
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 relative z-10">
                                        <button className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 italic">Modificar</button>
                                        <button
                                            onClick={() => deleteSequence(seq.id)}
                                            className="p-5 bg-red-500/5 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-red-500/0 hover:border-red-500/20"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {sequences.length === 0 && !isLoading && (
                                <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[4rem]">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 animate-pulse"></div>
                                        <Target className="text-slate-800 relative z-10" size={48} />
                                    </div>
                                    <h4 className="text-xl font-black text-white tracking-widest uppercase italic">Sequential_Matrix_Offline</h4>
                                    <p className="text-sm text-slate-500 mt-4 max-w-sm text-center px-10 font-medium leading-relaxed">Engenharia de cadências inativa. Configure um novo roadmap de abordagem para automatizar sua receita.</p>
                                    <button
                                        onClick={() => setShowNewModal(true)}
                                        className="mt-12 px-12 py-5 bg-primary text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-primary/20 italic hover:scale-105"
                                    >
                                        Nova Arquitetura de Cadência
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Sequence Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="glass-strong max-w-2xl w-full p-10 md:p-14 rounded-[4rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>

                        <div className="flex justify-between items-start mb-14 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">Fluxo Neural Studio</span>
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase">Arquitetura de Fluxo</h3>
                                <p className="text-slate-500 text-xs mt-2 font-medium">Desenvolva a jornada sequencial de abordagem para seus leads.</p>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-[1.5rem] transition-all border border-white/5">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-12 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-8 italic">Nome da Estratégia de Cadência</label>
                                <input
                                    autoFocus
                                    value={newSequence.name}
                                    onChange={e => setNewSequence(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Hunter - Imóveis Alto Padrão"
                                    className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-10 py-6 text-white focus:outline-none focus:border-primary/40 transition-all text-lg font-black tracking-tight shadow-inner placeholder:text-slate-800"
                                />
                            </div>

                            <div className="space-y-8">
                                <div className="flex flex-col sm:flex-row justify-between items-center px-4 gap-6">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic">Roadmap de Abordagem Neural</h4>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => addStep('whatsapp')}
                                            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 transition-all transform hover:scale-105 italic"
                                        >+ Whatsapp</button>
                                        <button
                                            onClick={() => addStep('email')}
                                            className="px-6 py-3 bg-blue-500/10 text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white border border-blue-500/20 transition-all transform hover:scale-105 italic"
                                        >+ E-mail</button>
                                    </div>
                                </div>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-6 -mr-6 px-2">
                                    {newSequence.steps.length > 0 ? (
                                        newSequence.steps.map((step, idx) => (
                                            <div key={idx} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-10 group hover:border-primary/20 transition-all duration-300">
                                                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-lg text-primary border border-primary/20 shadow-xl shadow-black/40">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 flex items-center gap-10">
                                                    <div className={`p-4 rounded-2xl ${step.channel === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-blue-500/10 text-blue-500 border border-blue-500/10'}`}>
                                                        {step.channel === 'whatsapp' ? <MessageSquare size={24} /> : <Mail size={24} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-white font-black uppercase tracking-[0.2em] mb-1 italic">{step.channel}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={12} className="text-slate-600" />
                                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Delay: {step.delay_days} {step.delay_days === 1 ? 'Dia' : 'Dias'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setNewSequence(prev => ({
                                                        ...prev,
                                                        steps: prev.steps.filter((_, i) => i !== idx)
                                                    }))}
                                                    className="p-4 text-slate-700 hover:text-red-500 opacity-20 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-2xl"
                                                >
                                                    <Trash2 size={22} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-24 flex flex-col items-center justify-center bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                                            <Sparkles className="text-slate-800 mb-6 scale-150" size={32} />
                                            <p className="text-[10px] text-slate-700 font-mono uppercase tracking-[0.4em] italic font-black">Aguardando definição neural</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateSequence}
                                disabled={!newSequence.name || newSequence.steps.length === 0}
                                className="w-full py-7 bg-primary text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] rounded-[2rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale italic"
                            >
                                Implantar Cadência Neural
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationView;
