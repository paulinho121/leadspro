
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
}

const LeadDiscovery: React.FC<LeadDiscoveryProps> = ({ onResultsFound, onStartEnrichment }) => {
  const { config } = useBranding();
  const [mode, setMode] = useState<'MAPS' | 'CNPJ' | 'ENRICH'>('MAPS');
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

  const [stopSignal, setStopSignal] = useState(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (selectedState) {
      const fetchCities = async () => {
        setLoadingCities(true);
        try {
          const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${selectedState}?providers=dados-abertos-br,gov,wikipedia`);
          const data = await response.json();
          setCities(data.map((c: any) => c.nome).sort());
        } catch (error) {
          console.error('Erro ao buscar cidades:', error);
        } finally {
          setLoadingCities(false);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
    setSelectedCity('');
  }, [selectedState]);

  useEffect(() => {
    if (selectedCity && selectedState) {
      if (selectedCity === 'TODO_ESTADO') {
        setFilters(prev => ({ ...prev, location: `${selectedState}, Brasil` }));
      } else {
        setFilters(prev => ({ ...prev, location: `${selectedCity}, ${selectedState}` }));
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

    let searchMode = mode;
    const cleanKeyword = filters.keyword.trim();

    // INTELIGÊNCIA ARTIFICIAL: Se detectar padrão de CNAE no modo MAPS, redireciona para modo CNPJ automaticamente
    // Usamos uma regex mais flexível para capturar o padrão mesmo com espaços ou variações sutis
    if (searchMode === 'MAPS' && /\d{4}-\d\/\d{2}/.test(cleanKeyword)) {
      console.log('%c[Neural IA] Padrão CNAE detectado no modo MAPS. Redirecionando para motor de Varredura Governamental.', 'color: #06b6d4; font-weight: bold;');
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
      } catch (err) {
        console.error(err);
        setIsScanning(false);
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
            // Se varrer estado, percorre cada cidade. 
            // Incrementa a página apenas quando rodar todas as cidades do estado.
            const targetCity = cities[cityIndex];
            currentSearchLocation = `${targetCity}, ${selectedState}`;

            cityIndex++;
            if (cityIndex >= cities.length) {
              cityIndex = 0;
              currentPage++;
            }
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
              results = await DiscoveryService.performDeepScan(cleanKeyword, currentSearchLocation, config.tenantId, config.apiKeys, currentPage);
            } else {
              console.log(`[CNPJ] Chamando performCNPJScan com Q: ${cleanKeyword}`);
              results = await DiscoveryService.performCNPJScan(cleanKeyword, currentSearchLocation, config.tenantId, config.apiKeys, currentPage);
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
          console.error(err);
          if (err.message === 'SERPER_API_KEY_MISSING') {
            alert('Erro: Chave do Serper (Google Search) não configurada. Configure no menu Parceiro ou no arquivo .env.local.');
            isStoppingRef.current = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
          if (isStoppingRef.current) break;
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

  return (
    <div className="glass rounded-[2.5rem] p-8 lg:p-12 border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Background Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col xl:flex-row gap-12 relative z-10">
        {/* Left Side: Brand & Status Monitoring */}
        <div className="xl:w-[35%] space-y-8 flex flex-col">
          <div className="flex items-center gap-5">
            <div className={`relative p-5 rounded-3xl transition-all shrink-0 ${isScanning ? 'bg-primary shadow-[0_0_30px_rgba(6,182,212,0.6)]' : 'bg-primary/10'} text-primary overflow-hidden group/neural`}>
              {/* Animated Background for the icon */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/neural:opacity-100 transition-opacity ${isScanning ? 'opacity-100 animate-spin-slow' : ''}`}></div>
              <div className="relative z-10 transition-transform duration-500 group-hover/neural:scale-110">
                {mode === 'MAPS' ? <Cpu size={32} className={isScanning ? 'animate-neural' : ''} /> : mode === 'CNPJ' ? <Building2 size={32} /> : <BrainCircuit size={32} className={isScanning ? 'animate-neural' : ''} />}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] font-mono">Neural_Scanner</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">V2.0</span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                {mode === 'MAPS' ? 'Neural Extractor' : mode === 'CNPJ' ? 'Empresas Gov' : 'Deep Enrich'}
              </h3>
            </div>
          </div>

          <p className="text-slate-400 text-sm lg:text-base leading-relaxed">
            {mode === 'MAPS'
              ? 'Localize leads qualificados com inteligência neural profunda e geolocalização.'
              : mode === 'CNPJ'
                ? 'Acesse a base oficial de empresas brasileiras com alta precisão e dados da Receita.'
                : 'Enriqueça dados de um CNPJ individual com IA e consulta em múltiplas APIs publicas.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FeatureTag icon={<Atom size={12} className="animate-spin-slow" />} label={mode === 'MAPS' ? 'Geospatial' : mode === 'CNPJ' ? 'Public Data' : 'Neural IA'} />
            <FeatureTag icon={<Zap size={12} className="animate-pulse" />} label={mode === 'ENRICH' ? 'Direct Hit' : 'Deep Scan'} />
          </div>

          <div className="flex-1 flex flex-col justify-end mt-4">
            <div className="glass rounded-[2rem] p-2 border border-white/5 bg-white/[0.02]">
              <LiquidBattery
                percentage={scanProgress}
                isScanning={isScanning}
                label={isScanning ? "VARRENDO..." : "DETECTADOS"}
                subLabel={`${leadsFound} LEADS`}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Setup & Action Area */}
        <div className="flex-1 space-y-8 flex flex-col justify-between">
          <div className="space-y-8">
            {/* Mode Switcher */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 mb-3 block">Selecione o Motor de Busca</label>
              <div className="flex flex-wrap bg-white/5 rounded-2xl p-1.5 border border-white/5 w-fit">
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
                  active={mode === 'ENRICH'}
                  onClick={() => { setMode('ENRICH'); console.log('[LeadDiscovery] Mode changed to ENRICH'); }}
                  disabled={isScanning}
                  label="Enriquecer Individual"
                />
              </div>
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${mode === 'ENRICH' ? 'md:col-span-2' : ''} space-y-3`}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                  {mode === 'MAPS' ? 'Nicho ou Atividade' : mode === 'CNPJ' ? 'CNAE ou Palavra-chave' : 'Número do CNPJ'}
                </label>
                <div className="relative group/input">
                  <Search className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                  <input
                    type="text"
                    disabled={isScanning}
                    placeholder={mode === 'MAPS' ? "Ex: Academias, Restaurantes..." : mode === 'CNPJ' ? "Ex: 6201-5/00 ou Tecnologia" : "00.000.000/0001-00"}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white text-lg focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  />
                </div>
              </div>

              {mode !== 'ENRICH' && (
                <>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Estado (UF)</label>
                    <div className="relative group/input">
                      <MapPin className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                      <select
                        disabled={isScanning}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
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
                      {loadingCities ? (
                        <Loader2 className="absolute left-5 top-5 w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <MapPin className="absolute left-5 top-5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                      )}
                      <select
                        disabled={isScanning || !selectedState || loadingCities}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      >
                        <option value="" className="bg-slate-900 text-slate-500">
                          {loadingCities ? 'Carregando cidades...' : !selectedState ? 'Selecione o Estado primeiro' : 'Selecione a Cidade'}
                        </option>
                        {cities.length > 0 && (
                          <option value="TODO_ESTADO" className="bg-emerald-900 text-emerald-400 font-bold">
                            ★ VARRER TODO O ESTADO ({selectedState})
                          </option>
                        )}
                        {cities.map(city => (
                          <option key={city} value={city} className="bg-slate-900 text-white">{city}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-5.5 w-5 h-5 text-slate-500 pointer-events-none" />
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
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white text-lg focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={filters.limit || ''}
                        onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute right-5 top-5 text-[10px] font-black text-slate-600 uppercase">LEADS</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <button
              onClick={handleSearch}
              disabled={(!isScanning && (!filters.keyword || (mode !== 'ENRICH' && !filters.location))) || (isScanning && stopSignal)}
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
    </div>
  );
};

const ModeButton = ({ active, onClick, disabled, label }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${active
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
