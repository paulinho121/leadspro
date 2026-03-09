import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Lead, LeadStatus } from '../types';
import { toast } from './Toast';

// Import professional components
import { ProfessionalLeadRow } from './ProfessionalLeadRow';
import { ProfessionalMobileLeadCard } from './ProfessionalMobileLeadCard';
import { OptimizedMetricsPanel, RealTimeStatus } from './OptimizedMetricsPanel';
import { OptimizedSearchBar, QuickFilters } from './OptimizedSearchBar';
import { OptimizedFilterPanel, QuickFilterBar } from './OptimizedFilterPanel';

import {
  Zap, Square, Loader2, Filter, Menu, X, ChevronDown,
  BrainCircuit, TrendingUp, Database, Sparkles, BarChart3,
  Users, Target, Activity, ShieldCheck, Phone, Globe
} from 'lucide-react';
import './virtualization-fix.css';
import './professional-lead.css';

interface ProfessionalLeadLabProps {
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
const ROW_HEIGHT = 140; // Increased for better spacing
const OVERSCAN = 3;

export const ProfessionalLeadLab: React.FC<ProfessionalLeadLabProps> = ({
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Advanced filtering logic
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      // Only show leads that are not parked or discarded
      if (lead.status === LeadStatus.PARKED || lead.status === LeadStatus.DISCARDED) {
        return false;
      }

      // Status filter
      const matchesStatus = selectedStatus === 'ALL' || lead.status === selectedStatus;

      // Search filter (enhanced)
      const matchesSearch = searchTerm === '' || 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.details?.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.details?.legalName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.website || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Niche filter
      const matchesNiche = !selectedNiche || lead.industry === selectedNiche;

      // Location filter (enhanced)
      const matchesLocation = !selectedLocation || 
        lead.location.toLowerCase().includes(selectedLocation.toLowerCase());

      return matchesStatus && matchesSearch && matchesNiche && matchesLocation;
    });

