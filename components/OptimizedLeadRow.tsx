import React, { useState } from 'react';
import {
  MessageCircle, TrendingUp, Linkedin, Archive, Ban, Trash2,
  MoreHorizontal, CheckCircle, Clock, Loader2, Zap
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface OptimizedLeadRowProps {
  lead: Lead;
  onEnrich: (lead: Lead) => void;
  onConvertToDeal: (leadId: string) => void;
  onPark: (leadId: string) => void;
  onDiscard: (leadId: string) => void;
  onDelete: (leadId: string) => void;
}

const StatusIndicator: React.FC<{ status: LeadStatus; progress?: number }> = ({ status, progress = 0 }) => {
  const getStatusConfig = () => {
    switch (status) {
      case LeadStatus.ENRICHED:
        return {
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          icon: <CheckCircle size={14} />,
          text: 'Optimized',
          progress: 100
        };
      case LeadStatus.NEW:
        return {
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          icon: <Clock size={14} />,
          text: 'Pending Review',
          progress: progress
        };
      default:
        return {
          color: 'text-slate-500',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
          icon: <Clock size={14} />,
          text: 'Unknown',
          progress: 0
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} transition-all duration-300`}>
        <div className={`${config.color}`}>
          {config.icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {config.text}
        </span>
      </div>
      
      {status === LeadStatus.NEW && progress > 0 && (
        <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

const ActionGroup: React.FC<{ lead: Lead; actions: OptimizedLeadRowProps }> = ({ lead, actions }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePrimaryAction = async () => {
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
    const message = `Olá! Vi que a ${company} atua em ${city}. Gostaria de conversar.`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Ação Primária */}
      <button
        onClick={handlePrimaryAction}
        disabled={isProcessing || lead.status === LeadStatus.ENRICHED}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl
          ${isProcessing 
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
            : lead.status === LeadStatus.ENRICHED
            ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
            : 'bg-primary text-slate-900 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
          }`}
      >
        {isProcessing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap size={14} />
            {lead.status === LeadStatus.ENRICHED ? 'Enriched' : 'Enrich'}
          </>
        )}
      </button>

      {/* Menu Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-2.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all duration-300 border border-slate-600/30"
        >
          <MoreHorizontal size={16} />
        </button>

        {isDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
              <div className="p-2 space-y-1">
                {/* WhatsApp */}
                {lead.phone && (
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-200 text-slate-300"
                  >
                    <MessageCircle size={14} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">WhatsApp</div>
                      <div className="text-xs text-slate-500">Enviar mensagem</div>
                    </div>
                  </button>
                )}

                {/* LinkedIn */}
                {lead.socialLinks?.linkedin && (
                  <a
                    href={lead.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200 text-slate-300"
                  >
                    <Linkedin size={14} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">LinkedIn</div>
                      <div className="text-xs text-slate-500">Ver perfil</div>
                    </div>
                  </a>
                )}

                {/* Pipeline */}
                {lead.status === LeadStatus.ENRICHED && (
                  <button
                    onClick={() => {
                      actions.onConvertToDeal(lead.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-violet-500/10 hover:text-violet-400 transition-all duration-200 text-slate-300"
                  >
                    <TrendingUp size={14} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Pipeline</div>
                      <div className="text-xs text-slate-500">Mover para vendas</div>
                    </div>
                  </button>
                )}

                {/* Separador */}
                <div className="border-t border-slate-600/30 my-1" />

                {/* Arquivar */}
                <button
                  onClick={() => {
                    actions.onPark(lead.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-amber-500/10 hover:text-amber-400 transition-all duration-200 text-slate-300"
                >
                  <Archive size={14} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Arquivar</div>
                    <div className="text-xs text-slate-500">Mover para admin</div>
                  </div>
                </button>

                {/* Descartar */}
                <button
                  onClick={() => {
                    actions.onDiscard(lead.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-slate-300"
                >
                  <Ban size={14} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Descartar</div>
                    <div className="text-xs text-slate-500">Remover da lista</div>
                  </div>
                </button>

                {/* Excluir */}
                <button
                  onClick={() => {
                    actions.onDelete(lead.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-red-500/20 hover:text-red-500 transition-all duration-200 text-slate-300"
                >
                  <Trash2 size={14} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Excluir</div>
                    <div className="text-xs text-slate-500">Apagar permanentemente</div>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CompanyInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {/* Avatar/Imagem */}
      <div className="relative shrink-0">
        {lead.details?.placeImage && !imgError ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-600/30 shadow-lg group-hover:border-primary/30 transition-all duration-300">
            <img
              src={lead.details.placeImage}
              alt="Fachada"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center border border-slate-600/30">
            <div 
              className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#64748b',
                boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 10px var(--color-primary)' : 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Informações da Empresa */}
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-white leading-tight mb-1 truncate group-hover:text-primary transition-all duration-300">
          {lead.details?.tradeName || lead.name}
        </h3>
        <div className="flex items-center gap-3 text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-xs font-mono uppercase tracking-wider">
              ID: {lead.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LocationInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-300 font-medium">
        <div className="w-2 h-2 rounded-full bg-primary/40" />
        <span className="text-sm truncate">{lead.location}</span>
      </div>
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider pl-[20px] truncate">
        {lead.industry}
      </div>
    </div>
  );
};

const TimestampInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex items-center gap-3 text-slate-500">
      <div className="text-right">
        <div className="text-xs font-mono">
          {formatDate(lead.lastUpdated)}
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider">
          Scan
        </div>
      </div>
    </div>
  );
};

export const OptimizedLeadRow: React.FC<OptimizedLeadRowProps> = (props) => {
  const { lead } = props;

  return (
    <div className="group hover:bg-slate-800/30 transition-all duration-300 border-b border-slate-700/30">
      <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
        {/* Empresa - 5 colunas */}
        <div className="col-span-5">
          <CompanyInfo lead={lead} />
        </div>

        {/* Localização - 3 colunas */}
        <div className="col-span-3">
          <LocationInfo lead={lead} />
        </div>

        {/* Status - 2 colunas */}
        <div className="col-span-2 flex justify-center">
          <StatusIndicator status={lead.status} />
        </div>

        {/* Ações - 2 colunas */}
        <div className="col-span-2 flex justify-end">
          <ActionGroup lead={lead} actions={props} />
        </div>
      </div>
    </div>
  );
};
