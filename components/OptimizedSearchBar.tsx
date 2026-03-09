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
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {resultCount !== undefined && totalCount !== undefined ? (
              <>
                <span className="text-primary font-mono">{resultCount}</span>
                <span className="mx-1">de</span>
                <span className="text-slate-400 font-mono">{totalCount}</span>
                <span className="ml-1">resultados</span>
              </>
            ) : resultCount !== undefined ? (
              <>
                <span className="text-primary font-mono">{resultCount}</span>
                <span className="ml-1">resultados</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Indicador de Foco */}
      {isFocused && (
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-orange-400/20 
                        opacity-50 blur-sm pointer-events-none animate-pulse" />
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
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onToggle(filter.key)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg border
            transition-all duration-200 text-xs font-medium
            whitespace-nowrap active:scale-95
            ${filter.active
              ? `bg-primary/20 text-primary border-primary/30 ${filter.color || ''}`
              : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:bg-slate-700/50 hover:text-slate-300'
            }
          `}
        >
          <span>{filter.label}</span>
          <span className={`
            px-1.5 py-0.5 rounded text-xs font-mono
            ${filter.active 
              ? 'bg-primary/30 text-primary' 
              : 'bg-slate-600/30 text-slate-500'
            }
          `}>
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
};
