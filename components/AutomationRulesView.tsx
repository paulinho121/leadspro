
import React, { useState, useEffect } from 'react';
import {
    Zap, Plus, Trash2, CheckCircle2,
    X, AlertCircle, MessageSquare,
    TrendingUp, Bell, ChevronRight,
    Brain, Cpu, Shield, Activity,
    Target, ArrowRight, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AutomationRule } from '../types';

interface AutomationRulesViewProps {
    tenantId: string;
}

const AutomationRulesView: React.FC<AutomationRulesViewProps> = ({ tenantId }) => {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
        name: '',
        trigger_type: 'incoming_message',
        action_type: 'send_reply',
        conditions: { intent: 'positive' },
        action_payload: { template: '' }
    });


    const loadRules = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('automation_rules')
                .select('*')
                .eq('tenant_id', tenantId);
            if (data) setRules(data);
        } catch (err) {
            console.error('Erro ao carregar regras:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) loadRules();
    }, [tenantId]);

    const handleCreateRule = async () => {
        setSaveError(null);

        if (!newRule.name?.trim()) {
            setSaveError('Informe um nome para a regra antes de ativar.');
            return;
        }
        if (newRule.action_type === 'send_reply' && !newRule.action_payload?.template?.trim()) {
            setSaveError('Adicione o script da mensagem antes de ativar.');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('automation_rules')
                .insert([{
                    tenant_id: tenantId,
                    ...newRule,
                    is_active: true
                }]);
            if (error) throw error;
            setShowModal(false);
            setSaveError(null);
            setNewRule({
                name: '',
                trigger_type: 'incoming_message',
                action_type: 'send_reply',
                conditions: { intent: 'positive' },
                action_payload: { template: '' }
            });
            loadRules();
        } catch (err: any) {
            console.error('Erro ao criar regra:', err);
            setSaveError(err?.message || 'Erro ao salvar. Verifique o console.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleRuleStatus = async (id: string, current: boolean) => {
        await supabase.from('automation_rules').update({ is_active: !current }).eq('id', id);
        loadRules();
    };

    const deleteRule = async (id: string) => {
        if (!confirm('Excluir esta automação?')) return;
        await supabase.from('automation_rules').delete().eq('id', id);
        loadRules();
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Mission Control Header */}
            <div className="flex flex-col md:flex-row justify-between items-center p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-700"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                        <Brain className="text-primary" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 font-bold">
                            <span className="px-2 py-0.5 bg-primary text-slate-900 text-[8px] font-black uppercase tracking-widest rounded-full italic">Engine v1.0</span>
                            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest leading-none">Processamento Neural Ativo</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic leading-tight">Regras de decisão inteligente</h2>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="mt-6 md:mt-0 px-8 py-4 bg-primary text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 italic"
                >
                    <Plus size={18} /> Nova Regra de Resposta
                </button>
            </div>

            {/* Rules Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-5">
                {rules.map(rule => (
                    <div key={rule.id} className="relative group p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 hover:border-primary/20 transition-all duration-500 backdrop-blur-xl overflow-hidden shadow-2xl">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-primary/10 transition-all"></div>

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${rule.is_active ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                                    <Zap size={24} className={rule.is_active ? 'animate-pulse' : ''} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white italic uppercase tracking-tighter mb-1">{rule.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${rule.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${rule.is_active ? 'text-emerald-500/80' : 'text-slate-500'}`}>
                                            {rule.is_active ? 'Operação Ativa' : 'Sincronização Pausada'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                                className={`w-12 h-6 rounded-full relative transition-all duration-300 border ${rule.is_active ? 'bg-primary/20 border-primary/40' : 'bg-slate-800 border-white/10'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full shadow-lg transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${rule.is_active ? 'left-7 bg-primary' : 'left-1 bg-slate-600'}`} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-black/40 rounded-2xl border border-white/5 mb-6 relative z-10 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 shrink-0">
                                <Target size={12} className="text-slate-500" />
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{rule.trigger_type.replace('_', ' ')}</span>
                            </div>
                            <ArrowRight size={12} className="text-slate-700 shrink-0" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-xl border border-primary/10 shrink-0">
                                <Brain size={12} className="text-primary/70" />
                                <span className="text-[9px] font-mono text-primary/70 uppercase tracking-widest italic">{rule.conditions?.intent || 'ANY'}</span>
                            </div>
                            <ArrowRight size={12} className="text-slate-700 shrink-0" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 shrink-0">
                                <Activity size={12} className="text-slate-500" />
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{rule.action_type.replace('_', ' ')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/60 p-6 rounded-3xl border border-white/5 relative z-10 group/payload hover:border-white/10 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] italic">Payload da Resposta</span>
                                {rule.action_type === 'send_reply' ? <MessageSquare size={12} className="text-primary/40" /> : <TrendingUp size={12} className="text-primary/40" />}
                            </div>

                            {rule.action_type === 'send_reply' ? (
                                <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                                    "{rule.action_payload.template || 'Nenhum script configurado'}"
                                </p>
                            ) : (
                                <div className="flex items-center gap-3 text-xs text-slate-400 font-bold uppercase tracking-tight">
                                    <TrendingUp size={16} className="text-primary/60" />
                                    Mover para: {rule.action_payload.stage_id || 'Negociação'}
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
                            <span className="text-[8px] text-slate-600 font-mono">UID: {rule.id.slice(0, 8).toUpperCase()}</span>
                            <button
                                onClick={() => deleteRule(rule.id)}
                                className="p-3 bg-red-500/5 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/0 hover:border-red-500/20"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {rules.length === 0 && !isLoading && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[3rem]">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75 animate-pulse"></div>
                            <Cpu className="text-slate-700 relative z-10" size={48} />
                        </div>
                        <h4 className="text-xl font-black text-white tracking-widest uppercase italic">Neural_Engine_Offline</h4>
                        <p className="text-sm text-slate-500 mt-3 max-w-sm text-center px-6 font-medium">
                            Nenhuma regra de decisão foi mapeada. Clique em "Nova Regra" para iniciar a centrifugação neural.
                        </p>
                    </div>
                )}
            </div>

            {/* Industrial Premium Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="glass-strong max-w-2xl w-full p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Modal Ornaments */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500/5 blur-[100px] -ml-32 -mb-32 pointer-events-none"></div>

                        <div className="flex justify-between items-start mb-12 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">Setup de Automação</span>
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase">Configurar Motor Neural</h3>
                                <p className="text-slate-500 text-xs mt-2 font-medium">Defina as regras de comportamento da Inteligência Artificial.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl transition-all border border-white/5">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-10 relative z-10">
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-6 italic">
                                    <Target size={12} className="text-primary/50" /> Nome de Identificação
                                </label>
                                <input
                                    className="w-full bg-black/40 border border-white/5 rounded-[1.8rem] px-8 py-5 text-white focus:outline-none focus:border-primary/40 transition-all font-bold tracking-tight shadow-inner placeholder:text-slate-800"
                                    placeholder="Ex: Qualificação de Varejo Automática"
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-6 italic">
                                        <Zap size={12} className="text-primary/50" /> Gatilho (Trigger)
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/40 appearance-none text-xs font-bold tracking-tight cursor-pointer"
                                            value={newRule.trigger_type}
                                            onChange={e => setNewRule({ ...newRule, trigger_type: e.target.value as any })}
                                        >
                                            <option value="incoming_message">MENSAGEM RECEBIDA</option>
                                            <option value="status_changed">STATUS ALTERADO</option>
                                        </select>
                                        <ChevronRight size={14} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-600 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-6 italic">
                                        <Brain size={12} className="text-primary/50" /> Análise SDR (IA)
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/40 appearance-none text-xs font-bold tracking-tight cursor-pointer"
                                            value={newRule.conditions?.intent || 'positive'}
                                            onChange={e => setNewRule({ ...newRule, conditions: { intent: e.target.value } })}
                                        >
                                            <option value="positive">INTENÇÃO POSITIVA</option>
                                            <option value="negative">INTENÇÃO NEGATIVA</option>
                                            <option value="neutral">NEUTRO / INDEFINIDO</option>
                                            <option value="question">DÚVIDA / PERGUNTA</option>
                                        </select>
                                        <ChevronRight size={14} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-600 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-6 italic">
                                    <Activity size={12} className="text-primary/50" /> Ação Resultante
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/40 appearance-none text-xs font-bold tracking-tight cursor-pointer"
                                        value={newRule.action_type}
                                        onChange={e => setNewRule({ ...newRule, action_type: e.target.value as any })}
                                    >
                                        <option value="send_reply">RESPONDER VIA WHATSAPP</option>
                                        <option value="move_stage">MOVER NO PIPELINE</option>
                                        <option value="notify_admin">NOTIFICAR EQUIPE</option>
                                    </select>
                                    <ChevronRight size={14} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-600 pointer-events-none" />
                                </div>
                            </div>

                            {newRule.action_type === 'send_reply' && (
                                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                    <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-6 italic">
                                        <MessageSquare size={12} className="text-primary/50" /> Script da Mensagem Neural
                                    </label>
                                    <textarea
                                        className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-8 py-6 text-white focus:outline-none focus:border-primary/40 h-32 text-sm font-medium leading-relaxed shadow-inner placeholder:text-slate-800"
                                        placeholder="Olá! Que ótimo seu interesse. Gostaria de agendar uma reunião?"
                                        value={newRule.action_payload?.template || ''}
                                        onChange={e => setNewRule({ ...newRule, action_payload: { ...newRule.action_payload, template: e.target.value } })}
                                    />
                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest ml-6">Personalização dinâmica ativa: Use variáveis como {'{'}name{'}'} para engajamento.</p>
                                </div>
                            )}

                            {/* Erro de validação */}
                            {saveError && (
                                <div className="flex items-start gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in duration-200">
                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-red-400 font-bold leading-relaxed">{saveError}</p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-6 pt-4">
                                <button
                                    onClick={() => { setShowModal(false); setSaveError(null); }}
                                    disabled={isSaving}
                                    className="flex-1 py-5 bg-white/5 text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-white/10 transition-all italic disabled:opacity-50"
                                >Cancelar Operação</button>
                                <button
                                    id="btn-ativar-engine-neural"
                                    onClick={handleCreateRule}
                                    disabled={isSaving}
                                    className="group flex-1 py-5 bg-primary text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 italic disabled:opacity-60 disabled:scale-100"
                                >
                                    {isSaving ? (
                                        <><Activity size={16} className="animate-spin" /> Ativando...</>
                                    ) : (
                                        <><Activity size={16} className="group-hover:animate-spin" /> Ativar Engine Neural</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationRulesView;
