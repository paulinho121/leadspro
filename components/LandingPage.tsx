
import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Zap, 
  Target, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  MessageCircle, 
  Cpu, 
  Lock,
  ChevronRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      {/* Ambient Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-[0.05] pointer-events-none blur-[120px] rounded-full bg-primary z-0"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] opacity-[0.03] pointer-events-none blur-[120px] rounded-full bg-secondary z-0"></div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <BrainCircuit className="text-primary" size={24} />
            </div>
            <span className="text-xl font-black text-white tracking-tighter uppercase italic">LeadMatrix<span className="text-primary">.</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <a href="#features" className="hover:text-white transition-colors">Tecnologia</a>
            <a href="#stats" className="hover:text-white transition-colors">Estatísticas</a>
            <a href="#comparison" className="hover:text-white transition-colors">Diferencial</a>
          </nav>

          <button 
            onClick={onGoToLogin}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            <Lock size={14} className="text-primary" />
            <span>Área do Cliente</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-44 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Zap className="text-primary" size={14} fill="currentColor" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">A Nova Era da Prospecção B2B</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase italic mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 [animation-delay:200ms]">
            Pare de apenas buscar.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-secondary decoration-white">Domine seu mercado.</span>
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 [animation-delay:400ms]">
            O LeadMatrix utiliza varredura neural em tempo real para encontrar leads qualificados onde o Apollo não chega. Dados governamentais, redes sociais e Google Maps integrados em um clique.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 [animation-delay:600ms]">
            <button 
              onClick={onGoToLogin}
              className="px-10 py-6 bg-primary hover:bg-primary/90 text-slate-900 rounded-[1.5rem] font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              Começar Agora
              <ArrowRight size={20} />
            </button>
            <button className="px-10 py-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[1.5rem] font-black text-lg uppercase tracking-widest transition-all">
              Agendar Demo
            </button>
          </div>

          {/* Social Proof Bar */}
          <div className="mt-20 pt-10 border-t border-white/5 w-full flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-40 grayscale animate-in fade-in duration-1000 [animation-delay:1000ms]">
             <div className="flex items-center gap-2">
                <ShieldCheck size={24} /> <span className="font-bold uppercase tracking-widest text-xs">Security First</span>
             </div>
             <div className="flex items-center gap-2">
                <Globe size={24} /> <span className="font-bold uppercase tracking-widest text-xs">Global Coverage</span>
             </div>
             <div className="flex items-center gap-2">
                <Users size={24} /> <span className="font-bold uppercase tracking-widest text-xs">5k+ Companies</span>
             </div>
             <div className="flex items-center gap-2">
                <TrendingUp size={24} /> <span className="font-bold uppercase tracking-widest text-xs">Hyper Growth</span>
             </div>
          </div>
        </div>

        {/* Hero Background Image (Mock) */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-[#050505] to-transparent z-0"></div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Leads Capturados', value: '1.2M+', icon: <Users className="text-primary" /> },
            { label: 'Precisão de Dados', value: '99.9%', icon: <ShieldCheck className="text-secondary" /> },
            { label: 'Países Atendidos', value: '45+', icon: <Globe className="text-emerald-500" /> },
            { label: 'Economia Mensal', value: 'R$ 5k+', icon: <TrendingUp className="text-primary" /> }
          ].map((stat, i) => (
            <div key={i} className="glass p-8 rounded-[2rem] border-white/5 flex flex-col items-center text-center gap-4 hover:border-primary/20 transition-all group">
              <div className="bg-white/5 p-3 rounded-2xl group-hover:bg-primary/10 transition-colors">
                {stat.icon}
              </div>
              <div className="text-3xl md:text-5xl font-black text-white italic">{stat.value}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-4">Tecnologia que <br /><span className="text-primary">muda o jogo.</span></h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Esqueça as listas prontas e compreendidas por todos. Nossa IA varre a web em nível neural para trazer dados exclusivos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6 group hover:bg-white/[0.02] transition-all">
              <div className="bg-primary/20 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-all shadow-xl shadow-primary/10">
                <Zap size={32} className="text-primary" fill="currentColor" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Discovery Neural</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Extração profunda de Google Maps, CNPJ e Redes Sociais em tempo real. Você nunca mais ligará para um número inexistente.</p>
              <ul className="space-y-3 pt-4">
                {['Validação Automática', 'Filtro Anti-bot', 'Cruzamento de Dados'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6 group hover:bg-white/[0.02] transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <MessageCircle size={120} />
              </div>
              <div className="bg-secondary/20 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-secondary/30 group-hover:scale-110 transition-all shadow-xl shadow-secondary/10">
                <MessageCircle size={32} className="text-secondary" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">WhatsApp Flow</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Extraia e conecte. Geramos links de WhatsApp personalizados baseados no perfil do lead para aumentar em 300% sua conversão.</p>
              <ul className="space-y-3 pt-4">
                 {['Textos Persuasivos', 'Abordagem Direta', 'Integração API'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-6 group hover:bg-white/[0.02] transition-all">
              <div className="bg-emerald-500/20 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-all shadow-xl shadow-emerald-500/10">
                <Target size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">IA Preditiva</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Antecipe necessidades. Nossa inteligência analisa padrões de mercado para identificar empresas em momento de compra ou expansão.</p>
              <ul className="space-y-3 pt-4">
                 {['Padrões de Compra', 'Sinais de Intenção', 'Lead Sniper'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section (Apollo nod) */}
      <section id="comparison" className="py-32 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-[0.9]">Não perca <br />mais tempo com <br /><span className="text-slate-700 line-through decoration-primary decoration-4">dados estáticos.</span></h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              O problema com ferramentas globais como o Apollo é a desatualização do mercado local. Enquanto eles usam bancos de dados de 6 meses atrás, nós consultamos a realidade do seu mercado agora.
            </p>
            <div className="grid grid-cols-1 gap-4">
              {[
                'Dados atualizados hoje, não há meses.',
                'Foco total em WhatsApp e Mobile.',
                'Custo-benefício 5x superior para o Brasil.',
                'Interface White Label para Agências SDR.'
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary transition-all">
                    <CheckCircle2 size={12} className="text-primary group-hover:text-slate-900" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full"></div>
             <div className="relative glass rounded-[3rem] border-white/10 p-1 bg-gradient-to-br from-white/10 to-transparent">
                <div className="bg-[#050505] rounded-[2.8rem] p-10 space-y-10">
                   <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse"></div>
                         <div className="space-y-1">
                            <div className="w-20 h-2 bg-slate-800 rounded"></div>
                            <div className="w-12 h-2 bg-slate-800/50 rounded"></div>
                         </div>
                      </div>
                      <div className="bg-primary/10 px-3 py-1 rounded-full text-[8px] font-black text-primary uppercase tracking-[0.2em]">Neural Active</div>
                   </div>

                   <div className="space-y-4">
                      <div className="w-full h-8 bg-white/5 rounded-xl border border-white/5 flex items-center px-4 gap-3">
                         <Target size={14} className="text-primary" />
                         <div className="w-32 h-2 bg-white/10 rounded"></div>
                      </div>
                      <div className="w-full h-8 bg-white/5 rounded-xl border border-white/5 flex items-center px-4 gap-3">
                         <Globe size={14} className="text-secondary" />
                         <div className="w-24 h-2 bg-white/10 rounded"></div>
                      </div>
                   </div>

                   <div className="pt-10 space-y-3">
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Extração de Alta Precisão</div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div className="w-[94%] h-full bg-gradient-to-r from-primary to-secondary"></div>
                      </div>
                   </div>

                   <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Leads Qualificados</span>
                      <span className="text-xl font-black text-white italic">+247</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-44 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto glass p-16 md:p-24 rounded-[4rem] border-white/10 text-center relative z-10 group overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <h2 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-8 relative z-10">
            O Próximo passo para o <br /><span className="text-primary">faturamento recorde.</span>
          </h2>
          <p className="text-slate-400 font-medium mb-12 relative z-10 max-w-lg mx-auto italic">
            Ative sua conta agora e ganhe 500 créditos iniciais. Instalação zero, resultados extraordinários.
          </p>
          <button 
            onClick={onGoToLogin}
            className="relative z-10 px-16 py-8 bg-white text-[#050505] hover:bg-white/90 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 mx-auto"
          >
            Acessar Plataforma
            <ChevronRight size={24} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <BrainCircuit className="text-primary" size={20} />
            </div>
            <span className="text-lg font-black text-white tracking-tighter uppercase italic">LeadMatrix<span className="text-primary">.</span></span>
          </div>

          <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
            <a href="#" className="hover:text-white transition-colors">Vapi Tech</a>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All Nodes Operational</span>
             </div>
             <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
