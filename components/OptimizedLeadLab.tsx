import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Lead, LeadStatus } from '../types';
import { toast } from './Toast';

// Import optimized components
import { OptimizedLeadRow } from './OptimizedLeadRow';
import { OptimizedMobileLeadCard } from './OptimizedMobileLeadCard';
import { OptimizedMetricsPanel, RealTimeStatus } from './OptimizedMetricsPanel';
import { OptimizedSearchBar, QuickFilters } from './OptimizedSearchBar';
import { OptimizedFilterPanel, QuickFilterBar } from './OptimizedFilterPanel';

import {
  Zap, Square, Loader2, Filter, Menu, X, ChevronDown,
  BrainCircuit, TrendingUp, Database, Sparkles
} from 'lucide-react';

interface OptimizedLeadLabProps {
  leads: Lead[];
  onEnrich: (lead: Lead) => void;
  onBulkEnrich: (leadsToEnrich: Lead[]) => void;
  isEnriching?: boolean;
  onStopEnrichment?: () => void;
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onConvertToDeal?: (leadId: string) => void;
  onParkLead?: (leadId: string) => void;
  onDiscardLead?: (leadId: string) => void;
  creditBalance: number;
  onNavigate: (tab: any) => void;
  userTenantId?: string;
  hasMoreLeads?: boolean;
  totalCount?: number;
  onLoadMore?: () => void;
}

// Constants
const ROW_HEIGHT = 80;
const OVERSCAN = 5;

