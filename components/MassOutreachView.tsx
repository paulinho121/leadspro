
import React, { useState, useEffect } from 'react';
import {
    Send, Users, Calendar,
    CheckCircle2, Clock, Play,
    Pause, Plus, Megaphone,
    X, Layout
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OutreachCampaign, Lead } from '../types';
import { CampaignService } from '../services/campaignService';

interface MassOutreachViewProps {
    tenantId: string;
}

const MassOutreachView: React.FC<MassOutreachViewProps> = ({ tenantId }) => {
    const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        channel: 'whatsapp' as 'whatsapp' | 'email',
        template_content: '',
        target_status: 'ENRICHED'
    });

    const loadCampaigns = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('outreach_campaigns')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });
            if (data) setCampaigns(data);
        } catch (err) {
            console.error('Erro ao carregar campanhas:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) loadCampaigns();
    }, [tenantId]);

    const handleCreateCampaign = async () => {
        if (!newCampaign.name || !newCampaign.template_content) return;

        try {
            // 1. Criar a campanha no banco
            const { data: campaign, error } = await supabase
                .from('outreach_campaigns')
                .insert([{
                    tenant_id: tenantId,
                    name: newCampaign.name,
                    channel: newCampaign.channel,
                    template_content: newCampaign.template_content,
                    status: 'draft'
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Buscar leads alvo
            const { data: leads } = await supabase
                .from('leads')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('status', newCampaign.target_status);

            if (leads && leads.length > 0) {
                // Iniciar automaticamente se houver leads
                await CampaignService.startCampaign(tenantId, campaign.id, leads.map(l => l.id));
            }

            setShowModal(false);
            loadCampaigns();
        } catch (err) {
            console.error('Erro ao processar campanha:', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Campanhas de Disparo</h3>
                    <p className="text-xs text-slate-500 font-mono uppercase mt-1">Mass_Outreach_Manager</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> Nova Campanha
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map(camp => (
                    <div key={camp.id} className="glass-strong p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-all">
                            <Megaphone size={60} />
                        </div>

                        <div className="flex justify-between items-start mb-6">
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] ${camp.status === 'running' ? 'bg-green-500/20 text-green-500' :
                                    camp.status === 'completed' ? 'bg-blue-500/20 text-blue-500' :
                                        'bg-slate-500/20 text-slate-400'
                                }`}>
                                {camp.status}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                                {camp.channel === 'whatsapp' ? <Users size={14} /> : <Calendar size={14} />}
                                <span className="text-[10px] uppercase font-mono">{camp.channel}</span>
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-white mb-2">{camp.name}</h4>
                        <div className="space-y-4 mb-6">
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${(camp.processed_leads / (camp.total_leads || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                <span>Progresso</span>
                                <span>{camp.processed_leads} / {camp.total_leads}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-white/2 rounded-2xl border border-white/5 mb-6">
                            <p className="text-[10px] text-slate-400 line-clamp-2 italic">"{camp.template_content}"</p>
                        </div>

                        <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all">
                            Ver Relatórios
                        </button>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="glass-strong max-w-xl w-full p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h3 className="text-3xl font-black text-white mb-8 tracking-tighter italic uppercase">Configurar Disparo</h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nome da Campanha</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50"
                                    placeholder="Ex: Lançamento Produto X - Leads Enriquecidos"
                                    value={newCampaign.name}
                                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Canal</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setNewCampaign({ ...newCampaign, channel: 'whatsapp' })}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newCampaign.channel === 'whatsapp' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/5 text-slate-500 border border-white/5'}`}
                                        >WhatsApp</button>
                                        <button
                                            onClick={() => setNewCampaign({ ...newCampaign, channel: 'email' })}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newCampaign.channel === 'email' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-500 border border-white/5'}`}
                                        >E-mail</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Target (Status)</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-xs"
                                        value={newCampaign.target_status}
                                        onChange={e => setNewCampaign({ ...newCampaign, target_status: e.target.value })}
                                    >
                                        <option value="ENRICHED">Leads Enriquecidos</option>
                                        <option value="NEW">Leads Novos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mensagem do Lead</label>
                                    <span className="text-[9px] text-primary/50 uppercase font-mono tracking-tighter">Variáveis: {"${name}"}, {"${industry}"}</span>
                                </div>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none h-32 text-sm leading-relaxed"
                                    placeholder="Olá ${name}, notei que a sua empresa atua em ${industry} e..."
                                    value={newCampaign.template_content}
                                    onChange={e => setNewCampaign({ ...newCampaign, template_content: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-5 bg-white/5 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                                >Cancelar</button>
                                <button
                                    onClick={handleCreateCampaign}
                                    className="flex-1 py-5 bg-primary text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-primary/30"
                                >Disparar Agora</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MassOutreachView;
