
import React, { useState, useEffect } from 'react';
import {
    Zap, Plus, Trash2, CheckCircle2,
    X, AlertCircle, MessageSquare,
    TrendingUp, Bell, ChevronRight
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
        if (!newRule.name) return;
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
            loadRules();
        } catch (err) {
            console.error('Erro ao criar regra:', err);
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
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Regras de Resposta Automática</h3>
                    <p className="text-xs text-slate-500 font-mono uppercase mt-1">AI_Decision_Engine_v1</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-3 bg-primary/10 text-primary hover:bg-primary hover:text-slate-900 rounded-xl transition-all border border-primary/20"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map(rule => (
                    <div key={rule.id} className="glass-strong p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Zap size={16} />
                                </div>
                                <h4 className="font-bold text-white">{rule.name}</h4>
                            </div>
                            <button
                                onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                                className={`w-10 h-6 rounded-full relative transition-all ${rule.is_active ? 'bg-primary' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${rule.is_active ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
                            <span>{rule.trigger_type}</span>
                            <ChevronRight size={10} />
                            <span className="text-primary">{rule.action_type}</span>
                        </div>

                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-300">
                            {rule.action_type === 'send_reply' && (
                                <div className="flex gap-2 items-start">
                                    <MessageSquare size={14} className="text-slate-500 shrink-0 mt-0.5" />
                                    <p className="italic">"{rule.action_payload.template || 'Sem template configurado'}"</p>
                                </div>
                            )}
                            {rule.action_type === 'move_stage' && (
                                <div className="flex gap-2 items-center">
                                    <TrendingUp size={14} className="text-slate-500" />
                                    <span>Mover para estágio: {rule.action_payload.stage_id || 'Negociação'}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => deleteRule(rule.id)} className="text-red-500/50 hover:text-red-500 p-2">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="glass-strong max-w-lg w-full p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
                        <h3 className="text-2xl font-black text-white mb-6 tracking-tighter italic uppercase">Configurar Automação</h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Regra</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                    placeholder="Ex: Resposta de Interesse"
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gatilho (Trigger)</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none text-xs"
                                        value={newRule.trigger_type}
                                        onChange={e => setNewRule({ ...newRule, trigger_type: e.target.value as any })}
                                    >
                                        <option value="incoming_message">Mensagem Recebida</option>
                                        <option value="status_changed">Status Alterado</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Análise de IA</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none text-xs"
                                        value={newRule.conditions.intent}
                                        onChange={e => setNewRule({ ...newRule, conditions: { intent: e.target.value } })}
                                    >
                                        <option value="positive">Intenção Positiva</option>
                                        <option value="negative">Intenção Negativa</option>
                                        <option value="neutral">Neutro / Indefinido</option>
                                        <option value="question">Dúvida / Pergunta</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ação Resultado</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none text-xs"
                                    value={newRule.action_type}
                                    onChange={e => setNewRule({ ...newRule, action_type: e.target.value as any })}
                                >
                                    <option value="send_reply">Responder via WhatsApp</option>
                                    <option value="move_stage">Mover no Pipeline</option>
                                    <option value="notify_admin">Notificar Equipe</option>
                                </select>
                            </div>

                            {newRule.action_type === 'send_reply' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mensagem de Resposta</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none h-24 text-sm"
                                        placeholder="Olá! Que ótimo seu interesse. Gostaria de agendar uma reunião?"
                                        value={newRule.action_payload.template}
                                        onChange={e => setNewRule({ ...newRule, action_payload: { ...newRule.action_payload, template: e.target.value } })}
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-white/5 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                                >Cancelar</button>
                                <button
                                    onClick={handleCreateRule}
                                    className="flex-1 py-4 bg-primary text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20"
                                >Ativar Regra</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationRulesView;
