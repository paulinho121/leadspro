
import React from 'react';
import {
  X, Instagram, Facebook, Globe, Search,
  MessageCircle, Phone, MapPin,
  Building2, Hash, Calendar, Layers, Zap,
  BrainCircuit, Sparkles, Cpu, Atom
} from 'lucide-react';
import { Lead } from '../types';

interface EnrichmentModalProps {
  lead: Lead;
  onClose: () => void;
  onEnrichComplete?: (id: string, insights: string, details: any) => void;
}

const EnrichmentModal: React.FC<EnrichmentModalProps> = ({ lead, onClose }) => {
  const details = lead.details || {};
  const score = details.ai_score || 0;

  const handleSocialClick = (url?: string) => {
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in text-left">
      <div className="glass rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 relative">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32"></div>

        {/* Header */}
        <div className="px-10 pt-10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group/icon ${score > 0 ? 'bg-primary text-slate-950' : 'liquid-gradient text-white'}`}>
              <div className="absolute inset-0 bg-white/20 animate-spin-slow opacity-0 group-hover/icon:opacity-100"></div>
              <BrainCircuit size={28} className="relative z-10 animate-neural" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight">Painel de Inteligência</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] font-bold">Modo_Enriquecimento_Ativo</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Lead Identity Section */}
        <div className="px-10 py-8 relative z-10">
          <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 space-y-6">
            <div className="flex justify-between items-start">
              <div className="max-w-[70%]">
                <h3 className="text-3xl font-black text-white mb-2 tracking-tighter truncate" title={details.tradeName || lead.name}>
                  {details.tradeName || lead.name}
                </h3>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <MapPin size={14} className="text-primary" /> {details.address || lead.location}
                </p>
              </div>
              {lead.socialLinks?.cnpj && (
                <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-mono text-primary font-black uppercase tracking-widest">CNPJ: {lead.socialLinks.cnpj}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <DetailCard icon={<Layers size={14} />} label="Setor/CNAE" value={details.activity || lead.industry || 'N/A'} />
              <DetailCard icon={<Calendar size={14} />} label="Fundação" value={details.foundedDate || 'Desconhecido'} />
              <DetailCard icon={<Hash size={14} />} label="Porte" value={details.size || 'Não Inf.'} />
              <DetailCard
                icon={<Zap size={14} className="animate-pulse text-primary" />}
                label="Lead Score"
                value={score > 0 ? `${(score / 10).toFixed(1)}/10` : 'Pendente'}
                highlight={score > 70}
              />
            </div>
          </div>
        </div>

        {/* AI Insight Box */}
        {lead.ai_insights && (
          <div className="px-10 pb-6 relative z-10">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-125">
                <Atom size={60} className="text-primary animate-spin-slow" />
              </div>
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Insight // Beta</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed italic">
                "{lead.ai_insights}"
              </p>
            </div>
          </div>
        )}

        {/* Neural Actions Grid (Social Links) */}
        <div className="px-10 pb-6 grid grid-cols-4 gap-4 relative z-10">
          <SourceButton
            icon={<Globe size={24} className="text-blue-400" />}
            label="SITE"
            onClick={() => handleSocialClick(lead.website)}
            disabled={!lead.website}
          />
          <SourceButton
            icon={<Instagram size={24} className="text-magenta-500" />}
            label="INSTA"
            onClick={() => handleSocialClick(details.instagram)}
            disabled={!details.instagram}
          />
          <SourceButton
            icon={<Facebook size={24} className="text-blue-600" />}
            label="FB"
            onClick={() => handleSocialClick(details.facebook)}
            disabled={!details.facebook}
          />
          <SourceButton
            icon={<Search size={24} className="text-primary" />}
            label="LOCAL"
            onClick={() => handleSocialClick(lead.socialLinks?.map_link)}
            disabled={!lead.socialLinks?.map_link}
          />
        </div>

        {/* Primary Contact Actions */}
        <div className="px-10 pb-10 space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-5">
            <button
              onClick={() => {
                const clean = lead.phone?.replace(/\D/g, '');
                if (!clean) return;

                const ddi = clean.startsWith('55') ? '' : '55';
                const fullPhone = `${ddi}${clean}`;

                // Smart Outreach Logic
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
                const company = details.tradeName || lead.name;
                const city = (details.address || lead.location).split(',')[0];

                let message = '';

                if (lead.ai_insights) {
                  // IA Powered Message
                  message = `${greeting}, tudo bem na ${company}?\n\nEstava analisando o mercado de ${details.activity || lead.industry} em ${city} e vi o destaque de vocês.\n\n"${lead.ai_insights.split('.')[0]}."\n\nCom base nisso, tenho uma proposta que faz muito sentido. Podemos conversar rapidinho?`;
                } else {
                  // Standard Contextual Message
                  message = `${greeting}! Vi que a ${company} é referência em ${details.activity || lead.industry} na região de ${city}.\n\nGostaria de apresentar uma solução ideal para empresas do seu porte. Tem um minuto?`;
                }

                window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="group flex items-center justify-center gap-4 bg-[#12b886] hover:bg-[#0ca678] text-white py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 hover:scale-[1.02]"
            >
              <MessageCircle size={24} fill="white" className="group-hover:rotate-12 transition-transform" />
              ABRIR WHATSAPP
            </button>
            <button
              onClick={() => lead.phone && (window.location.href = `tel:${lead.phone}`)}
              className="group flex items-center justify-center gap-4 bg-primary text-slate-900 py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:scale-[1.02]"
            >
              <Phone size={24} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
              LIGAR AGORA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailCard = ({ icon, label, value, highlight = false }: any) => (
  <div className={`p-4 rounded-2xl border border-white/5 flex flex-col gap-2 ${highlight ? 'bg-primary/5 border-primary/10' : 'bg-white/[0.02]'}`}>
    <div className="flex items-center gap-2 text-slate-500">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className={`text-xs font-bold truncate ${highlight ? 'text-primary' : 'text-slate-300'}`}>{value}</div>
  </div>
);

const SourceButton = ({ icon, label, onClick, disabled }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center p-6 border border-white/5 transition-all rounded-[2rem] group ${disabled ? 'opacity-30 cursor-not-allowed' : 'bg-white/[0.03] hover:border-primary/30 hover:bg-white/[0.06]'}`}
  >
    <div className={`p-3 bg-white/5 rounded-2xl mb-3 ${!disabled && 'group-hover:scale-110'} transition-transform shadow-lg`}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-500 tracking-[0.15em] group-hover:text-slate-300 transition-colors uppercase">{label}</span>
  </button>
);

export default EnrichmentModal;
