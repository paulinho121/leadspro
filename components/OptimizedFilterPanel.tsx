import React, { useState, useMemo } from 'react';
import { 
  LayoutList, Zap, Sparkles, Filter, X, ChevronDown, 
  MapPin, Layers, Search, Check 
} from 'lucide-react';
import { LeadStatus } from '../types';

interface OptimizedFilterPanelProps {
  leads: any[];
  selectedStatus: LeadStatus | 'ALL';
  selectedNiche: string | null;
  selectedLocation: string | null;
  onStatusChange: (status: LeadStatus | 'ALL') => void;
  onNicheChange: (niche: string | null) => void;
  onLocationChange: (location: string | null) => void;
  onClearAll: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  icon?: React.ReactNode;
  color?: string;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ 
  label, 
  count, 
  active, 
  icon, 
  color = 'primary',
  onClick 
}) => {
  const baseClasses = "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-xs font-medium active:scale-95";
  const activeClasses = `bg-${color}/20 text-${color} border-${color}/30`;
  const inactiveClasses = "bg-slate-700/30 text-slate-400 border-slate-600/30 hover:bg-slate-700/50 hover:text-slate-300";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <span className="truncate">{label}</span>
      <span className={`
        px-1.5 py-0.5 rounded text-xs font-mono shrink-0
        ${active ? `bg-${color}/30 text-${color}` : 'bg-slate-600/30 text-slate-500'}
      `}>
        {count}
      </span>
    </button>
  );
};

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  icon, 
  children, 
  defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full text-left group"
      >
        <div className="flex items-center gap-2">
          <div className="text-slate-400 group-hover:text-slate-300 transition-colors">
            {icon}
          </div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            {title}
          </h3>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      {isOpen && (
        <div className="space-y-2 pl-7">
          {children}
        </div>
      )}
    </div>
  );
};

