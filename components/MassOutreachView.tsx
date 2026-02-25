
import React, { useState, useEffect } from 'react';
import {
    Send, Users, Calendar,
    CheckCircle2, Clock, Play,
    Pause, Plus, Megaphone,
    X, Layout, Zap, AlertTriangle,
    ShieldCheck, BarChart3, Fingerprint,
    MessageCircle, Globe, Terminal,
    Sparkles, Activity, Mail, Edit2, Trash2, MoreVertical
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
    const [hasInfrastructure, setHasInfrastructure] = useState(false);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        channel: 'whatsapp' as 'whatsapp' | 'email',
        template_content: '',
        target_status: 'ENRICHED'
    });

    const loadCampaigns = async () => {
        setIsLoading(true);
        try {
            const { data: settings } = await supabase
                .from('communication_settings')
                .select('provider_type, is_active')
                .eq('tenant_id', tenantId);

            setHasInfrastructure(!!settings?.some(s => s.is_active));

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

    const handleSaveCampaign = async () => {
        if (!newCampaign.name || !newCampaign.template_content) return;

        try {
            if (editingCampaignId) {
                // UPDATE
                const { error } = await supabase
                    .from('outreach_campaigns')
                    .update({
                        name: newCampaign.name,
                        channel: newCampaign.channel,
                        template_content: newCampaign.template_content
                    })
                    .eq('id', editingCampaignId);

                if (error) throw error;
            } else {
                // CREATE
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

                const { data: leads } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .eq('status', newCampaign.target_status);

                if (leads && leads.length > 0) {
                    await CampaignService.startCampaign(tenantId, campaign.id, leads.map(l => l.id));
                }
            }

            setShowModal(false);
            setEditingCampaignId(null);
            loadCampaigns();
        } catch (err) {
            console.error('Erro ao processar campanha:', err);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta campanha? Esta ação não pode ser desfeita.')) return;

        try {
            await CampaignService.deleteCampaign(id);
            loadCampaigns();
        } catch (err) {
            console.error('Erro ao excluir campanha:', err);
            alert('Erro ao excluir campanha.');
        }
    };

    const openEditModal = (camp: OutreachCampaign) => {
        setEditingCampaignId(camp.id);
        setNewCampaign({
            name: camp.name,
            channel: camp.channel,
            template_content: camp.template_content,
            target_status: 'ENRICHED' // Default, as it might not be relevant for edit
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingCampaignId(null);
        setNewCampaign({
            name: '',
            channel: 'whatsapp',
            template_content: '',
            target_status: 'ENRICHED'
        });
        setShowModal(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Redesign: Balanced & Professional */}
            <div className="flex flex-col md:flex-row justify-between items-center p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                        <Activity className="text-primary" size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest">Sistema Operacional Ativo</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">Painel de Disparos</h2>
                    </div>
                </div>

                <div className="flex items-center gap-8 mt-6 md:mt-0 relative z-10">
                    <div className="hidden lg:flex flex-col items-center px-8 border-r border-white/5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Operações Ativas</span>
                        <span className="text-2xl font-black text-white tabular-nums leading-none">
                            {campaigns.filter(c => c.status === 'running').length.toString().padStart(2, '0')}
                        </span>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="group flex items-center gap-3 px-8 py-4 bg-primary text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                        <Plus size={18} /> Nova Campanha
                    </button>
                </div>
            </div>

            {/* Campaign Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.length === 0 && !isLoading ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[3rem]">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 text-slate-700">
                            <Zap size={40} />
                        </div>
                        <h4 className="text-lg font-bold text-white tracking-tight uppercase italic">Nenhuma Campanha Ativa</h4>
                        <p className="text-xs text-slate-500 mt-2 max-w-xs text-center font-medium">Inicie uma nova sequência para processar seus leads.</p>
                    </div>
                ) : (
                    campaigns.map(camp => (
                        <div key={camp.id} className="relative bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all duration-300 backdrop-blur-xl group">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${camp.channel === 'whatsapp'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                    }`}>
                                    {camp.channel === 'whatsapp' ? <MessageCircle size={24} /> : <Mail size={24} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(camp)}
                                        className="p-2 bg-white/5 rounded-xl hover:bg-primary/20 hover:text-primary transition-all text-slate-500"
                                        title="Editar Campanha"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCampaign(camp.id)}
                                        className="p-2 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all text-slate-500"
                                        title="Excluir Campanha"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${camp.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
                                        camp.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-white/5 text-slate-500 border-white/10'
                                        }`}>
                                        {camp.status === 'running' ? 'Executando' :
                                            camp.status === 'completed' ? 'Finalizado' : 'Rascunho'}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-lg font-bold text-white tracking-tight line-clamp-1 mb-1 italic uppercase">
                                    {camp.name}
                                </h4>
                                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{camp.channel} Channel</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Progresso</span>
                                        <span className="text-lg font-black text-white italic">
                                            {Math.round((camp.processed_leads / (camp.total_leads || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${camp.status === 'running' ? 'bg-primary' : 'bg-slate-700'
                                                }`}
                                            style={{ width: `${(camp.processed_leads / (camp.total_leads || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="mt-3 flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                                        <span>Processados</span>
                                        <span className="text-white">{camp.processed_leads} / {camp.total_leads || 0}</span>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl border border-white/5 transition-all flex items-center justify-center gap-3">
                                    <Terminal size={14} className="text-slate-500" /> Detalhes da Operação
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal: Balanced & Clean PT-BR */}
            {showModal && (
                <div className="fixed inset-0 z-[999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6 sm:p-12 overflow-y-auto custom-scrollbar">
                    <div className="my-auto bg-slate-900 max-w-2xl w-full p-8 sm:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                                    {editingCampaignId ? 'Editar Campanha' : 'Nova Campanha'}
                                </h3>
                                <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-2 uppercase">
                                    {editingCampaignId ? 'Ajustar Configurações de Disparo' : 'Configuração de Disparo Massivo'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-4 bg-white/5 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all text-slate-500"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {!hasInfrastructure && (
                            <div className="mb-8 p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-5">
                                <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                                <div>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Infraestrutura Ausente</p>
                                    <p className="text-[9px] text-amber-500/60 leading-tight">Você precisa conectar um canal nas configurações para iniciar os disparos.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-10 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-6">Nome da Campanha</label>
                                <input
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-8 py-5 text-white focus:outline-none focus:border-primary/30 text-base font-bold transition-all"
                                    placeholder="Ex: Aquisição - Varejo SP"
                                    value={newCampaign.name}
                                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-6">Canal de Envio</label>
                                    <div className="flex gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                                        <button
                                            onClick={() => setNewCampaign({ ...newCampaign, channel: 'whatsapp' })}
                                            className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-3 ${newCampaign.channel === 'whatsapp'
                                                ? 'bg-emerald-600 text-white shadow-lg'
                                                : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            <MessageCircle size={14} /> WhatsApp
                                        </button>
                                        <button
                                            onClick={() => setNewCampaign({ ...newCampaign, channel: 'email' })}
                                            className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-3 ${newCampaign.channel === 'email'
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            <Mail size={14} /> E-mail
                                        </button>
                                    </div>
                                </div>

                                {!editingCampaignId && (
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-6">Público Alvo</label>
                                        <select
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-8 py-5 text-white focus:outline-none focus:border-primary/30 text-[10px] appearance-none cursor-pointer font-bold uppercase tracking-widest"
                                            value={newCampaign.target_status}
                                            onChange={e => setNewCampaign({ ...newCampaign, target_status: e.target.value })}
                                        >
                                            <option value="ENRICHED">Leads Enriquecidos</option>
                                            <option value="NEW">Leads Novos</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-6">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Script da Mensagem</label>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-lg font-mono border border-primary/20">{"${name}"}</span>
                                        <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-lg font-mono border border-primary/20">{"${industry}"}</span>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-8 py-8 text-white focus:outline-none focus:border-primary/30 h-40 text-sm leading-relaxed custom-scrollbar placeholder:text-slate-800"
                                    placeholder="Use as tags acima para personalizar automaticamente..."
                                    value={newCampaign.template_content}
                                    onChange={e => setNewCampaign({ ...newCampaign, template_content: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 pt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-5 bg-white/5 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all order-2 sm:order-1"
                                >Cancelar</button>
                                <button
                                    onClick={handleSaveCampaign}
                                    disabled={!hasInfrastructure || !newCampaign.name || !newCampaign.template_content}
                                    className="flex-[2] py-5 bg-primary text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 order-1 sm:order-2 disabled:opacity-20 flex items-center justify-center gap-3 italic"
                                >
                                    {editingCampaignId ? <Edit2 size={16} /> : <Send size={16} />}
                                    <span>{editingCampaignId ? 'Salvar Alterações' : 'Iniciar Disparos'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MassOutreachView;
