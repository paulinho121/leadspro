
import React from 'react';
import {
  X, Instagram, Facebook, Globe, Search,
  MessageCircle, Phone, MapPin, Mail,
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in text-left">
      <div className="glass rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 relative flex flex-col">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32"></div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden group/icon ${score > 0 ? 'bg-primary text-slate-950' : 'liquid-gradient text-white'}`}>
                <div className="absolute inset-0 bg-white/20 animate-spin-slow opacity-0 group-hover/icon:opacity-100"></div>
                <BrainCircuit size={20} className="relative z-10 animate-neural" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">Painel de Inteligência</h2>
                <span className="text-[8px] font-mono text-primary uppercase tracking-[0.2em] font-bold">Modo_Enriquecimento_Ativo</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Lead Identity Section */}
          <div className="px-6 sm:px-10 py-4 sm:py-6 relative z-10">
            <div className="p-5 sm:p-6 bg-white/[0.03] rounded-[1.5rem] border border-white/5 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="max-w-[70%]">
                  {details.placeImage && (
                    <div className="mb-4 relative group/facade h-48 lg:h-56 w-full rounded-[1.5rem] overflow-hidden border border-white/5 shadow-2xl">
                      <img
                        src={details.placeImage}
                        alt="Fachada do Local"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/facade:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="p-1.5 bg-primary/20 backdrop-blur-md rounded-lg border border-primary/30">
                          <MapPin size={12} className="text-primary" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest shadow-sm">Vista da Fachada</span>
                      </div>
                    </div>
                  )}
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tighter truncate" title={details.tradeName || lead.name}>
                    {details.tradeName || lead.name}
                  </h3>
                  <p className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1.5">
                    <MapPin size={12} className="text-primary" /> {details.address || lead.location}
                  </p>
                </div>
                {lead.socialLinks?.cnpj && (
                  <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg shrink-0">
                    <span className="text-[8px] font-mono text-primary font-black uppercase tracking-widest">CNPJ: {lead.socialLinks.cnpj}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailCard icon={<Layers size={12} />} label="Setor/CNAE" value={details.activity || lead.industry || 'N/A'} />
                <DetailCard icon={<Calendar size={12} />} label="Fundação" value={details.foundedDate || 'Desconhecido'} />
                <DetailCard icon={<Hash size={12} />} label="Porte" value={details.size || 'Não Inf.'} />
                <DetailCard
                  icon={<Zap size={12} className="animate-pulse text-primary" />}
                  label="Lead Score"
                  value={score > 0 ? `${(score / 10).toFixed(1)}/10` : 'Pendente'}
                  highlight={score > 70}
                />
              </div>

              {/* AI Diagnostics Indicators */}
              {details.whatsapp_status && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">WhatsApp</span>
                    <span className={`text-[9px] font-bold ${details.whatsapp_status === 'Confirmado' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {details.whatsapp_status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Anúncios</span>
                    <span className={`text-[9px] font-bold ${details.ads_status === 'Ativo' ? 'text-primary' : 'text-slate-300'}`}>
                      {details.ads_status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Maturidade</span>
                    <span className="text-[9px] font-bold text-white">
                      {details.digital_maturity}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Instagram</span>
                    <span className={`text-[9px] font-bold ${details.instagram_status === 'Ativo' ? 'text-magenta-400' : 'text-slate-300'}`}>
                      {details.instagram_status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Insight Box */}
          {lead.ai_insights && (
            <div className="px-6 sm:px-10 pb-4 relative z-10">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-[1.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-700">
                  <Atom size={40} className="text-primary animate-spin-slow" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Sparkles size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Neural Insight</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed italic">
                  "{lead.ai_insights}"
                </p>
              </div>
            </div>
          )}

          {/* Neural Actions Grid (Social Links) - More compact */}
          <div className="px-6 sm:px-10 pb-4 grid grid-cols-5 gap-2 relative z-10">
            <SourceButton
              icon={<Globe size={16} className="text-blue-400" />}
              label="SITE"
              onClick={() => handleSocialClick(lead.website)}
              disabled={!lead.website}
            />
            <SourceButton
              icon={<Instagram size={16} className="text-magenta-500" />}
              label="INSTA"
              onClick={() => handleSocialClick(details.instagram)}
              disabled={!details.instagram}
            />
            <SourceButton
              icon={<Mail size={16} className="text-primary shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
              label="EMAIL"
              onClick={() => {
                const email = details.real_email || lead.email;
                if (email) {
                  navigator.clipboard.writeText(email);
                  alert('Email copiado: ' + email);
                }
              }}
              disabled={!details.real_email && !lead.email}
            />
            <SourceButton
              icon={<Facebook size={16} className="text-blue-600" />}
              label="FB"
              onClick={() => handleSocialClick(details.facebook)}
              disabled={!details.facebook}
            />
            <SourceButton
              icon={<Search size={16} className="text-primary" />}
              label="LOCAL"
              onClick={() => handleSocialClick(lead.socialLinks?.map_link)}
              disabled={!lead.socialLinks?.map_link}
            />
          </div>
        </div>

        {/* Primary Contact Actions - FIXED AT BOTTOM */}
        <div className="px-6 sm:px-10 pb-6 sm:pb-8 pt-4 bg-slate-900 border-t border-white/5 relative z-20">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => {
                const clean = lead.phone?.replace(/\D/g, '');
                if (!clean) return;

                const ddi = clean.startsWith('55') ? '' : '55';
                const fullPhone = `${ddi}${clean}`;

                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
                const company = details.tradeName || lead.name;
                const city = (details.address || lead.location).split(',')[0];

                let message = '';
                if (lead.ai_insights) {
                  message = `${greeting}, tudo bem na ${company}?\n\nEstava analisando o mercado de ${details.activity || lead.industry} em ${city} e vi o destaque de vocês.\n\n"${lead.ai_insights.split('.')[0]}."\n\nCom base nisso, tenho uma proposta que faz muito sentido. Podemos conversar rapidinho?`;
                } else {
                  message = `${greeting}! Vi que a ${company} é referência em ${details.activity || lead.industry} na região de ${city}.\n\nGostaria de apresentar uma solução ideal para empresas do seu porte. Tem um minuto?`;
                }

                window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="group flex items-center justify-center gap-2 sm:gap-3 bg-[#12b886] hover:bg-[#0ca678] text-white py-4 sm:py-5 rounded-[1.2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 hover:scale-[1.02]"
            >
              <MessageCircle size={20} fill="white" className="group-hover:rotate-12 transition-transform" />
              ABRIR WHATSAPP
            </button>
            <button
              onClick={() => lead.phone && (window.location.href = `tel:${lead.phone}`)}
              className="group flex items-center justify-center gap-2 sm:gap-3 bg-primary text-slate-900 py-4 sm:py-5 rounded-[1.2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:scale-[1.02]"
            >
              <Phone size={20} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
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