export const OptimizedFilterPanel: React.FC<OptimizedFilterPanelProps> = ({
  leads,
  selectedStatus,
  selectedNiche,
  selectedLocation,
  onStatusChange,
  onNicheChange,
  onLocationChange,
  onClearAll,
  isMobile = false,
  onClose
}) => {
  // Calcular estatísticas
  const stats = useMemo(() => {
    const statusCounts = {
      ALL: leads.length,
      [LeadStatus.NEW]: leads.filter(l => l.status === LeadStatus.NEW).length,
      [LeadStatus.ENRICHED]: leads.filter(l => l.status === LeadStatus.ENRICHED).length,
    };

    const nicheCounts = new Map<string, number>();
    leads.forEach(lead => {
      if (lead.industry) {
        nicheCounts.set(lead.industry, (nicheCounts.get(lead.industry) || 0) + 1);
      }
    });

    const locationCounts = new Map<string, number>();
    leads.forEach(lead => {
      if (lead.location) {
        const parts = lead.location.split(',');
        const cityOrState = parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : parts[0].trim();
        locationCounts.set(cityOrState, (locationCounts.get(cityOrState) || 0) + 1);
      }
    });

    return {
      statusCounts,
      nicheCounts: Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      locationCounts: Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
    };
  }, [leads]);

  const activeFiltersCount = [
    selectedStatus !== 'ALL' ? 1 : 0,
    selectedNiche ? 1 : 0,
    selectedLocation ? 1 : 0
  ].filter(Boolean).length;

  const panelClasses = isMobile 
    ? "fixed inset-0 z-50 glass-strong border border-white/10"
    : "w-80 h-full glass-strong border border-white/10 rounded-[2rem]";

  const contentClasses = isMobile
    ? "h-full flex flex-col"
    : "h-full p-6 flex flex-col gap-6";

  return (
    <>
      {/* Overlay para mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Panel Principal */}
      <div className={panelClasses}>
        <div className={contentClasses}>
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-600/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Filter size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Filtros</h2>
                {activeFiltersCount > 0 && (
                  <p className="text-xs text-slate-400">{activeFiltersCount} ativos</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={onClearAll}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                  title="Limpar todos"
                >
                  <X size={16} />
                </button>
              )}
              
              {isMobile && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Status Filters */}
            <FilterSection title="Status do Processo" icon={<LayoutList size={16} />}>
              <div className="space-y-2">
                <FilterChip
                  label="Todos os Leads"
                  count={stats.statusCounts.ALL}
                  active={selectedStatus === 'ALL'}
                  icon={<Search size={14} />}
                  onClick={() => onStatusChange('ALL')}
                />
                <FilterChip
                  label="Descobertas (Raw)"
                  count={stats.statusCounts[LeadStatus.NEW]}
                  active={selectedStatus === LeadStatus.NEW}
                  icon={<Zap size={14} />}
                  color="amber"
                  onClick={() => onStatusChange(LeadStatus.NEW)}
                />
                <FilterChip
                  label="Qualificados (IA)"
                  count={stats.statusCounts[LeadStatus.ENRICHED]}
                  active={selectedStatus === LeadStatus.ENRICHED}
                  icon={<Sparkles size={14} />}
                  color="emerald"
                  onClick={() => onStatusChange(LeadStatus.ENRICHED)}
                />
              </div>
            </FilterSection>

            {/* Niche Filters */}
            {stats.nicheCounts.length > 0 && (
              <FilterSection title="Nichos Industriais" icon={<Layers size={16} />}>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {stats.nicheCounts.map(([niche, count]) => (
                    <FilterChip
                      key={niche}
                      label={niche}
                      count={count}
                      active={selectedNiche === niche}
                      onClick={() => onNicheChange(selectedNiche === niche ? null : niche)}
                    />
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Location Filters */}
            {stats.locationCounts.length > 0 && (
              <FilterSection title="Geolocalização" icon={<MapPin size={16} />}>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {stats.locationCounts.map(([location, count]) => (
                    <FilterChip
                      key={location}
                      label={location}
                      count={count}
                      active={selectedLocation === location}
                      icon={<MapPin size={12} />}
                      onClick={() => onLocationChange(selectedLocation === location ? null : location)}
                    />
                  ))}
                </div>
              </FilterSection>
            )}

          </div>

          {/* Footer Summary */}
          <div className="pt-4 border-t border-slate-600/30">
            <div className="text-center">
              <div className="text-xs text-slate-500 mb-2">
                {leads.length} leads encontrados
              </div>
              {activeFiltersCount > 0 && (
                <div className="text-xs text-primary font-medium">
                  {Math.round((leads.filter(lead => {
                    const matchesStatus = selectedStatus === 'ALL' || lead.status === selectedStatus;
                    const matchesNiche = !selectedNiche || lead.industry === selectedNiche;
                    const matchesLocation = !selectedLocation || lead.location.includes(selectedLocation);
                    return matchesStatus && matchesNiche && matchesLocation;
                  }).length / leads.length) * 100)}% filtrados
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

// Componente de Filtros Rápidos (Desktop)
interface QuickFilterBarProps {
  activeFilters: {
    status: LeadStatus | 'ALL';
    niche: string | null;
    location: string | null;
  };
  onClearFilter: (type: 'status' | 'niche' | 'location') => void;
  onOpenPanel: () => void;
  resultCount: number;
  totalCount: number;
}

export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({
  activeFilters,
  onClearFilter,
  onOpenPanel,
  resultCount,
  totalCount
}) => {
  const getFilterLabel = (type: string, value: any) => {
    switch (type) {
      case 'status':
        return value === 'ALL' ? 'Todos' : value === LeadStatus.NEW ? 'Raw' : 'Enriched';
      case 'niche':
      case 'location':
        return value;
      default:
        return '';
    }
  };

  const hasActiveFilters = activeFilters.status !== 'ALL' || activeFilters.niche || activeFilters.location;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-600/30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenPanel}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 transition-all text-xs font-medium border border-slate-600/30"
        >
          <Filter size={14} />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-primary/20 text-primary">
              {[activeFilters.status !== 'ALL', activeFilters.niche, activeFilters.location].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Active Filter Chips */}
        <div className="flex items-center gap-2">
          {activeFilters.status !== 'ALL' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-400">Status: {getFilterLabel('status', activeFilters.status)}</span>
              <button
                onClick={() => onClearFilter('status')}
                className="text-amber-400 hover:text-amber-300"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {activeFilters.niche && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20">
              <span className="text-xs text-primary truncate max-w-32">{activeFilters.niche}</span>
              <button
                onClick={() => onClearFilter('niche')}
                className="text-primary hover:text-primary/80"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {activeFilters.location && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-blue-400 truncate max-w-32">{activeFilters.location}</span>
              <button
                onClick={() => onClearFilter('location')}
                className="text-blue-400 hover:text-blue-300"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-500">
        <span className="text-primary font-mono">{resultCount}</span>
        <span className="mx-1">de</span>
        <span className="font-mono">{totalCount}</span>
        <span className="ml-1">resultados</span>
      </div>
    </div>
  );
};
