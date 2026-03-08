import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  expanded?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ expanded = true }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-300 group
        ${theme === 'light' 
          ? 'hover:bg-slate-200 text-slate-600' 
          : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
      title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
    >
      <div className={`p-2 rounded-xl transition-all duration-500 flex items-center justify-center
        ${theme === 'light' 
          ? 'bg-amber-100 text-amber-600 group-hover:scale-110' 
          : 'bg-indigo-900/50 text-indigo-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(129,140,248,0.3)]'}`}>
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </div>
      
      {expanded && (
        <span className="text-sm font-bold tracking-wide uppercase">
          {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        </span>
      )}
    </button>
  );
};
