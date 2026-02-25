
import React, { useState, useEffect } from 'react';
import {
    Wallet, CreditCard, ArrowUpRight, ArrowDownLeft,
    History, Sparkles, Zap, ShieldCheck, TrendingUp,
    Download, Filter, Plus, ChevronRight, AlertCircle,
    Clock, CheckCircle2, DollarSign
} from 'lucide-react';
import { BillingService } from '../services/billingService';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

const BillingView: React.FC<{ tenantId: string }> = ({ tenantId }) => {
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const { setCreditBalance } = useStore();

    useEffect(() => {
        fetchData();
    }, [tenantId]);

    const fetchData = async () => {
        if (!tenantId) return;
        setIsLoading(true);
        try {
            const balanceData = await BillingService.getBalance(tenantId);
            setBalance(balanceData);
            setCreditBalance(balanceData);

            const transData = await BillingService.getTransactions(tenantId, 20);
            setTransactions(transData);
        } catch (err) {
            console.error('Erro ao carregar dados financeiros:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getTransactionIcon = (amount: number) => {
        return amount > 0
            ? <ArrowUpRight className="text-emerald-500" size={18} />
            : <ArrowDownLeft className="text-red-500" size={18} />;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header & Wallet Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Balance Card */}
                <div className="lg:col-span-2 glass-strong rounded-[2.5rem] border-white/5 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/20 transition-all duration-700"></div>

                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Saldo Atual</p>
                                    <h2 className="text-xl font-black text-white tracking-tight">Wallet Intelligence</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Status: Ativo</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Créditos Disponíveis</p>
                                <div className="flex items-center gap-4">
                                    <span className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                        {balance.toLocaleString()}
                                    </span>
                                    <div className="flex flex-col">
                                        <Zap className="text-primary mb-1 animate-pulse" size={24} fill="currentColor" />
                                        <span className="text-xs font-black text-primary uppercase">Credits</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() => setShowTopUpModal(true)}
                                    className="px-8 py-4 bg-primary text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Plus size={20} strokeWidth={3} />
                                    Adicionar Créditos
                                </button>
                                <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-3">
                                    <Download size={16} /> Exportar Extrato
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Insights Card */}
                <div className="glass rounded-[2.5rem] border-white/5 p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 blur-[60px] -ml-16 -mb-16"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp size={20} className="text-slate-500" />
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estimativa de Consumo</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                        <Zap size={14} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white leading-none mb-1">Extrações</p>
                                        <p className="text-[10px] text-slate-500">5 créditos / req</p>
                                    </div>
                                </div>
                                <span className="text-sm font-mono font-bold text-white">~{Math.floor(balance / 5)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                        <Sparkles size={14} className="text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white leading-none mb-1">Enriquecimentos</p>
                                        <p className="text-[10px] text-slate-500">10 créditos / lead</p>
                                    </div>
                                </div>
                                <span className="text-sm font-mono font-bold text-white">~{Math.floor(balance / 10)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Plano Atual</span>
                            <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md tracking-widest">Enterprise WL</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '85%' }}></div>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-2 text-right uppercase font-bold tracking-widest">85% da cota mensal utilizada</p>
                    </div>
                </div>

            </div>

            {/* Pricing Modules */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Pacotes de Impulsão Neural</h3>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Seleção de Créditos</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <PricingCard
                        title="Starter Pack"
                        credits={1000}
                        price="97"
                        description="Ideal para testar o Sherlock Mode em nichos específicos."
                        icon={<Zap size={20} />}
                        onTopUp={() => setShowTopUpModal(true)}
                    />
                    <PricingCard
                        title="Business"
                        credits={5000}
                        price="297"
                        description="Perfeito para agências em fase de crescimento."
                        icon={<TrendingUp size={20} />}
                        recommended
                        onTopUp={() => setShowTopUpModal(true)}
                    />
                    <PricingCard
                        title="Pro Elite"
                        credits={20000}
                        price="797"
                        description="Para operação massiva de extração estadual."
                        icon={<Sparkles size={20} />}
                        onTopUp={() => setShowTopUpModal(true)}
                    />
                    <PricingCard
                        title="Custom"
                        credits={0}
                        price="Sob Consulta"
                        description="Precisa de mais de 500k créditos por mês?"
                        icon={<ShieldCheck size={20} />}
                        isCustom
                        onTopUp={() => setShowTopUpModal(true)}
                    />
                </div>
            </div>

            {/* Transactions History */}
            <div className="glass-strong rounded-[2.5rem] border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-white/5 text-slate-400">
                            <History size={20} />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Extrato Inteligente</h3>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Filter className="absolute left-3 top-2.5 text-slate-500" size={14} />
                            <input
                                placeholder="Filtrar por serviço..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-primary/40 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Movimentação</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Serviço/Ação</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Data</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Unidades</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Clock className="text-primary animate-spin" size={32} />
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Consultando Ledger de Blocos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                                    {getTransactionIcon(tx.amount)}
                                                </div>
                                                <span className="text-xs font-bold text-white">{tx.amount > 0 ? 'Recarga' : 'Consumo'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight">{tx.service_name || 'Geral'}</p>
                                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{tx.description}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-mono text-slate-500">{new Date(tx.created_at).toLocaleString('pt-BR')}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-xs font-black ${tx.amount > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Liquidado</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-500">
                                        Nenhuma movimentação registrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Demo Top Up Modal */}
            {showTopUpModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowTopUpModal(false)}></div>
                    <div className="glass-strong border border-white/10 rounded-[3rem] p-10 max-w-lg w-full relative z-[210] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">

                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary animate-neural"></div>

                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 relative">
                                <DollarSign size={40} />
                                <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg">
                                    <CheckCircle2 size={16} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Gateway em Homologação</h4>
                                <p className="text-slate-400 text-sm leading-relaxed px-4">
                                    Estamos integrando os checkouts nativos (Stripe/Asaas). No momento, as recargas são automáticas via Pix Master para garantir sua operação imediata.
                                </p>
                            </div>

                            <div className="w-full space-y-4 pt-4">
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center gap-4 group cursor-pointer hover:bg-white/10 transition-all border-dashed">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cópia de Segurança</p>
                                    <code className="text-[10px] font-mono text-primary font-bold break-all bg-black/40 p-3 rounded-xl w-full">
                                        00020126580014br.gov.bcb.pix0136e1b7f0f1-43ce-4a7b-9128-08c3249352
                                    </code>
                                </div>

                                <button
                                    onClick={() => setShowTopUpModal(false)}
                                    className="w-full py-5 bg-primary text-slate-900 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    Confirmar Transferência
                                </button>

                                <p className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-2">
                                    <ShieldCheck size={12} /> Conexão Criptografada SSL AES-256
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PricingCard = ({ title, credits, price, description, icon, recommended = false, isCustom = false, onTopUp }: any) => (
    <div className={`glass rounded-[2rem] p-6 border transition-all duration-500 relative flex flex-col group ${recommended ? 'border-primary shadow-xl shadow-primary/10 overflow-hidden scale-[1.02]' : 'border-white/5 hover:border-white/20'}`}>
        {recommended && (
            <div className="absolute top-0 right-0 bg-primary text-slate-900 text-[8px] font-black uppercase tracking-widest py-1 px-4 rounded-bl-xl">Recomendado</div>
        )}

        <div className="flex-1 space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${recommended ? 'bg-primary text-slate-900' : 'bg-white/5 text-slate-400 group-hover:text-primary'}`}>
                {icon}
            </div>

            <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tighter">{title}</h4>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>

            {!isCustom && (
                <div className="pt-4 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">R$</span>
                        <span className="text-3xl font-black text-white tracking-tighter">{price}</span>
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{credits.toLocaleString()} Créditos</p>
                </div>
            )}
        </div>

        <button
            onClick={onTopUp}
            className={`w-full mt-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${recommended ? 'bg-primary text-slate-900 hover:scale-[1.02]' : 'bg-white/5 text-white hover:bg-white/10'}`}
        >
            {isCustom ? 'Falar com Consultor' : 'Adquirir Pack'}
            <ChevronRight size={14} />
        </button>
    </div>
);

export default BillingView;
