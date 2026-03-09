import React from 'react';
import { useTheme } from './ThemeProvider';

export const ThemeTest: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 space-y-4 bg-background text-slate-900 dark:text-slate-200">
      <h2 className="text-2xl font-bold">Teste de Tema</h2>
      <p>Tema atual: <strong>{theme}</strong></p>
      
      <button
        onClick={toggleTheme}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Alternar Tema
      </button>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-surface border border-slate-200 dark:border-white/10 rounded-lg">
          <h3 className="font-semibold mb-2">Card de Teste</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Este é um card para testar as cores do tema.
          </p>
        </div>
        
        <div className="p-4 glass rounded-lg">
          <h3 className="font-semibold mb-2">Glass Effect</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Efeito glass com backdrop blur.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 bg-primary rounded"></div>
        <div className="h-2 bg-secondary rounded"></div>
        <div className="h-2 bg-accent rounded"></div>
      </div>
    </div>
  );
};