export const OptimizedLeadLab: React.FC<OptimizedLeadLabProps> = ({
  leads,
  onEnrich,
  onBulkEnrich,
  isEnriching = false,
  onStopEnrichment,
  onDelete,
  onBulkDelete,
  onConvertToDeal,
  onParkLead,
  onDiscardLead,
  creditBalance,
  onNavigate,
  userTenantId = '',
  hasMoreLeads = false,
  totalCount = 0,
  onLoadMore
}) => {
  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    currentBatch: 0,
    totalBatches: 1,
    estimatedTime: 0,
    errors: 0
  });

  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter logic
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Only show leads that are not parked or discarded
      if (lead.status === LeadStatus.PARKED || lead.status === LeadStatus.DISCARDED) {
        return false;
      }

      // Status filter
      const matchesStatus = selectedStatus === 'ALL' || lead.status === selectedStatus;

      // Search filter
      const matchesSearch = searchTerm === '' || 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.details?.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Niche filter
      const matchesNiche = !selectedNiche || lead.industry === selectedNiche;

      // Location filter
      const matchesLocation = !selectedLocation || lead.location.includes(selectedLocation);

      return matchesStatus && matchesSearch && matchesNiche && matchesLocation;
    });
  }, [leads, selectedStatus, selectedNiche, selectedLocation, searchTerm]);

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Calculate statistics
  const stats = useMemo(() => ({
    total: filteredLeads.length,
    enriched: filteredLeads.filter(l => l.status === LeadStatus.ENRICHED).length,
    pending: filteredLeads.filter(l => l.status === LeadStatus.NEW).length,
    processing: isEnriching ? filteredLeads.filter(l => l.status === LeadStatus.NEW).length : 0
  }), [filteredLeads, isEnriching]);

  // Get unique niches and locations for filters
  const filterOptions = useMemo(() => {
    const niches = Array.from(new Set(leads.map(l => l.industry || '').filter(Boolean)))
      .slice(0, 10)
      .map(niche => ({
        key: niche,
        label: niche,
        count: leads.filter(l => l.industry === niche).length,
        active: selectedNiche === niche
      }));

    const locations = Array.from(new Set(leads.map(l => l.location || '').filter(Boolean)))
      .slice(0, 8)
      .map(location => ({
        key: location,
        label: ((location as string) || '').split(',')[0] || (location as string),
        count: leads.filter(l => l.location === location).length,
        active: selectedLocation === location
      }));

    return { niches, locations };
  }, [leads, selectedNiche, selectedLocation]);

  // Event Handlers
  const handleSafeEnrich = useCallback((lead: Lead) => {
    if (creditBalance < 10) {
      toast.error('Créditos Insuficientes', 'Você precisa de pelo menos 10 créditos para enriquecer um lead.');
      return;
    }
    onEnrich(lead);
  }, [creditBalance, onEnrich]);

  const handleSafeBulkEnrich = useCallback((targets: Lead[]) => {
    if (creditBalance < 10) {
      toast.error('Créditos Insuficientes', 'Você precisa de pelo menos 10 créditos para processar em lote.');
      return;
    }
    onBulkEnrich(targets);
  }, [creditBalance, onBulkEnrich]);

  const handleClearAllFilters = useCallback(() => {
    setSelectedStatus('ALL');
    setSelectedNiche(null);
    setSelectedLocation(null);
    setSearchTerm('');
  }, []);

  const handleClearFilter = useCallback((type: 'status' | 'niche' | 'location') => {
    switch (type) {
      case 'status':
        setSelectedStatus('ALL');
        break;
      case 'niche':
        setSelectedNiche(null);
        break;
      case 'location':
        setSelectedLocation(null);
        break;
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    onLoadMore?.();
    setTimeout(() => setIsLoadingMore(false), 1500);
  }, [isLoadingMore, onLoadMore]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsFilterPanelOpen(false);
        setIsMobileFilterOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Simulate processing stats
  useEffect(() => {
    if (isEnriching) {
      const interval = setInterval(() => {
        setProcessingStats(prev => ({
          ...prev,
          currentBatch: Math.min(prev.currentBatch + 1, prev.totalBatches),
          estimatedTime: Math.max(0, prev.estimatedTime - 10)
        }));
      }, 2000);

      return () => clearInterval(interval);
    } else {
      setProcessingStats({
        currentBatch: 0,
        totalBatches: 1,
        estimatedTime: 0,
        errors: 0
      });
    }
  }, [isEnriching]);

  return (
    <div className="flex flex-col h-full bg-background text-slate-200 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex-shrink-0 space-y-4">
        
        {/* Title and Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tighter">
                Laboratório Neural
              </h1>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Ambiente de Enriquecimento e Qualificação
              </p>
            </div>
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 font-medium text-sm"
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {/* Metrics Panel */}
        <OptimizedMetricsPanel
          totalLeads={stats.total}
          enrichedLeads={stats.enriched}
          pendingLeads={stats.pending}
          isProcessing={isEnriching}
          processingCount={stats.processing}
          onRefresh={() => window.location.reload()}
        />

        {/* Real-time Processing Status */}
        <RealTimeStatus
          isProcessing={isEnriching}
          currentBatch={processingStats.currentBatch}
          totalBatches={processingStats.totalBatches}
          estimatedTime={processingStats.estimatedTime}
          errors={processingStats.errors}
        />

        {/* Search and Filter Bar */}
        <div className="px-6 space-y-3">
          <OptimizedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onFilterClick={() => setIsFilterPanelOpen(true)}
            placeholder="Buscar leads por nome, local ou nicho..."
            resultCount={filteredLeads.length}
            totalCount={leads.length}
          />

          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Result Count (Professional View) */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 shrink-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{filteredLeads.length}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">de</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{leads.length}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">leads</span>
            </div>

            {/* Quick Filters */}
            <QuickFilters
              filters={[
                ...filterOptions.niches,
                ...filterOptions.locations
              ]}
              onToggle={(key) => {
                // Toggle logic for quick filters
                const niche = filterOptions.niches.find(n => n.key === key);
                if (niche) {
                  setSelectedNiche(selectedNiche === key ? null : key);
                } else {
                  const location = filterOptions.locations.find(l => l.key === key);
                  if (location) {
                    setSelectedLocation(selectedLocation === key ? null : key);
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Quick Filter Bar (Desktop) */}
        <QuickFilterBar
          activeFilters={{
            status: selectedStatus,
            niche: selectedNiche,
            location: selectedLocation
          }}
          onClearFilter={handleClearFilter}
          onOpenPanel={() => setIsFilterPanelOpen(true)}
          resultCount={filteredLeads.length}
          totalCount={leads.length}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (isEnriching && onStopEnrichment) {
                  onStopEnrichment();
                } else {
                  const targets = filteredLeads.filter(l => l.status === LeadStatus.NEW);
                  if (targets.length === 0) {
                    toast.info('Sem Leads', 'Não há leads pendentes para enriquecer.');
                    return;
                  }
                  handleSafeBulkEnrich(targets);
                }
              }}
              disabled={filteredLeads.filter(l => l.status === LeadStatus.NEW).length === 0 && !isEnriching}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider
                transition-all duration-300 shadow-lg hover:shadow-xl
                ${isEnriching
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-primary text-slate-900 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isEnriching ? (
                <>
                  <Square size={16} />
                  Parar Motor Neural
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Enriquecer Lote
                </>
              )}
            </button>

            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all text-sm font-medium"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 glass-strong rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-0">
          
          {/* Desktop Table */}
          <div className="hidden lg:block flex-1 overflow-hidden">
            <div 
              ref={parentRef}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <div 
                style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const lead = filteredLeads[virtualRow.index];
                  if (!lead) return null;

                  return (
                    <div
                      key={lead.id}
                      className="virtualization-row"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <OptimizedLeadRow
                        lead={lead}
                        onEnrich={handleSafeEnrich}
                        onConvertToDeal={onConvertToDeal!}
                        onPark={onParkLead!}
                        onDiscard={onDiscardLead!}
                        onDelete={onDelete!}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {filteredLeads.map(lead => (
              <OptimizedMobileLeadCard
                key={lead.id}
                lead={lead}
                onEnrich={handleSafeEnrich}
                onConvertToDeal={onConvertToDeal!}
                onPark={onParkLead!}
                onDiscard={onDiscardLead!}
                onDelete={onDelete!}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredLeads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative p-8 rounded-2xl bg-slate-800/50 border border-white/5">
                  <Database size={48} className="text-slate-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Nenhum Lead Encontrado
              </h3>
              <p className="text-slate-400 max-w-md">
                {searchTerm || selectedStatus !== 'ALL' || selectedNiche || selectedLocation
                  ? 'Tente ajustar seus filtros ou termos de busca.'
                  : 'Comece adicionando leads na aba de Descoberta.'
                }
              </p>
              {(searchTerm || selectedStatus !== 'ALL' || selectedNiche || selectedLocation) && (
                <button
                  onClick={handleClearAllFilters}
                  className="mt-6 px-6 py-3 bg-primary text-slate-900 rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          )}

          {/* Load More */}
          {hasMoreLeads && filteredLeads.length > 0 && (
            <div className="flex justify-center py-6 border-t border-slate-600/30">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-3 px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-all"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Carregar Mais ({Math.min(100, (totalCount || 0) - leads.length)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel (Desktop) */}
      {isFilterPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsFilterPanelOpen(false)}
          />
          <div className="fixed top-20 right-6 z-50 w-80 max-h-[80vh]">
            <OptimizedFilterPanel
              leads={leads}
              selectedStatus={selectedStatus}
              selectedNiche={selectedNiche}
              selectedLocation={selectedLocation}
              onStatusChange={setSelectedStatus}
              onNicheChange={setSelectedNiche}
              onLocationChange={setSelectedLocation}
              onClearAll={handleClearAllFilters}
              onClose={() => setIsFilterPanelOpen(false)}
            />
          </div>
        </>
      )}

      {/* Filter Panel (Mobile) */}
      {isMobileFilterOpen && (
        <OptimizedFilterPanel
          leads={leads}
          selectedStatus={selectedStatus}
          selectedNiche={selectedNiche}
          selectedLocation={selectedLocation}
          onStatusChange={setSelectedStatus}
          onNicheChange={setSelectedNiche}
          onLocationChange={setSelectedLocation}
          onClearAll={handleClearAllFilters}
          isMobile={true}
          onClose={() => setIsMobileFilterOpen(false)}
        />
      )}
    </div>
  );
};
