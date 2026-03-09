import React from 'react';
import { Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  expanded?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ expanded = true }) => {
  const { theme } = useTheme();

  return (
    <div className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl opacity-50 cursor-not-allowed">
      <div className="p-2 rounded-xl bg-indigo-900/50 text-indigo-400 flex items-center justify-center">
        <Moon size={20} />
      </div>
      
      {expanded && (
        <span className="text-sm font-bold tracking-wide uppercase text-slate-400">
          Modo Escuro
        </span>
      )}
    </div>
  );
};
