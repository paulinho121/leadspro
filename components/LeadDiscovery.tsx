
import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building2, Filter, Loader2, Target, Globe, Crosshair, Sparkles, Zap, Square, ChevronDown, Cpu, BrainCircuit, Atom } from 'lucide-react';
import LiquidBattery from './LiquidBattery';
import { CNAE_LIST } from '../constants';
import { SearchFilters } from '../types';
import { DiscoveryService } from '../services/discoveryService';
import { ActivityService } from '../services/activityService';
import { useBranding } from './BrandingProvider';
import { supabase } from '../lib/supabase';

interface LeadDiscoveryProps {
  onResultsFound: (results: any[]) => void;
  onStartEnrichment: () => void;
  apiKeys?: any;
}

// Fallback estratégico para varredura se APIs falharem no online
const CITY_FALLBACK_SEED: Record<string, string[]> = {
  'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Itapipoca', 'Quixadá'],
  'SP': ['São Paulo', 'Campinas', 'Guarulhos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto'],
  'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo'],
  'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros'],
  'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Ilhéus'],
  'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais'],
  'RS': ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí'],
  'SC': ['Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Chapecó', 'Itajaí'],
  'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista'],
};

const LeadDiscovery: React.FC<LeadDiscoveryProps> = ({ onResultsFound, onStartEnrichment, apiKeys }) => {
  const { config } = useBranding();
  const [mode, setMode] = useState<'MAPS' | 'CNPJ' | 'ENRICH' | 'SHERLOCK'>('MAPS');
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    location: '',
    industry: '',
    limit: 50
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [leadsFound, setLeadsFound] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [states, setStates] = useState<string[]>(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);
  const [selectedState, setSelectedState] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [neuralError, setNeuralError] = useState<{ type: 'MISSING' | 'INVALID' | 'CREDITS' | 'GENERIC', message: string } | null>(null);

  const [stopSignal, setStopSignal] = useState(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (selectedState) {
      const fetchCities = async () => {
        setLoadingCities(true);
        try {
          // IBGE pode falhar por CORS na Vercel
          const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`, {
            headers: { 'Accept': 'application/json' }
          });
          if (!response.ok) throw new Error('IBGE_FAILED');
          const data = await response.json();
          setCities(data.map((c: any) => c.nome).sort());
        } catch (error) {
          console.warn('[Discovery] IBGE falhou, tentando BrasilAPI...', error);
          try {
            const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${selectedState}`);
            if (!response.ok) throw new Error('BRASIL_API_FAILED');
            const data = await response.json();
            setCities(data.map((c: any) => c.nome).sort());
          } catch (err2) {
            console.error('[Discovery] API Digital falhou no Online. Ativando Seed de Fallback.');
            // Se tudo falhar, usamos nosso Seed local para não travar a varredura
            setCities(CITY_FALLBACK_SEED[selectedState] || []);
          }
        } finally {
          setLoadingCities(false);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState) {
      if (selectedCity === 'TODO_ESTADO') {
        setFilters(prev => ({ ...prev, location: `${selectedState}, Brasil` }));
      } else if (selectedCity) {
        setFilters(prev => ({ ...prev, location: `${selectedCity}, ${selectedState}` }));
      } else {
        setFilters(prev => ({ ...prev, location: `${selectedState}, Brasil` }));
      }
    }
  }, [selectedCity, selectedState]);

  const handleStop = () => {
    isStoppingRef.current = true;
    setStopSignal(true);
  };

  const handleSearch = async () => {
    if (isScanning) {
      handleStop();
      return;
    }

    setNeuralError(null);
    let searchMode = mode;
    const cleanKeyword = filters.keyword.trim();

    // INTELIGÊNCIA ARTIFICIAL: Se detectar padrão de CNAE no modo MAPS, redireciona para modo CNPJ automaticamente
    // Usamos uma regex mais flexível para capturar o padrão mesmo com espaços ou variações sutis
    if (searchMode === 'MAPS' && /\d{4}-\d\/\d{2}/.test(cleanKeyword)) {
      console.log('%c[Neural IA] Padrão CNAE detectado no modo MAPS. Redirecionando para motor de Varredura Governamental.', 'color: #f97316; font-weight: bold;');
      setMode('CNPJ');
      searchMode = 'CNPJ';
    }

    if (searchMode === 'ENRICH') {
      // Logica de enriquecimento individual
      setIsScanning(true);
      setScanProgress(50);
      try {
        const results = await DiscoveryService.performCNPJScan(cleanKeyword, 'Busca Individual', config.tenantId);
        onResultsFound(results);
        setLeadsFound(1);
        setIsScanning(false);
        setHasFinished(true);
        onStartEnrichment(); // Aciona enriquecimento automático
      } catch (err: any) {
        setIsScanning(false);
        handleNeuralError(err);
      }
      return;
    }

    setIsScanning(true);
    setHasFinished(false);
    setScanProgress(10);
    setLeadsFound(0);
    isStoppingRef.current = false;
    setStopSignal(false);

    // Registrar atividade
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        ActivityService.log(config.tenantId, session.user.id, 'LEAD_CAPTURE', `Iniciada varredura por "${filters.keyword}" em ${filters.location || 'Brasil'}.`);
      }
    });

    const runDiscoveryLoop = async () => {
      let currentPage = 1;
      let cityIndex = 0;

      // Loop infinito até comando de parada
      while (!isStoppingRef.current) {

        setScanProgress(30);
        try {
          let currentSearchLocation = filters.location;

          // LOGICA DE VARREDURA MASSIVA ESTADUAL
          if (selectedCity === 'TODO_ESTADO' && cities.length > 0) {
            const targetCity = cities[cityIndex];
            currentSearchLocation = `${targetCity}, ${selectedState}`;
            console.log(`[Neural Loop] Ciclo de Varredura: ${targetCity} (${cityIndex + 1}/${cities.length})`);

            cityIndex++;
            if (cityIndex >= cities.length) {
              cityIndex = 0;
              currentPage++;
            }
          } else if (selectedCity === 'TODO_ESTADO' && cities.length === 0) {
            // Prevenção contra travamento no online se sem cidades
            currentSearchLocation = `${selectedState}, Brasil`;
          }

          if (isStoppingRef.current) break;

          let results: any[] = [];

          // Iniciar progresso suave (Neural Simulation)
          setScanProgress(10);
          const progressInterval = setInterval(() => {
            setScanProgress(prev => {
              if (prev < 85) return prev + Math.random() * 5;
              return prev;
            });
          }, 400);

          try {
            console.log(`[Neural Discovery] Loop de varredura executando com modo: ${searchMode}, keyword: ${cleanKeyword}, local: ${currentSearchLocation}`);

            if (searchMode === 'MAPS') {
              results = await DiscoveryService.performDeepScan(cleanKeyword, currentSearchLocation, config.tenantId, apiKeys, currentPage);
            } else if (searchMode === 'SHERLOCK') {
              // No modo SHERLOCK, usamos o campo "industry" para passar as palavras-chave de contexto
              const contextKeywords = filters.industry;
              console.log(`[Sherlock] Chamando performCompetitorScan com Alvo: ${cleanKeyword} e Contexto: ${contextKeywords}`);
              results = await DiscoveryService.performCompetitorScan(cleanKeyword, currentSearchLocation, config.tenantId, apiKeys, currentPage, contextKeywords);
            } else {
              console.log(`[CNPJ] Chamando performCNPJScan com Q: ${cleanKeyword}`);
              results = await DiscoveryService.performCNPJScan(cleanKeyword, currentSearchLocation, config.tenantId, apiKeys, currentPage);
            }
          } finally {
            clearInterval(progressInterval);
          }

          if (isStoppingRef.current) break;

          if (results.length > 0) {
            setLeadsFound(prev => {
              const nextCount = prev + results.length;
              if (filters.limit && filters.limit > 0 && nextCount >= filters.limit) {
                isStoppingRef.current = true;
                setStopSignal(true);
              }
              return nextCount;
            });
            onResultsFound(results);
          } else if (searchMode === 'MAPS' && selectedCity !== 'TODO_ESTADO') {
            break;
          }

          // Salto final para 100% ao concluir ciclo de página
          setScanProgress(100);

          if (selectedCity !== 'TODO_ESTADO') {
            currentPage++;
          }

          // Delay de sustentação visual (Bateria cheia) - Ciclo de 3 segundos
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (isStoppingRef.current) break;
            // Mantém a bateria cheia enquanto prepara o próximo salto
            setScanProgress(100);
          }

          if (isStoppingRef.current) break;
          // Não zera, apenas volta um pouco para sinalizar novo salto de busca
          setScanProgress(10);
        } catch (err: any) {
          console.error("[LeadDiscovery] Erro no loop:", err);
          handleNeuralError(err);
          isStoppingRef.current = true;
          break;
        }
      }

      // Cleanup
      setIsScanning(false);
      setScanProgress(0);
      setHasFinished(true);
      isStoppingRef.current = false;
      setStopSignal(false);
    };

    runDiscoveryLoop();
  };

  const handleNeuralError = (err: any) => {
    const msg = String(err.message || '');
    if (msg.includes('SERPER_API_KEY_MISSING') || msg.includes('GEMINI_API_KEY_MISSING')) {
      setNeuralError({
        type: 'MISSING',
        message: 'Chaves de API não configuradas. Você precisa configurar o motor de busca e IA no menu de Parceiro para realizar extrações.'
      });
    } else if (msg.includes('401') || msg.includes('403') || msg.includes('invalid') || msg.includes('Unauthorized')) {
      setNeuralError({
        type: 'INVALID',
        message: 'Chave de API inválida ou expirada. Verifique se copiou a chave corretamente no painel do provedor.'
      });
    } else if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('INSUFFICIENT_CREDITS')) {
      setNeuralError({
        type: 'CREDITS',
        message: 'Limite de créditos atingido. Adquira mais créditos ou verifique sua conta no provedor da API.'
      });
    } else {
      setNeuralError({
        type: 'GENERIC',
        message: 'Ocorreu um erro inesperado na conexão com o motor neural. Tente novamente em alguns segundos.'
      });
    }
  };

  return (
    <div className="glass rounded-[2.5rem] p-8 lg:p-12 border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Background Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col gap-10 relative z-10">

        {/* HARMONIOUS HEADER: Title & Stats */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4 lg:space-y-6 flex-1">
            <div className="flex items-center gap-4 lg:gap-5">
              <div className={`relative p-3 lg:p-4 rounded-2xl transition-all shrink-0 ${isScanning ? 'bg-primary shadow-[0_0_30px_rgba(249,115,22,0.6)]' : 'bg-primary/10'} text-primary overflow-hidden group/neural`}>
                <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/neural:opacity-100 transition-opacity ${isScanning ? 'opacity-100 animate-spin-slow' : ''}`}></div>
                {mode === 'MAPS' ? <Cpu size={24} className={isScanning ? 'animate-neural' : ''} /> :
                  mode === 'CNPJ' ? <Building2 size={24} /> :
                    mode === 'SHERLOCK' ? <Crosshair size={24} className={isScanning ? 'animate-pulse text-red-500' : ''} /> :
                      <BrainCircuit size={24} className={isScanning ? 'animate-neural' : ''} />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] lg:text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] font-mono">Neural_Scanner</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="text-[8px] lg:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">V2.0</span>
                </div>
                <h3 className="text-xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                  {mode === 'MAPS' ? 'Neural Extractor' :
                    mode === 'CNPJ' ? 'Empresas Gov' :
                      mode === 'SHERLOCK' ? 'Hunter Protocol' :
                        'Deep Enrich'}
                </h3>
              </div>
            </div>

            <p className="text-slate-400 text-xs lg:text-base leading-relaxed max-w-2xl">
              {mode === 'MAPS'
                ? 'Localize leads qualificados com inteligência neural profunda.'
                : mode === 'CNPJ'
                  ? 'Acesse a base oficial de empresas brasileiras com alta precisão.'
                  : mode === 'SHERLOCK'
                    ? 'Localize clientes insatisfeitos e interações públicas.'
                    : 'Enriqueça dados de um CNPJ individual com IA.'}
            </p>
          </div>

          {/* Stats Group */}
          <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex flex-row lg:flex-col gap-2">
              <FeatureTag icon={<Atom size={12} className="animate-spin-slow" />} label={mode === 'MAPS' ? 'Geo' : mode === 'SHERLOCK' ? 'Social' : 'Public'} />
              <FeatureTag icon={<Zap size={12} className="animate-pulse" />} label={mode === 'ENRICH' ? 'Direct' : 'Deep'} />
            </div>
            <div className="w-[120px] lg:w-[140px] h-[60px] lg:h-[70px]">
              <LiquidBattery
                percentage={scanProgress}
                isScanning={isScanning}
                label={isScanning ? "SCAN..." : "LEADS"}
                subLabel={`${leadsFound} FOUND`}
              />
            </div>
          </div>
        </div>

        {/* CONTROLS SECTION */}
        <div className="space-y-8">

          {/* 1. Mode Switcher */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Selecione o Motor de Busca</label>
            <div className="flex flex-wrap items-center gap-2">
              <ModeButton
                active={mode === 'MAPS'}
                onClick={() => { setMode('MAPS'); console.log('[LeadDiscovery] Mode changed to MAPS'); }}
                disabled={isScanning}
                label="Neural Discovery"
              />
              <ModeButton
                active={mode === 'CNPJ'}
                onClick={() => { setMode('CNPJ'); console.log('[LeadDiscovery] Mode changed to CNPJ'); }}
                disabled={isScanning}
                label="CNPJ em Massa"
              />
              <ModeButton
                active={mode === 'SHERLOCK'}
                onClick={() => { setMode('SHERLOCK'); console.log('[LeadDiscovery] Mode changed to SHERLOCK'); }}
                disabled={isScanning}
                label="Espionagem"
              />
              <ModeButton
                active={mode === 'ENRICH'}
                onClick={() => { setMode('ENRICH'); console.log('[LeadDiscovery] Mode changed to ENRICH'); }}
                disabled={isScanning}
                label="Enriquecer Individual"
              />
            </div>
          </div>

          {/* 2. Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            <div className={`${mode === 'ENRICH' ? 'md:col-span-2' : ''} space-y-3`}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                {mode === 'MAPS' ? 'Nicho ou Atividade' :
                  mode === 'CNPJ' ? 'CNAE ou Palavra-chave' :
                    mode === 'SHERLOCK' ? 'Alvo / Concorrente' :
                      'Número do CNPJ'}
              </label>
              <div className="relative group/input">
                <Search className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                <input
                  type="text"
                  disabled={isScanning}
                  placeholder={mode === 'MAPS' ? "Ex: Academias, Restaurantes..." : mode === 'CNPJ' ? "Ex: 6201-5/00 ou Tecnologia" : mode === 'SHERLOCK' ? "Link Instagram/Site ou Nome do Concorrente" : "00.000.000/0001-00"}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                />
              </div>
            </div>

            {mode === 'SHERLOCK' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Filtro de Contexto (Opcional)</label>
                <div className="relative group/input">
                  <Filter className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                  <input
                    type="text"
                    disabled={isScanning}
                    placeholder="Ex: insatisfeito, reclamação, preço, defeito..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                    value={filters.industry}
                    onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                  />
                </div>
              </div>
            )}

            {mode !== 'ENRICH' && mode !== 'SHERLOCK' && (
              <>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Estado (UF)</label>
                  <div className="relative group/input">
                    <MapPin className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                    <select
                      disabled={isScanning}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                    >
                      <option value="" className="bg-slate-900 text-slate-500">Selecione o Estado</option>
                      {states.map(uf => (
                        <option key={uf} value={uf} className="bg-slate-900 text-white">{uf}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-5.5 w-5 h-5 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Cidade</label>
                  <div className="relative group/input">
                    {/* INPUT HÍBRIDO AUTOCOMPLETE: Sempre permite digitar, mas sugere se a API carregar. */}
                    <input
                      type="text"
                      disabled={isScanning || !selectedState}
                      onFocus={() => setShowCitySuggestions(true)}
                      placeholder={!selectedState ? "Selecione o Estado primeiro" : "Busque ou digite a cidade..."}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                      value={selectedCity === 'TODO_ESTADO' ? `★ VARRER TODO O ESTADO (${selectedState})` : selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setShowCitySuggestions(true);
                      }}
                      onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                    />

                    {/* Sugestões do Autocomplete */}
                    {showCitySuggestions && selectedState && !isScanning && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-2 glass-strong rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                        {/* Opção Especial: Todo o Estado */}
                        <div
                          onClick={() => { setSelectedCity('TODO_ESTADO'); setShowCitySuggestions(false); }}
                          className="p-4 flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer border-b border-white/5 transition-colors group"
                        >
                          <Zap size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest">Varrer todo o Estado</span>
                            <span className="text-[10px] text-emerald-500/60 font-mono">Busca sequencial por todas as cidades de {selectedState}</span>
                          </div>
                        </div>

                        {/* Lista de Cidades (Filtrada) */}
                        {loadingCities ? (
                          <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                            <Loader2 size={24} className="animate-spin text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando cidades...</span>
                          </div>
                        ) : cities.length > 0 ? (
                          cities
                            .filter(c => c.toLowerCase().includes(selectedCity.toLowerCase()) && selectedCity !== 'TODO_ESTADO')
                            .slice(0, 50)
                            .map(city => (
                              <div
                                key={city}
                                onClick={() => { setSelectedCity(city); setShowCitySuggestions(false); }}
                                className="p-4 hover:bg-white/10 text-white text-sm cursor-pointer border-b border-white/5 last:border-0 transition-colors flex items-center gap-3"
                              >
                                <MapPin size={14} className="text-slate-600" />
                                {city}
                              </div>
                            ))
                        ) : (
                          <div className="p-6 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            {selectedCity ? 'Digite para usar nome manual' : 'Nenhuma cidade encontrada'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dica de Status */}
                    {!loadingCities && selectedState && cities.length === 0 && (
                      <div className="absolute -bottom-6 left-2 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-[8px] font-bold text-amber-500/80 uppercase tracking-widest leading-none">
                          API Offline: Digite o nome da cidade manualmente.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Qtd. Leads Almejada</label>
                  <div className="relative group/input">
                    <Target className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                    <input
                      type="number"
                      disabled={isScanning}
                      min="1"
                      placeholder="Ex: 30"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={filters.limit || ''}
                      onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 0 })}
                    />
                    <span className="absolute right-5 top-5 text-[10px] font-black text-slate-600 uppercase">LEADS</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. Global Action Button */}
          <div className="space-y-6 pt-2">
            <button
              onClick={handleSearch}
              disabled={(!isScanning && (!filters.keyword || (mode !== 'ENRICH' && mode !== 'SHERLOCK' && !filters.location))) || (isScanning && stopSignal)}
              className={`w-full py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all relative overflow-hidden group/btn shadow-2xl ${isScanning
                ? 'bg-red-600 text-white border-red-400 shadow-red-900/40 hover:bg-red-700 animate-pulse'
                : 'bg-primary text-slate-900 shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]'
                }`}
            >
              {isScanning ? (
                <>
                  <div className="absolute inset-0 bg-black/20 animate-scan pointer-events-none"></div>
                  {stopSignal ? (
                    <><Loader2 size={28} className="animate-spin" /><span>FINALIZANDO CICLO...</span></>
                  ) : (
                    <><Square size={28} fill="currentColor" className="animate-pulse" /><span>PARAR VARREDURA AGORA ({leadsFound})</span></>
                  )}
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/40 blur-lg rounded-full animate-pulse group-hover/btn:blur-xl transition-all"></div>
                    <Zap size={28} fill="currentColor" className="relative z-10 group-hover/btn:rotate-12 transition-transform" />
                  </div>
                  <span className="relative z-10">{mode === 'ENRICH' ? 'ENRIQUECER CNPJ AGORA' : 'INICIAR NEURAL EXTRACTION'}</span>
                </>
              )}
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isScanning ? 'Motor de Varredura em Alta Performance' : 'Sistemas Prontos para Operação'}
                </span>
              </div>
              <div className="flex items-center gap-6">
                {hasFinished && leadsFound > 0 && (
                  <button onClick={onStartEnrichment} className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Sparkles size={14} /> Processar Amostras
                  </button>
                )}
                <span className="text-[10px] font-bold text-slate-600 italic">Ciclo: {mode === 'ENRICH' ? 'Instantâneo' : '3.0s'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEURAL ERROR OVERLAY */}
      {neuralError && (
        <div className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500 scale-100">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full"></div>
              <img
                src="/api_error.png"
                alt="Neural Error"
                className="w-48 h-48 object-contain mx-auto relative z-10 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-3xl font-black text-white tracking-tighter">
                {neuralError.type === 'MISSING' ? 'Motor Desativado' :
                  neuralError.type === 'INVALID' ? 'Falha de Autenticação' :
                    neuralError.type === 'CREDITS' ? 'Créditos Esgotados' : 'Instabilidade Neural'}
              </h4>
              <p className="text-slate-400 text-base leading-relaxed">
                {neuralError.message}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => setNeuralError(null)}
                className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest transition-all"
              >
                ENTENDI
              </button>
              <button
                onClick={() => {
                  setNeuralError(null);
                  window.location.hash = '#partner'; // Tenta navegar para o menu de parceiro se existir rota por hash
                }}
                className="w-full py-5 bg-primary text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
              >
                CONFIGURAR AGORA
              </button>
            </div>

            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Error_Code: 0x{neuralError.type}_{Date.now().toString(16).toUpperCase()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const ModeButton = ({ active, onClick, disabled, label }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all active-scale ${active
      ? 'bg-primary text-slate-900 shadow-lg scale-[1.05]'
      : 'text-slate-500 hover:text-white hover:bg-white/5'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {label}
  </button>
);

const FeatureTag = ({ icon, label }: any) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-tighter shrink-0">
    <span className="text-primary shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </div>
);

export default LeadDiscovery;
