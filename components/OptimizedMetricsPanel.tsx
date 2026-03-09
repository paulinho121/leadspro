import React from 'react';
import { BrainCircuit, Sparkles, Database, TrendingUp, Loader2, CheckCircle } from 'lucide-react';

interface OptimizedMetricsPanelProps {
  totalLeads: number;
  enrichedLeads: number;
  pendingLeads: number;
  isProcessing?: boolean;
  processingCount?: number;
  onRefresh?: () => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  progress?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
  borderColor,
  progress,
  isLoading = false,
  onClick
}) => (
  <div 
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-2xl p-6 border transition-all duration-300
      glass-strong ${bgColor} ${borderColor}
      ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
      ${isLoading ? 'animate-pulse' : ''}
    `}
  >
    {/* Background Glow */}
    <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-2xl">
      <div className={`w-full h-full rounded-full ${color}`} />
    </div>

    {/* Content */}
    <div className="relative z-10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${color} bg-opacity/10`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-black text-white tracking-tighter">
          {isLoading ? (
            <Loader2 size={32} className="animate-spin text-slate-400" />
          ) : (
            value
          )}
        </div>
        {progress !== undefined && (
          <span className="text-lg font-bold text-slate-400">
            {progress}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${color}`}
            style={{ width: `${progress}%` }}
          >
            <div className="h-full bg-gradient-to-r from-transparent to-white/30" />
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <Loader2 size={12} className="animate-spin" />
          <span className="font-medium uppercase tracking-wider">Processing...</span>
        </div>
      )}
    </div>
  </div>
);

export const OptimizedMetricsPanel: React.FC<OptimizedMetricsPanelProps> = ({
  totalLeads,
  enrichedLeads,
  pendingLeads,
  isProcessing = false,
  processingCount = 0,
  onRefresh
}) => {
  // Calcular métricas derivadas
  const enrichmentRate = totalLeads > 0 ? Math.round((enrichedLeads / totalLeads) * 100) : 0;
  const processingRate = isProcessing && processingCount > 0 ? Math.round((processingCount / pendingLeads) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      
      {/* Card 1: Cognitive Maturity */}
      <MetricCard
        title="Cognitive Maturity"
        subtitle="AI Optimization Rate"
        value={enrichmentRate}
        icon={<BrainCircuit size={20} />}
        color="text-primary"
        bgColor="bg-primary/5"
        borderColor="border-primary/20"
        progress={enrichmentRate}
        isLoading={isProcessing && totalLeads === 0}
      />

      {/* Card 2: Enriched Profiles */}
      <MetricCard
        title="Enriched Profiles"
        subtitle="Ready for Pipeline"
        value={enrichedLeads}
        icon={<Sparkles size={20} />}
        color="text-emerald-400"
        bgColor="bg-emerald-500/5"
        borderColor="border-emerald-500/20"
        isLoading={isProcessing}
        onClick={() => onRefresh?.()}
      />

      {/* Card 3: Queue Status */}
      <MetricCard
        title="Queue Status"
        subtitle={isProcessing ? `${processingCount} processing` : 'Awaiting Action'}
        value={pendingLeads}
        icon={isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
        color={isProcessing ? "text-amber-400" : pendingLeads > 50 ? "text-orange-400" : "text-slate-400"}
        bgColor={isProcessing ? "bg-amber-500/5" : pendingLeads > 50 ? "bg-orange-500/5" : "bg-slate-500/5"}
        borderColor={isProcessing ? "border-amber-500/20" : pendingLeads > 50 ? "border-orange-500/20" : "border-slate-500/20"}
        progress={isProcessing ? processingRate : undefined}
      />

    </div>
  );
};

// Componente de Status em Tempo Real
interface RealTimeStatusProps {
  isProcessing: boolean;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTime?: number;
  errors?: number;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({
  isProcessing,
  currentBatch = 0,
  totalBatches = 1,
  estimatedTime = 0,
  errors = 0
}) => {
  if (!isProcessing) return null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="glass-strong rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-amber-400" />
          <div>
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Neural Processing Active
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Batch {currentBatch} of {totalBatches} • ETA: {formatTime(estimatedTime)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {errors > 0 && (
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs font-medium">{errors} errors</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-amber-400">
            <CheckCircle size={16} />
            <span className="text-xs font-medium">
              {Math.round((currentBatch / totalBatches) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
          style={{ width: `${(currentBatch / totalBatches) * 100}%` }}
        >
          <div className="h-full bg-gradient-to-r from-transparent to-white/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
