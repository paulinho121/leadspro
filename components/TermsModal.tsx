
import React from 'react';
import { X, Shield, ScrollText, Lock, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#020617] w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative group">

                {/* Decorative Header */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-orange-500 to-primary/20"></div>

                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase tracking-[0.1em]">Termos & Privacidade</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">Conformidade LGPD Neural Matrix</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar scroll-smooth">

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                            <ScrollText size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">1. Natureza do Serviço</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                            O LeadFlow é uma plataforma de Software como Serviço (SaaS) que utiliza algoritmos de inteligência artificial e extração de dados públicos para auxiliar empresas na identificação e enriquecimento de Leads B2B.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-500">
                            <Shield size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">2. Conformidade LGPD</h3>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                            <p className="text-sm text-slate-300 font-bold leading-relaxed">
                                LeadFlow atua como OPERADOR de dados, enquanto o USUÁRIO atua como CONTROLADOR.
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                A coleta de dados é estritamente de fontes públicas (Art. 7º, §3º e §4º da LGPD), priorizando a transparência e a finalidade comercial legítima. O usuário deve garantir base legal para abordagens comerciais.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-blue-400">
                            <Lock size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">3. Segurança dos Dados</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">Multi-tenancy</span>
                                <p className="text-xs text-slate-400">Dados isolados via Row Level Security (RLS) no Supabase.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">Transporte Seguro</span>
                                <p className="text-xs text-slate-400">Criptografia ponta-a-ponta via protocolos TLS/SSL.</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 italic">
                            Chaves de API (Gemini, Serper) são armazenadas de forma segura e nunca expostas no front-end.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-orange-400">
                            <CheckCircle2 size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">4. Responsabilidades</h3>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-xs text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                                <span>Proibição absoluta da prática de SPAM via automações.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                                <span>Dever de respeitar pedidos de Opt-out e exclusão de leads.</span>
                            </li>
                            <li className="flex gap-3 text-xs text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                                <span>Propriedade Intelectual protegida por algoritmos de defesa neural.</span>
                            </li>
                        </ul>
                    </section>

                    <div className="pt-8 border-t border-white/5">
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] text-center">
                            Dúvidas ou Relatos de Privacidade: labwpplus@gmail.com
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 bg-white/[0.02] border-t border-white/5 text-center">
                    <button
                        onClick={onClose}
                        className="px-12 py-4 bg-primary text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        Compreendido e de Acordo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
