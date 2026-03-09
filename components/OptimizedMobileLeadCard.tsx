import React, { useState } from 'react';
import {
  MessageCircle, TrendingUp, Linkedin, Archive, Ban, Trash2,
  MoreHorizontal, CheckCircle, Clock, Loader2, Zap, MapPin
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface OptimizedMobileLeadCardProps {
  lead: Lead;
  onEnrich: (lead: Lead) => void;
  onConvertToDeal: (leadId: string) => void;
  onPark: (leadId: string) => void;
  onDiscard: (leadId: string) => void;
  onDelete: (leadId: string) => void;
}

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case LeadStatus.ENRICHED:
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500/30',
          text: 'Optimized'
        };
      case LeadStatus.NEW:
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20',
          borderColor: 'border-amber-500/30',
          text: 'Pending'
        };
      default:
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/20',
          borderColor: 'border-slate-500/30',
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bgColor} ${config.borderColor}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  hoverColor: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, color, hoverColor, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 active:scale-95 ${
      disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : `${hoverColor} hover:scale-105`
    }`}
  >
    <div className={`${color}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium text-slate-300">
      {label}
    </span>
  </button>
);

export const OptimizedMobileLeadCard: React.FC<OptimizedMobileLeadCardProps> = (props) => {
  const { lead } = props;
  const [imgError, setImgError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleEnrich = async () => {
    if (isProcessing || lead.status === LeadStatus.ENRICHED) return;
    
    setIsProcessing(true);
    try {
      await props.onEnrich(lead);
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
    const message = `Olá! Vi que a ${company} atua em ${city}. Gostaria de conversar.`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="glass-strong rounded-2xl border border-white/5 p-4 space-y-4 active:scale-[0.98] transition-all duration-300">
      {/* Header Principal */}
      <div className="flex items-start gap-4">
        {/* Avatar/Imagem */}
        <div className="relative shrink-0">
          {lead.details?.placeImage && !imgError ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-600/30 shadow-lg">
              <img
                src={lead.details.placeImage}
                alt="Fachada"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center border border-slate-600/30">
              <div 
                className="w-3.5 h-3.5 rounded-full"
                style={{
                  backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#64748b',
                  boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 10px var(--color-primary)' : 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Informações Principais */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base font-bold text-white leading-tight truncate">
              {lead.details?.tradeName || lead.name}
            </h3>
            <StatusBadge status={lead.status} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={12} className="text-primary/60" />
              <span className="text-sm truncate">{lead.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-500">
              <div className="text-xs font-mono uppercase tracking-wider">
                ID: {lead.id.slice(0, 8).toUpperCase()}
              </div>
              <div className="text-xs font-medium uppercase tracking-wider">
                {lead.industry}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ação Principal */}
      <button
        onClick={handleEnrich}
        disabled={isProcessing || lead.status === LeadStatus.ENRICHED}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 shadow-lg ${
          isProcessing 
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
            : lead.status === LeadStatus.ENRICHED
            ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
            : 'bg-primary text-slate-900 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap size={16} />
            {lead.status === LeadStatus.ENRICHED ? 'Already Enriched' : 'Enrich Now'}
          </>
        )}
      </button>

      {/* Ações Secundárias */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActionButton
            icon={<MessageCircle size={16} />}
            label="WhatsApp"
            color="text-emerald-400"
            hoverColor="hover:bg-emerald-500/10"
            onClick={handleWhatsApp}
            disabled={!lead.phone}
          />
          
          {lead.socialLinks?.linkedin && (
            <a
              href={lead.socialLinks.linkedin}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 active:scale-95 hover:bg-blue-500/10 hover:scale-105"
            >
              <Linkedin size={16} className="text-blue-400" />
              <span className="text-[10px] font-medium text-slate-300">LinkedIn</span>
            </a>
          )}
        </div>

        <button
          onClick={() => setShowActions(!showActions)}
          className="p-3 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all duration-300 border border-slate-600/30"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Menu Expandido */}
      {showActions && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-600/30">
          <ActionButton
            icon={<TrendingUp size={16} />}
            label="Pipeline"
            color="text-violet-400"
            hoverColor="hover:bg-violet-500/10"
            onClick={() => props.onConvertToDeal(lead.id)}
            disabled={lead.status !== LeadStatus.ENRICHED}
          />
          
          <ActionButton
            icon={<Archive size={16} />}
            label="Archive"
            color="text-amber-400"
            hoverColor="hover:bg-amber-500/10"
            onClick={() => props.onPark(lead.id)}
          />
          
          <ActionButton
            icon={<Ban size={16} />}
            label="Discard"
            color="text-orange-400"
            hoverColor="hover:bg-orange-500/10"
            onClick={() => props.onDiscard(lead.id)}
          />
          
          <ActionButton
            icon={<Trash2 size={16} />}
            label="Delete"
            color="text-red-400"
            hoverColor="hover:bg-red-500/10"
            onClick={() => props.onDelete(lead.id)}
          />
        </div>
      )}
    </div>
  );
};
