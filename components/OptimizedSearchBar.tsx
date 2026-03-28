import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, Command, Loader2 } from 'lucide-react';

interface OptimizedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick: () => void;
  placeholder?: string;
  isLoading?: boolean;
  resultCount?: number;
  totalCount?: number;
}

export const OptimizedSearchBar: React.FC<OptimizedSearchBarProps> = ({
  value,
  onChange,
  onFilterClick,
  placeholder = "Buscar leads...",
  isLoading = false,
  resultCount,
  totalCount
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative group">
      {/* Container Principal */}
      <div className={`
        relative flex items-center gap-3 px-4 py-3.5 rounded-2xl 
        bg-slate-800/40 border border-white/5 
        transition-all duration-500 backdrop-blur-md
        ${isFocused 
          ? 'border-primary/50 bg-slate-800/60 shadow-[0_0_30px_rgba(249,115,22,0.15)] ring-1 ring-primary/20' 
          : 'hover:border-white/10 hover:bg-slate-800/50 shadow-lg'
        }
      `}>
        
        {/* Ícone de Busca */}
        <div className="flex items-center justify-center">
          {isLoading ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : (
            <Search 
              size={20} 
              className={`transition-all duration-300 ${
                isFocused ? 'text-primary scale-110' : 'text-slate-500'
              }`} 
            />
          )}
        </div>

        {/* Input de Busca */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-slate-600 
                   text-sm font-semibold outline-none transition-all duration-200"
        />

        {/* Info de Resultados Integrada */}
        {(resultCount !== undefined && totalCount !== undefined && !isFocused && !value) && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 animate-fade-in">
            <span className="text-[10px] font-black text-primary">{resultCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Leads</span>
          </div>
        )}

        {/* Botão Limpar */}
        {value && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center p-1.5 rounded-xl 
                     text-slate-400 hover:text-white hover:bg-white/10 
                     transition-all duration-200"
          >
            <X size={16} />
          </button>
        )}

        <div className="h-6 w-px bg-white/5 mx-1 hidden sm:block" />

        {/* Botão de Filtros */}
        <button
          onClick={onFilterClick}
          className={`
            flex items-center gap-2.5 px-4 py-2 rounded-xl 
            transition-all duration-300 text-xs font-bold
            ${isFocused || value 
              ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:bg-primary/90' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }
          `}
        >
          <Filter size={14} className={isFocused || value ? 'animate-pulse' : ''} />
          <span className="hidden sm:inline">Avançado</span>
        </button>

        {/* Atalho de Teclado */}
        <div className="hidden lg:flex items-center gap-1 px-1.5 py-1 
                        bg-white/5 rounded-lg border border-white/5">
          <Command size={10} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500">K</span>
        </div>
      </div>

      {/* Resultados Count (Subtle) */}
      {(resultCount !== undefined || totalCount !== undefined) && (isFocused || value) && (
        <div className="absolute -bottom-8 left-2 flex items-center animate-slide-up">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider">
            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {resultCount} filtrados
            </span>
            <span className="text-slate-500 uppercase opacity-50">de</span>
            <span className="text-slate-300">{totalCount} total</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Filtros Rápidos
interface QuickFiltersProps {
  filters: Array<{
    key: string;
    label: string;
    count: number;
    active: boolean;
    color?: string;
  }>;
  onToggle: (key: string) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({ filters, onToggle }) => {
  // Helper to format labels
  const formatLabel = (label: string) => {
    if (!label) return '';
    if (label.length > 20) return label.substring(0, 17) + '...';
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 scrollbar-hide no-scrollbar -mx-4 px-4 mask-fade-right">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onToggle(filter.key)}
          className={`
            group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border
            transition-all duration-500 text-[11px] font-bold
            whitespace-nowrap active:scale-95
            ${filter.active
              ? `bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_rgba(249,115,22,0.1)] ring-1 ring-primary/20`
              : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/10'
            }
          `}
        >
          <span className="tracking-tight">{formatLabel(filter.label)}</span>
          <span className={`
            flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-md text-[9px] font-black font-mono
            transition-all duration-500
            ${filter.active 
              ? 'bg-primary text-slate-900 shadow-[0_0_8px_rgba(249,115,22,0.5)]' 
              : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-400'
            }
          `}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};
