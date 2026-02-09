
import React, { useState } from 'react';
import {
    MessageSquare, Users, Search, Zap,
    Send, ListPlus, ShieldCheck, Rocket,
    ExternalLink, Copy, CheckCircle2, AlertCircle
} from 'lucide-react';
import { DiscoveryService } from '../services/discoveryService';
import { Lead } from '../types';

interface WhatsAppScoutProps {
    tenantId: string;
    apiKeys: any;
}

const WhatsAppScout: React.FC<WhatsAppScoutProps> = ({ tenantId, apiKeys }) => {
    const [keyword, setKeyword] = useState('');
    const [location, setLocation] = useState('');
    const [groups, setGroups] = useState<Lead[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeStage, setActiveStage] = useState<'scout' | 'extract' | 'broadcast'>('scout');

    // Broadcast State
    const [broadcastNumbers, setBroadcastNumbers] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);

    const handleSearchGroups = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword) return;

        setIsSearching(true);
        try {
            const results = await DiscoveryService.performWhatsAppGroupScan(keyword, location, tenantId, apiKeys);
            setGroups(results);
            if (results.length > 0) {
                alert(`Sucesso! Encontramos ${results.length} grupos potenciais para o nicho ${keyword}.`);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao buscar grupos. Verifique sua chave Serper.');
        } finally {
            setIsSearching(false);
        }
    };

    const startBroadcast = async () => {
        const numbers = broadcastNumbers.split('\n').map(n => n.replace(/\D/g, '')).filter(n => n.length >= 10);
        if (numbers.length === 0 || !broadcastMessage) {
            alert('Insira os números e a mensagem.');
            return;
        }

        setIsSending(true);
        setSendProgress(0);

        for (let i = 0; i < numbers.length; i++) {
            const num = numbers[i];
            // Simulação de delay para evitar banimento (human-like)
            await new Promise(r => setTimeout(r, 1500));

            // Abrir WhatsApp Web com mensagem (Modo Semi-Automático)
            const encodedMsg = encodeURIComponent(broadcastMessage);
            const url = `https://web.whatsapp.com/send?phone=${num}&text=${encodedMsg}`;
            window.open(url, '_blank');

            setSendProgress(((i + 1) / numbers.length) * 100);
        }

        setIsSending(false);
        alert('Processo de multidisparo concluído! Verifique as abas abertas.');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                        <MessageSquare size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">WHATSAPP SCOUT</h2>
                        <p className="text-slate-500 font-medium">Capture grupos por nicho e dispare mensagens para integrantes.</p>
                    </div>
                </div>

                <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveStage('scout')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStage === 'scout' ? 'bg-emerald-500 text-slate-900' : 'text-slate-500 hover:text-white'}`}
                    >
                        1. Radar
                    </button>
                    <button
                        onClick={() => setActiveStage('broadcast')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStage === 'broadcast' ? 'bg-emerald-500 text-slate-900' : 'text-slate-500 hover:text-white'}`}
                    >
                        2. Multidisparo
                    </button>
                </div>
            </div>

            {activeStage === 'scout' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Search Form */}
                    <div className="lg:col-span-1 glass p-8 rounded-[2rem] border border-white/5 h-fit">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <Search size={18} className="text-emerald-500" /> Parâmetros de Busca
                        </h3>
                        <form onSubmit={handleSearchGroups} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nicho / Palavra-Chave</label>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Ex: Odontologia, Marketing..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-emerald-500/50 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Cidades (Opcional)</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Ex: São Paulo, Curitiba..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-emerald-500/50 transition-all font-medium"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="w-full bg-emerald-500 text-slate-900 font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                            >
                                {isSearching ? <Zap size={20} className="animate-spin" /> : <RadarIcon className="w-5 h-5" />}
                                {isSearching ? 'VARRENDO REDE...' : 'ATIVAR RADAR DE GRUPOS'}
                            </button>
                        </form>
                    </div>

                    {/* Results List */}
                    <div className="lg:col-span-2 space-y-4">
                        {groups.length === 0 ? (
                            <div className="glass p-20 rounded-[2rem] border border-white/5 text-center flex flex-col items-center justify-center">
                                <Users size={64} className="text-slate-800 mb-6" />
                                <h4 className="text-xl font-bold text-slate-400">Nenhum grupo mapeado no radar</h4>
                                <p className="text-slate-600 max-w-xs mt-2">Inicie uma busca ao lado para encontrar comunidades do seu nicho.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groups.map((group) => (
                                    <div key={group.id} className="glass p-6 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all group flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                                                    <Users size={20} />
                                                </div>
                                                <span className="text-[10px] font-black bg-white/5 text-slate-500 px-3 py-1 rounded-full border border-white/5">GRUPO ATIVO</span>
                                            </div>
                                            <h4 className="text-white font-bold text-lg mb-1 truncate">{group.name}</h4>
                                            <p className="text-slate-500 text-xs mb-4">Mapeado em {group.location}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => window.open(group.website, '_blank')}
                                                className="flex-1 bg-white/5 hover:bg-emerald-500 hover:text-slate-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                                            >
                                                <ExternalLink size={14} /> Entrar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBroadcastNumbers(prev => prev + 'Novo Número de Grupo\n');
                                                    setActiveStage('broadcast');
                                                }}
                                                className="p-3 bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-500 rounded-xl transition-all border border-white/5"
                                                title="Extrair Membros (Manual)"
                                            >
                                                <ListPlus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeStage === 'broadcast' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Numbers Input */}
                    <div className="glass p-8 rounded-[2rem] border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <ListPlus size={18} className="text-emerald-500" /> Lista de Disparo
                            </h3>
                            <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-full uppercase tracking-tighter">Colite os números do grupo</span>
                        </div>

                        <p className="text-xs text-slate-500 mb-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 flex items-start gap-3">
                            <AlertCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>Dica: Entre no grupo, clique nos dados do grupo, e use o "Extrator Leads Pro" (ou copie os números da lista de membros) e cole abaixo, um por linha.</span>
                        </p>

                        <textarea
                            value={broadcastNumbers}
                            onChange={(e) => setBroadcastNumbers(e.target.value)}
                            placeholder="5511999999999&#10;5521988888888&#10;..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-mono text-sm outline-none focus:border-emerald-500/50 transition-all min-h-[400px] resize-none"
                        />
                    </div>

                    {/* Message & Action */}
                    <div className="flex flex-col gap-6">
                        <div className="glass p-8 rounded-[2rem] border border-white/5 flex-1">
                            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                <Send size={18} className="text-emerald-500" /> Mensagem de Abordagem
                            </h3>

                            <textarea
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                placeholder="Olá {{name}}, vi que você também está no grupo de [Nicho] e resolvi te chamar para..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-emerald-500/50 transition-all min-h-[250px] resize-none mb-6"
                            />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span>Auditando Fila de Disparo</span>
                                    <span className="text-emerald-500">{Math.round(sendProgress)}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${sendProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            <button
                                onClick={startBroadcast}
                                disabled={isSending}
                                className="w-full mt-8 bg-emerald-500 text-slate-900 font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-4 text-lg"
                            >
                                {isSending ? <Zap size={24} className="animate-spin" /> : <Rocket size={24} />}
                                {isSending ? 'DISPARANDO...' : 'INICIAR MULTIDISPARO'}
                            </button>
                        </div>

                        {/* Security Notice */}
                        <div className="glass p-6 rounded-[2rem] border border-red-500/10 bg-red-500/5">
                            <div className="flex items-start gap-4">
                                <ShieldCheck className="text-red-500 shrink-0 mt-1" />
                                <div>
                                    <h4 className="text-white font-bold text-sm">Política Antipspam LeadPro</h4>
                                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                        O multidisparo abre novas abas do WhatsApp Web de forma cadenciada.
                                        Recomendamos não disparar para mais de 50 números por hora para evitar o banimento do seu chip.
                                        O sistema insere um delay humano de 1.5s entre cada abertura.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RadarIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 12L19 12" />
        <path d="M12 12L12 5" />
        <path d="M12 12L5 12" />
        <path d="M12 12L12 19" />
    </svg>
);

export default WhatsAppScout;
