
import React from 'react';
import {
  X, Instagram, Facebook, Globe, Search,
  MessageCircle, Phone, MapPin, Mail,
  Building2, Hash, Calendar, Layers, Zap,
  BrainCircuit, Sparkles, Cpu, Atom, Linkedin, User, Brain
} from 'lucide-react';
import { Lead } from '../types';
import { toast } from './Toast';

interface EnrichmentModalProps {
  lead: Lead;
  onClose: () => void;
  onEnrichComplete?: (id: string, insights: string, details: any) => void;
}

const EnrichmentModal: React.FC<EnrichmentModalProps> = ({ lead, onClose }) => {
  const [imgError, setImgError] = React.useState(false);
  const details = lead.details || {};
  const score = details.ai_score || 0;

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}`, '_blank');
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
                  {details.placeImage && !imgError && (
                    <div className="mb-4 relative group/facade h-48 lg:h-56 w-full rounded-[1.5rem] overflow-hidden border border-white/5 shadow-2xl">
                      <img
                        src={details.placeImage}
                        alt="Fachada do Local"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/facade:scale-110"
                        onError={() => setImgError(true)}
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

              {/* Advanced Data Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailCard icon={<Layers size={12} />} label="Setor/CNAE" value={details.activity || lead.industry || 'Indústria Local'} />
                <DetailCard icon={<Calendar size={12} />} label="Fundação" value={details.foundedDate || 'Desconhecido'} />
                <DetailCard icon={<Hash size={12} />} label="Porte" value={details.size || 'Não identificado'} />
                <DetailCard icon={<Zap size={12} className="text-primary" />} label="Lead Score" value={score > 0 ? `${(score / 10).toFixed(1)}/10` : 'Pendente'} />
                <DetailCard icon={<User size={12} />} label="Funcionários" value={details.employee_count || 'Sob consulta'} />
                <DetailCard icon={<Phone size={12} />} label="Telefone" value={lead.phone || 'Não informado'} />
              </div>

              {/* Partners and Decision Makers Section */}
              {details.partners && Array.isArray(details.partners) && details.partners.length > 0 && (
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Sócios e Decisores (LinkedIn Intelligence)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {details.partners.map((p: any, i: number) => {
                      const partnerName = typeof p === 'string' ? p : p.nome || p.name;
                      const partnerRole = typeof p === 'object' ? p.cargo || p.role : '';
                      const linkedinSearchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(partnerName + ' ' + (details.tradeName || lead.name))}`;

                      return (
                        <div key={i} className="flex items-center gap-1 group/partner">
                          <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-bold text-primary flex flex-col">
                            <span>{partnerName}</span>
                            {partnerRole && <span className="text-[8px] opacity-60 font-medium">{partnerRole}</span>}
                          </span>
                          <a
                            href={linkedinSearchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg opacity-0 group-hover/partner:opacity-100 transition-all hover:bg-blue-600 hover:text-white"
                            title={`Buscar ${partnerName} no LinkedIn`}
                          >
                            <Linkedin size={10} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deep Response Channels (IA Discovery) */}
              {(details.partners_contacts || details.realPhones) && (
                <div className="p-4 rounded-2xl border border-primary/10 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Canais de Resposta Direta (Neural Discovery)</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {details.partners_contacts && Array.isArray(details.partners_contacts) && details.partners_contacts.map((c: string, i: number) => (
                      <span key={i} className="text-[10px] text-white font-bold flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                        {c}
                      </span>
                    ))}
                    {details.realPhones && Array.isArray(details.realPhones) && details.realPhones.map((p: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => openWhatsApp(p)}
                        className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1 group/wa"
                      >
                        <MessageCircle size={10} className="group-hover/wa:scale-110 transition-transform" />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hunter.io Emails Section */}
              {details.hunterEmails && Array.isArray(details.hunterEmails) && details.hunterEmails.length > 0 && (
                <div className="p-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Mail size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">E-mails Corporativos (Hunter Intelligence)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {details.hunterEmails.map((email: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => {
                          const cleanEmail = email.split(' ')[0];
                          navigator.clipboard.writeText(cleanEmail);
                          toast.success('E-mail copiado!', cleanEmail);
                        }}
                        className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all"
                        title="Clique para copiar"
                      >
                        {email}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Status Indicators */}
              {details.whatsapp_status && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-white/5">
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
                      {details.digital_maturity || 'Média'}
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
                  <Brain size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Plano de Ataque Neural</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed italic">
                  "{lead.ai_insights}"
                </p>
              </div>
            </div>
          )}

          {/* Social Access Grid */}
          <div className="px-6 sm:px-10 pb-4 grid grid-cols-6 gap-2 relative z-10">
            <SourceButton
              icon={<Globe size={16} className="text-blue-400" />}
              label="SITE"
              onClick={() => lead.website && window.open(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`, '_blank')}
              disabled={!lead.website}
            />
            <SourceButton
              icon={<Instagram size={16} className="text-pink-500" />}
              label="INSTA"
              onClick={() => details.instagram && window.open(details.instagram, '_blank')}
              disabled={!details.instagram}
            />
            <SourceButton
              icon={<Linkedin size={16} className="text-blue-500" />}
              label="LNKD"
              onClick={() => lead.socialLinks?.linkedin && window.open(lead.socialLinks.linkedin, '_blank')}
              disabled={!lead.socialLinks?.linkedin}
            />
            <SourceButton
              icon={<Mail size={16} className="text-primary shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
              label="EMAIL"
              onClick={() => {
                const email = details.real_email || lead.email;
                if (email) {
                  navigator.clipboard.writeText(email);
                  toast.success('E-mail copiado!', email);
                }
              }}
              disabled={!details.real_email && !lead.email}
            />
            <SourceButton
              icon={<Facebook size={16} className="text-blue-600" />}
              label="FB"
              onClick={() => details.facebook && window.open(details.facebook, '_blank')}
              disabled={!details.facebook}
            />
            <SourceButton
              icon={<Search size={16} className="text-primary" />}
              label="LOCAL"
              onClick={() => lead.socialLinks?.map_link && window.open(lead.socialLinks.map_link, '_blank')}
              disabled={!lead.socialLinks?.map_link}
            />
          </div>
        </div>

        {/* Primary Contact Actions */}
        <div className="px-6 sm:px-10 pb-6 sm:pb-8 pt-4 bg-slate-900 border-t border-white/5 relative z-20">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => {
                const clean = lead.phone?.replace(/\D/g, '');
                if (!clean) return;
                const fullPhone = clean.startsWith('55') ? clean : `55${clean}`;
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
                const company = details.tradeName || lead.name;
                const city = (details.address || lead.location).split(',')[0];
                let message = `${greeting}! Vi que a ${company} é uma referência em ${details.activity || lead.industry} na região de ${city}. Tem um minuto para conversarmos?`;
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
