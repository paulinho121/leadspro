import React, { useState } from 'react';
import {
  MessageCircle, TrendingUp, Linkedin, Archive, Ban, Trash2,
  MoreHorizontal, CheckCircle, Clock, Loader2, Zap, Building2,
  MapPin, Calendar, Globe, Users, CreditCard, Phone, Mail
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface ProfessionalMobileLeadCardProps {
  lead: Lead;
  onEnrich: (lead: Lead) => void;
  onConvertToDeal: (leadId: string) => void;
  onPark: (leadId: string) => void;
  onDiscard: (leadId: string) => void;
  onDelete: (leadId: string) => void;
}

// Componente de Status Mobile
const MobileStatus: React.FC<{ status: LeadStatus; lastUpdated?: string }> = ({ status, lastUpdated }) => {
  const getStatusConfig = () => {
    switch (status) {
      case LeadStatus.ENRICHED:
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500/30',
          icon: <CheckCircle size={14} />,
          text: 'Enriquecido'
        };
      case LeadStatus.NEW:
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20',
          borderColor: 'border-amber-500/30',
          icon: <Clock size={14} />,
          text: 'Pendente'
        };
      default:
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/20',
          borderColor: 'border-slate-500/30',
          icon: <Clock size={14} />,
          text: 'Desconhecido'
        };
    }
  };

  const config = getStatusConfig();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias`;
    return `${Math.floor(diffDays / 7)} sem`;
  };

  return (
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor}`}>
        <div className={`${config.color}`}>
          {config.icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-white">
          {config.text}
        </span>
      </div>
      
      {lastUpdated && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={10} />
          <span>{formatDate(lastUpdated)}</span>
        </div>
      )}
    </div>
  );
};

// Componente de Informações Principais
const CompanyHeader: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div className="relative shrink-0">
        {lead.details?.placeImage && !imgError ? (
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-600/30 shadow-lg">
            <img
              src={lead.details.placeImage}
              alt="Logo"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center border border-slate-600/30">
            <Building2 size={28} className="text-slate-400" />
          </div>
        )}
        
        {/* Status Indicator */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800"
          style={{
            backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#64748b',
            boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 12px var(--color-primary)' : 'none',
          }}
        />
      </div>

      {/* Company Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-white leading-tight mb-1">
          {lead.details?.tradeName || lead.name}
        </h3>
        
        {lead.details?.legalName && lead.details.legalName !== lead.name && (
          <p className="text-sm text-slate-400 mb-2 truncate">{lead.details.legalName}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>ID: {lead.id.slice(0, 8).toUpperCase()}</span>
          {lead.details?.cnpj && (
            <span>CNPJ: {lead.details.cnpj.slice(0, 8)}.***</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de Informações de Contato e Localização
const ContactLocationInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Localização */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-600/20">
        <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
          <MapPin size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {lead.location}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {lead.industry}
          </div>
        </div>
      </div>

      {/* Telefone */}
      {lead.phone && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Phone size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {lead.phone}
            </div>
            <div className="text-xs text-emerald-400">WhatsApp disponível</div>
          </div>
        </div>
      )}

      {/* Email */}
      {lead.details?.email && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Mail size={18} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white truncate">
              {lead.details.email}
            </div>
            <div className="text-xs text-blue-400">E-mail validado</div>
          </div>
        </div>
      )}

      {/* Website */}
      {lead.website && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-600/20">
          <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
            <Globe size={18} className="text-slate-400" />
          </div>
          <a 
            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm text-primary hover:text-primary/80 transition-colors truncate"
          >
            {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        </div>
      )}
    </div>
  );
};

// Componente de Ações Mobile
const MobileActions: React.FC<{ lead: Lead; actions: ProfessionalMobileLeadCardProps }> = ({ lead, actions }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const handleEnrich = async () => {
    if (isProcessing || lead.status === LeadStatus.ENRICHED) return;
    
    setIsProcessing(true);
    try {
      await actions.onEnrich(lead);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsApp = () => {
    const clean = lead.phone?.replace(/\D/g, '');
    if (!clean) return;
    const fullPhone = clean.startsWith('55') ? clean : `55${clean}`;
    const company = lead.details?.tradeName || lead.name;
    const city = lead.location.split(',')[0];
    const message = `Olá! Vi que a ${company} atua em ${city}. Gostaria de conversar sobre possíveis parcerias.`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const primaryActions = [
    {
      icon: <Zap size={20} />,
      label: isProcessing ? 'Processando...' : (lead.status === LeadStatus.ENRICHED ? 'Enriquecido' : 'Enriquecer'),
      color: lead.status === LeadStatus.ENRICHED ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-primary text-slate-900',
      action: handleEnrich,
      disabled: isProcessing || lead.status === LeadStatus.ENRICHED
    },
    {
      icon: <MessageCircle size={20} />,
      label: 'WhatsApp',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      action: handleWhatsApp,
      disabled: !lead.phone
    }
  ];

  const secondaryActions = [
    {
      icon: <Linkedin size={18} />,
      label: 'LinkedIn',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      action: () => window.open(lead.socialLinks?.linkedin, '_blank'),
      disabled: !lead.socialLinks?.linkedin
    },
    {
      icon: <TrendingUp size={18} />,
      label: 'Funil',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      action: () => actions.onConvertToDeal(lead.id),
      disabled: lead.status !== LeadStatus.ENRICHED
    },
    {
      icon: <Archive size={18} />,
      label: 'Arquivar',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      action: () => actions.onPark(lead.id)
    },
    {
      icon: <Ban size={18} />,
      label: 'Descartar',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      action: () => actions.onDiscard(lead.id)
    },
    {
      icon: <Trash2 size={18} />,
      label: 'Excluir',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      action: () => actions.onDelete(lead.id)
    }
  ];

  return (
    <div className="space-y-4">
      {/* Ações Primárias - ESCONDIDAS */}
      <div className="hidden">
        <div className="grid grid-cols-2 gap-3">
          {primaryActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={action.disabled}
              className={`
                flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm uppercase tracking-wider
                transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]
                ${action.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : `${action.color} hover:scale-[1.02]`
                }
              `}
            >
              {isProcessing && index === 0 ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                action.icon
              )}
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ações Secundárias */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {secondaryActions.slice(0, 2).map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={action.disabled}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-200 active:scale-[0.95]
                ${action.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : `${action.bgColor} ${action.color} hover:scale-105`
                }
              `}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowMoreActions(!showMoreActions)}
          className="p-3 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all duration-300 border border-slate-600/30"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Menu Expandido */}
      {showMoreActions && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-600/30">
          {secondaryActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.action();
                setShowMoreActions(false);
              }}
              disabled={action.disabled}
              className={`
                flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs
                transition-all duration-200 active:scale-[0.95]
                ${action.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : `${action.bgColor} ${action.color} hover:scale-105`
                }
              `}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProfessionalMobileLeadCard: React.FC<ProfessionalMobileLeadCardProps> = (props) => {
  const { lead } = props;

  return (
    <div className="glass-strong rounded-3xl border border-white/5 p-6 space-y-6 active:scale-[0.98] transition-all duration-300">
      
      {/* Header */}
      <div className="space-y-4">
        <CompanyHeader lead={lead} />
        <MobileStatus status={lead.status} lastUpdated={lead.lastUpdated} />
      </div>

      {/* Informações de Contato e Localização */}
      <ContactLocationInfo lead={lead} />

      {/* Ações */}
      <MobileActions lead={lead} actions={props} />

    </div>
  );
};
