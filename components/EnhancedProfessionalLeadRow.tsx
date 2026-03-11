import React, { useState } from 'react';
import {
  MessageCircle, TrendingUp, Linkedin, Archive, Ban, Trash2,
  MoreHorizontal, CheckCircle, Clock, Loader2, Zap, Building2,
  MapPin, Calendar, Globe, Users, CreditCard, Phone, Mail,
  Users2, Building, Briefcase, UserCheck
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import './enhanced-layout-fix.css';
import './dropdown-fix.css';

interface EnhancedProfessionalLeadRowProps {
  lead: Lead;
  onEnrich: (lead: Lead) => void;
  onConvertToDeal: (leadId: string) => void;
  onPark: (leadId: string) => void;
  onDiscard: (leadId: string) => void;
  onDelete: (leadId: string) => void;
}

// Componente de Status Profissional
const ProfessionalStatus: React.FC<{ status: LeadStatus; progress?: number; lastUpdated?: string }> = ({ 
  status, 
  progress = 0, 
  lastUpdated 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case LeadStatus.ENRICHED:
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          icon: <CheckCircle size={16} />,
          text: 'Enriquecido',
          description: 'Dados completos',
          progress: 100
        };
      case LeadStatus.NEW:
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          icon: <Clock size={16} />,
          text: 'Pendente',
          description: 'Aguardando enriquecimento',
          progress: progress
        };
      default:
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          icon: <Clock size={16} />,
          text: 'Desconhecido',
          description: 'Status indefinido',
          progress: 0
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas`;
    return `${Math.floor(diffDays / 30)} meses`;
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${config.bgColor} ${config.borderColor} transition-all duration-300`}>
        <div className={`${config.color}`}>
          {config.icon}
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-white uppercase tracking-wide">
            {config.text}
          </div>
          <div className="text-xs text-slate-400">
            {config.description}
          </div>
        </div>
      </div>
      
      {status === LeadStatus.NEW && progress > 0 && (
        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {lastUpdated && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={10} />
          <span>{formatDate(lastUpdated)}</span>
        </div>
      )}
    </div>
  );
};