    // Sorting logic
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.details?.tradeName || a.name).localeCompare(b.details?.tradeName || b.name);
          break;
        case 'date':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [leads, selectedStatus, selectedNiche, selectedLocation, searchTerm, sortBy, sortOrder]);

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Calculate enhanced statistics
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const enriched = filteredLeads.filter(l => l.status === LeadStatus.ENRICHED).length;
    const pending = filteredLeads.filter(l => l.status === LeadStatus.NEW).length;
    const processing = isEnriching ? pending : 0;
    
    // Additional metrics
    const withPhone = filteredLeads.filter(l => l.phone).length;
    const withWebsite = filteredLeads.filter(l => l.website).length;
    const withEmail = filteredLeads.filter(l => l.details?.email).length;
    
    return {
      total,
      enriched,
      pending,
      processing,
      withPhone,
      withWebsite,
      withEmail,
      completionRate: total > 0 ? Math.round((enriched / total) * 100) : 0,
      contactRate: total > 0 ? Math.round((withPhone / total) * 100) : 0
    };
  }, [filteredLeads, isEnriching]);

  // Get enhanced filter options
  const filterOptions = useMemo(() => {
    const niches = Array.from(new Set(leads.map(l => l.industry || '').filter(Boolean)))
      .slice(0, 15)
      .map(niche => ({
        key: niche,
        label: niche,
        count: leads.filter(l => l.industry === niche).length,
        active: selectedNiche === niche
      }));

    const locations = Array.from(new Set(leads.map(l => l.location || '').filter(Boolean)))
      .slice(0, 10)
      .map(location => ({
        key: location,
        label: (location as string).split(',')[0] || location,
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

  const handleSort = useCallback((field: 'name' | 'date' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

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
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setIsFilterPanelOpen(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-slate-200 animate-fade-in">
      
      {/* Professional Header */}
      <div className="flex-shrink-0 space-y-6 px-8 pt-8">
        
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
              <BrainCircuit size={32} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">
                Laboratório Neural
              </h1>
              <p className="text-base text-slate-400 font-medium mt-2">
                Plataforma Profissional de Enriquecimento e Qualificação
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-primary text-slate-900' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'grid' 
                  ? 'bg-primary text-slate-900' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Grade
            </button>
          </div>
        </div>

        {/* Enhanced Metrics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <OptimizedMetricsPanel
            totalLeads={stats.total}
            enrichedLeads={stats.enriched}
            pendingLeads={stats.pending}
            isProcessing={isEnriching}
            processingCount={stats.processing}
            onRefresh={() => window.location.reload()}
          />
          
          {/* Additional Metrics */}
          <div className="glass-strong rounded-2xl border border-white/5 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Phone size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Contato Disponível
                </h4>
                <div className="text-2xl font-black text-white">
                  {stats.withPhone}
                </div>
                <div className="text-xs text-slate-500">
                  {stats.contactRate}% com telefone
                </div>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-2xl border border-white/5 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Websites
                </h4>
                <div className="text-2xl font-black text-white">
                  {stats.withWebsite}
                </div>
                <div className="text-xs text-slate-500">
                  Presença digital
                </div>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-2xl border border-white/5 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400">
                <Target size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Taxa de Conclusão
                </h4>
                <div className="text-2xl font-black text-white">
                  {stats.completionRate}%
                </div>
                <div className="text-xs text-slate-500">
                  Leads enriquecidos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Processing Status */}
        <RealTimeStatus
          isProcessing={isEnriching}
          currentBatch={1}
          totalBatches={Math.ceil(stats.pending / 10)}
          estimatedTime={Math.ceil(stats.pending / 2) * 30}
        />

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex-1">
            <OptimizedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onFilterClick={() => setIsFilterPanelOpen(true)}
              placeholder="Buscar leads por nome, empresa, local ou CNPJ..."
              resultCount={filteredLeads.length}
              totalCount={leads.length}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Controls */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
              <button
                onClick={() => handleSort('date')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === 'date' 
                    ? 'bg-primary text-slate-900' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Data
              </button>
              <button
                onClick={() => handleSort('name')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === 'name' 
                    ? 'bg-primary text-slate-900' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Nome
              </button>
              <button
                onClick={() => handleSort('status')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === 'status' 
                    ? 'bg-primary text-slate-900' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Status
              </button>
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
        </div>

        {/* Quick Filters */}
        <QuickFilters
          filters={[
            ...filterOptions.niches.slice(0, 5),
            ...filterOptions.locations.slice(0, 3)
          ]}
          onToggle={(key) => {
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 px-8 pb-8">
        
        {/* Action Bar */}
        <div className="flex items-center justify-between py-4 border-b border-slate-600/30">
          <div className="flex items-center gap-4">
            {/* Botão Enriquecer Lote escondido */}
            <div className="hidden">
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
                  flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider
                  transition-all duration-300 shadow-xl hover:shadow-2xl
                  ${isEnriching
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary text-slate-900 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isEnriching ? (
                  <>
                    <Square size={18} />
                    Parar Processamento
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Enriquecer Lote ({filteredLeads.filter(l => l.status === LeadStatus.NEW).length})
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleClearAllFilters}
              className="px-6 py-3 rounded-xl bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all text-sm font-medium"
            >
              Limpar Filtros
            </button>
          </div>

          {/* Results Summary */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-slate-400">
              <span className="text-primary font-mono font-bold text-lg">{filteredLeads.length}</span>
              <span className="mx-1">de</span>
              <span className="font-mono text-lg">{leads.length}</span>
              <span className="ml-1">leads</span>
            </div>
            
            {selectedStatus !== 'ALL' || selectedNiche || selectedLocation ? (
              <div className="text-primary font-medium">
                {Math.round((filteredLeads.length / leads.length) * 100)}% filtrados
              </div>
            ) : null}
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 glass-strong rounded-3xl border border-white/5 overflow-hidden flex flex-col min-h-0 professional-lead-container">
          
          {/* Desktop Table */}
          <div className="hidden lg:block flex-1 overflow-hidden">
            <div 
              ref={parentRef}
              className="h-full overflow-y-auto custom-scrollbar virtualization-scroll"
            >
              <div 
                style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
                className="virtualization-content"
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
                      <div className="lead-row">
                        <ProfessionalLeadRow
                          lead={lead}
                          onEnrich={handleSafeEnrich}
                          onConvertToDeal={onConvertToDeal!}
                          onPark={onParkLead!}
                          onDiscard={onDiscardLead!}
                          onDelete={onDelete!}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {filteredLeads.map(lead => (
              <ProfessionalMobileLeadCard
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
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <div className="relative p-8 rounded-3xl bg-slate-800/50 border border-white/5">
                  <Database size={64} className="text-slate-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Nenhum Lead Encontrado
              </h3>
              <p className="text-slate-400 max-w-md text-lg mb-8">
                {searchTerm || selectedStatus !== 'ALL' || selectedNiche || selectedLocation
                  ? 'Tente ajustar seus filtros ou termos de busca para encontrar leads.'
                  : 'Comece adicionando leads na aba de Descoberta para começar a usar o Laboratório Neural.'
                }
              </p>
              {(searchTerm || selectedStatus !== 'ALL' || selectedNiche || selectedLocation) && (
                <button
                  onClick={handleClearAllFilters}
                  className="px-8 py-4 bg-primary text-slate-900 rounded-2xl font-bold hover:bg-primary/90 transition-all text-lg"
                >
                  Limpar Todos os Filtros
                </button>
              )}
            </div>
          )}

          {/* Load More */}
          {hasMoreLeads && filteredLeads.length > 0 && (
            <div className="flex justify-center py-8 border-t border-slate-600/30">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-4 px-8 py-4 bg-slate-700/50 text-slate-300 rounded-2xl hover:bg-slate-700 disabled:opacity-50 transition-all text-sm font-medium"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Carregando mais leads...
                  </>
                ) : (
                  <>
                    <ChevronDown size={20} />
                    Carregar Mais ({Math.min(100, (totalCount || 0) - leads.length)} leads)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panels */}
      {isFilterPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsFilterPanelOpen(false)}
          />
          <div className="fixed top-24 right-8 z-50 w-96 max-h-[80vh]">
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
