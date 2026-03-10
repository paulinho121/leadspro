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
    <div className="relative">
      {/* Container Principal */}
      <div className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl 
        bg-slate-800/50 border border-slate-600/30 
        transition-all duration-300
        ${isFocused 
          ? 'border-primary/40 bg-slate-800/70 shadow-lg shadow-primary/10' 
          : 'hover:border-slate-500/50'
        }
      `}>
        
        {/* Ícone de Busca */}
        <div className="flex items-center justify-center">
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-primary" />
          ) : (
            <Search 
              size={18} 
              className={`transition-colors duration-200 ${
                isFocused ? 'text-primary' : 'text-slate-400'
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
          className="flex-1 bg-transparent text-white placeholder-slate-500 
                   text-sm font-medium outline-none transition-all duration-200"
        />

        {/* Botão Limpar */}
        {value && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center p-1 rounded-lg 
                     text-slate-400 hover:text-white hover:bg-slate-700/50 
                     transition-all duration-200"
          >
            <X size={16} />
          </button>
        )}

        {/* Botão de Filtros */}
        <button
          onClick={onFilterClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg 
                   bg-slate-700/50 text-slate-300 hover:bg-slate-700 
                   border border-slate-600/30 hover:border-slate-500/50
                   transition-all duration-200 text-xs font-medium"
        >
          <Filter size={14} />
          <span className="hidden sm:inline">Filtros</span>
        </button>

        {/* Atalho de Teclado */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 
                        bg-slate-700/30 rounded border border-slate-600/20">
          <Command size={12} className="text-slate-500" />
          <span className="text-xs font-mono text-slate-500">K</span>
        </div>
      </div>

      {/* Barra de Resultados */}
      {(resultCount !== undefined || totalCount !== undefined) && (
        <div className="absolute -bottom-7 left-1 right-0 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em]">
            {resultCount !== undefined && totalCount !== undefined ? (
              <>
                <span className="text-primary">{resultCount}</span>
                <span className="text-slate-600">de</span>
                <span className="text-slate-400">{totalCount}</span>
                <span className="text-slate-600 ml-0.5">resultados</span>
              </>
            ) : resultCount !== undefined ? (
              <>
                <span className="text-primary">{resultCount}</span>
                <span className="text-slate-600 ml-0.5">resultados</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Indicador de Foco */}
      {isFocused && (
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent 
                        opacity-40 blur-md pointer-events-none animate-pulse" />
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
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  };

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 scrollbar-hide no-scrollbar -mx-2 px-2 mask-fade-right">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onToggle(filter.key)}
          className={`
            group flex items-center gap-3 px-4 py-2 rounded-2xl border
            transition-all duration-300 text-xs font-bold
            whitespace-nowrap active:scale-95 shadow-sm
            ${filter.active
              ? `bg-primary/10 text-primary border-primary/30 shadow-primary/5`
              : 'bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.07] hover:text-slate-200 hover:border-white/10'
            }
          `}
        >
          <span className="tracking-tight">{formatLabel(filter.label)}</span>
          <span className={`
            flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-lg text-[9px] font-black font-mono
            transition-all duration-300
            ${filter.active 
              ? 'bg-primary text-slate-900 shadow-[0_0_10px_rgba(249,115,22,0.4)]' 
              : 'bg-white/10 text-slate-500 group-hover:bg-white/20 group-hover:text-slate-400'
            }
          `}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};