// Componente de Informações da Empresa (Expandido)
const CompanyInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [imgError, setImgError] = useState(false);

  // Formatar tamanho da empresa
  const getCompanySize = (size?: string) => {
    if (!size) return null;
    
    const sizeMap: { [key: string]: { label: string; color: string; icon: string } } = {
      'micro': { label: 'Microempresa', color: 'text-blue-400', icon: '🏢' },
      'pequeno': { label: 'Pequena', color: 'text-green-400', icon: '🏢' },
      'medio': { label: 'Média', color: 'text-amber-400', icon: '🏢' },
      'grande': { label: 'Grande', color: 'text-red-400', icon: '🏢' },
      'enorme': { label: 'Grande Porte', color: 'text-purple-400', icon: '🏢' }
    };

    const normalizedSize = size.toLowerCase();
    return sizeMap[normalizedSize] || sizeMap['medio'];
  };

  const companySize = getCompanySize(lead.details?.companySize);
  const employeeCount = lead.details?.employeeCount;

  return (
    <div className="flex items-start gap-4 min-w-0">
      {/* Avatar/Logo */}
      <div className="relative shrink-0">
        {lead.details?.placeImage && !imgError ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-600/30 shadow-lg">
            <img
              src={lead.details.placeImage}
              alt="Logo"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center border border-slate-600/30">
            <Building2 size={24} className="text-slate-400" />
          </div>
        )}
        
        {/* Indicador de Status */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800"
          style={{
            backgroundColor: lead.status === LeadStatus.ENRICHED ? 'var(--color-primary)' : '#64748b',
            boxShadow: lead.status === LeadStatus.ENRICHED ? '0 0 10px var(--color-primary)' : 'none',
          }}
        />
      </div>

      {/* Informações Principais */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white leading-tight truncate group-hover:text-primary transition-all duration-300">
            {lead.details?.tradeName || lead.name}
          </h3>
          {lead.details?.legalName && lead.details.legalName !== lead.name && (
            <p className="text-sm text-slate-400 truncate">{lead.details.legalName}</p>
          )}
        </div>

        {/* Metadados */}
        <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span>ID: {lead.id.slice(0, 8).toUpperCase()}</span>
          </div>
          {lead.details?.cnpj && (
            <div className="flex items-center gap-1 shrink-0">
              <CreditCard size={10} />
              <span>CNPJ: {lead.details.cnpj.slice(0, 8)}.***-**</span>
            </div>
          )}
        </div>

        {/* Informações Expandidas */}
        <div className="flex flex-wrap items-center gap-2">
          {companySize && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${companySize.color} bg-opacity-10 bg-current shrink-0`}>
              <Building size={10} />
              <span className="font-medium text-xs whitespace-nowrap">{companySize.label}</span>
            </div>
          )}
          
          {employeeCount && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 shrink-0">
              <Users2 size={10} />
              <span className="font-medium text-xs whitespace-nowrap">{employeeCount} func.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de Informações de Localização
const LocationInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center mt-0.5">
          <MapPin size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {lead.location}
          </div>
          {lead.industry && (
            <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">
              {lead.industry}
            </div>
          )}
        </div>
      </div>

      {/* Website */}
      {lead.website && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
            <Globe size={16} className="text-slate-400" />
          </div>
          <a 
            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 transition-colors truncate flex-1"
          >
            {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        </div>
      )}
    </div>
  );
};

// Componente de Contato
const ContactInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  return (
    <div className="space-y-3">
      {lead.phone && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Phone size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {lead.phone}
            </div>
            <div className="text-xs text-slate-400">WhatsApp disponível</div>
          </div>
        </div>
      )}

      {lead.details?.email && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Mail size={16} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white truncate">
              {lead.details.email}
            </div>
            <div className="text-xs text-slate-400">E-mail validado</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Sócios
const PartnersInfo: React.FC<{ lead: Lead }> = ({ lead }) => {
  const partners = lead.details?.partners || lead.details?.qsa || [];
  
  if (!partners || partners.length === 0) return null;

  const displayPartners = partners.slice(0, 2); // Mostrar apenas os 2 primeiros
  const hasMore = partners.length > 2;

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
          <UserCheck size={16} className="text-violet-400" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">
            Sócios
          </div>
          <div className="text-xs text-slate-400">
            {partners.length} {partners.length === 1 ? 'sócio' : 'sócios'}
          </div>
        </div>
      </div>

      <div className="space-y-2 min-w-0">
        {displayPartners.map((partner: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">
                {partner.nome || partner.name || 'Sócio não identificado'}
              </div>
              {partner.cargo && (
                <div className="text-slate-400 truncate">
                  {partner.cargo || partner.qual || 'Cargo não informado'}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {hasMore && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
            <span>+{partners.length - 2} outros sócios</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Ações Profissional
const ProfessionalActions: React.FC<{ lead: Lead; actions: EnhancedProfessionalLeadRowProps }> = ({ lead, actions }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePrimaryAction = async () => {
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

  const actionItems = [
    {
      id: 'whatsapp',
      icon: <MessageCircle size={16} />,
      label: 'WhatsApp',
      description: 'Enviar mensagem',
      color: 'text-emerald-400',
      hoverColor: 'hover:bg-emerald-500/10',
      action: handleWhatsApp,
      disabled: !lead.phone
    },
    {
      id: 'linkedin',
      icon: <Linkedin size={16} />,
      label: 'LinkedIn',
      description: 'Ver perfil',
      color: 'text-blue-400',
      hoverColor: 'hover:bg-blue-500/10',
      action: () => window.open(lead.socialLinks?.linkedin, '_blank'),
      disabled: !lead.socialLinks?.linkedin
    },
    {
      id: 'funnel',
      icon: <TrendingUp size={16} />,
      label: 'Funil',
      description: 'Mover para vendas',
      color: 'text-violet-400',
      hoverColor: 'hover:bg-violet-500/10',
      action: () => actions.onConvertToDeal(lead.id),
      disabled: lead.status !== LeadStatus.ENRICHED
    },
    {
      id: 'archive',
      icon: <Archive size={16} />,
      label: 'Arquivar',
      description: 'Mover para admin',
      color: 'text-amber-400',
      hoverColor: 'hover:bg-amber-500/10',
      action: () => actions.onPark(lead.id)
    },
    {
      id: 'discard',
      icon: <Ban size={16} />,
      label: 'Descartar',
      description: 'Remover da lista',
      color: 'text-orange-400',
      hoverColor: 'hover:bg-orange-500/10',
      action: () => actions.onDiscard(lead.id)
    },
    {
      id: 'delete',
      icon: <Trash2 size={16} />,
      label: 'Excluir',
      description: 'Apagar permanentemente',
      color: 'text-red-400',
      hoverColor: 'hover:bg-red-500/20',
      action: () => actions.onDelete(lead.id)
    }
  ];

  return (
    <div className="flex items-center gap-3">
      {/* Ação Primária - ESCONDIDA */}
      <div className="hidden">
        <button
          onClick={handlePrimaryAction}
          disabled={isProcessing || lead.status === LeadStatus.ENRICHED}
          className={`
            flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider
            transition-all duration-300 shadow-lg hover:shadow-xl
            ${isProcessing 
              ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
              : lead.status === LeadStatus.ENRICHED
              ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed border border-emerald-500/30'
              : 'bg-primary text-slate-900 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Zap size={16} />
              {lead.status === LeadStatus.ENRICHED ? 'Enriquecido' : 'Enriquecer'}
            </>
          )}
        </button>
      </div>

      {/* Menu Dropdown */}
      <div className="dropdown-container">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="dropdown-trigger p-3 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all duration-300 border border-slate-600/30"
        >
          <MoreHorizontal size={18} />
        </button>

        {isDropdownOpen && (
          <>
            <div 
              className="dropdown-overlay" 
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <h4 className="dropdown-title">
                  Ações Rápidas
                </h4>
                <p className="dropdown-subtitle">
                  {lead.details?.tradeName || lead.name}
                </p>
              </div>
              
              <div className="dropdown-content">
                {actionItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      setIsDropdownOpen(false);
                    }}
                    disabled={item.disabled}
                    className={`dropdown-item ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`dropdown-item-icon ${item.id}`}>
                      {item.icon}
                    </div>
                    <div className="dropdown-item-text">
                      <div className="dropdown-item-label">
                        {item.label}
                      </div>
                      <div className="dropdown-item-description">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Componente Principal (Layout 6-colunas para acomodar novas informações)
export const EnhancedProfessionalLeadRow: React.FC<EnhancedProfessionalLeadRowProps> = (props) => {
  const { lead } = props;

  return (
    <div className="group hover:bg-slate-800/40 transition-all duration-300 border-b border-slate-700/30">
      <div className="grid grid-cols-12 gap-6 px-8 py-6 items-center min-h-[120px]">
        
        {/* Empresa - 4 colunas */}
        <div className="col-span-4">
          <CompanyInfo lead={lead} />
        </div>

        {/* Sócios - 3 colunas */}
        <div className="col-span-3">
          <PartnersInfo lead={lead} />
        </div>

        {/* Localização - 2 colunas */}
        <div className="col-span-2">
          <LocationInfo lead={lead} />
        </div>

        {/* Contato - 2 colunas */}
        <div className="col-span-2">
          <ContactInfo lead={lead} />
        </div>

        {/* Status - 1 coluna */}
        <div className="col-span-1 flex justify-center">
          <ProfessionalStatus 
            status={lead.status} 
            lastUpdated={lead.lastUpdated}
          />
        </div>

        {/* Ações - no final da linha */}
        <div className="col-span-12 flex justify-end mt-4">
          <ProfessionalActions lead={lead} actions={props} />
        </div>
      </div>
    </div>
  );
};
