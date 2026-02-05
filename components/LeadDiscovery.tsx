
import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building2, Filter, Loader2, Target, Globe, Crosshair, Sparkles, Zap, Square, ChevronDown } from 'lucide-react';
import LiquidBattery from './LiquidBattery';
import { CNAE_LIST } from '../constants';
import { SearchFilters } from '../types';
import { DiscoveryService } from '../services/discoveryService';
import { useBranding } from './BrandingProvider';

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
    industry: ''
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

    if (mode === 'ENRICH') {
      // Logica de enriquecimento individual
      setIsScanning(true);
      setScanProgress(50);
      try {
        const results = await DiscoveryService.performCNPJScan(filters.keyword, 'Busca Individual', config.tenantId);
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

    const runDiscoveryLoop = async () => {
      // Loop infinito até o usuário parar
      while (true) {
        if (isStoppingRef.current) break;

        setScanProgress(30);
        try {
          let currentSearchLocation = filters.location;

          // LOGICA DE VARREDURA ESTADUAL
          if (selectedCity === 'TODO_ESTADO' && cities.length > 0) {
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            currentSearchLocation = `${randomCity}, ${selectedState}`;
          }

          if (isStoppingRef.current) break;

          let results: any[] = [];
          if (mode === 'MAPS') {
            results = await DiscoveryService.performDeepScan(filters.keyword, currentSearchLocation, config.tenantId, config.apiKeys);
          } else { // mode === 'CNPJ'
            results = await DiscoveryService.performCNPJScan(filters.keyword, currentSearchLocation, config.tenantId);
          }

          if (isStoppingRef.current) break;

          if (results.length > 0) {
            setLeadsFound(prev => prev + results.length);
            onResultsFound(results);
          }

          setScanProgress(100);

          // Delay inteligente com verificação de parada
          for (let i = 0; i < 30; i++) { // 3 segundos de delay
            await new Promise(resolve => setTimeout(resolve, 100));
            if (isStoppingRef.current) break;
          }

          if (isStoppingRef.current) break;
          setScanProgress(10); // Reset for next loop
        } catch (err) {
          console.error(err);
          // Se der erro, espera um pouco e tenta de novo (ou para)
          await new Promise(resolve => setTimeout(resolve, 2000));
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
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-magenta-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col xl:flex-row gap-12 relative z-10">
        {/* Left Side: Brand & Status Monitoring */}
        <div className="xl:w-[35%] space-y-8 flex flex-col">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-3xl transition-all shrink-0 ${isScanning ? 'bg-primary animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-primary/10'} text-primary`}>
              {mode === 'MAPS' ? <Target size={32} /> : mode === 'CNPJ' ? <Building2 size={32} /> : <Sparkles size={32} />}
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
            <FeatureTag icon={<Globe size={12} />} label={mode === 'MAPS' ? 'Geospatial' : mode === 'CNPJ' ? 'Public Data' : 'Neural IA'} />
            <FeatureTag icon={<Zap size={12} />} label={mode === 'ENRICH' ? 'Direct Hit' : 'Deep Scan'} />
          </div>

          <div className="flex-1 flex flex-col justify-end mt-4">
            <div className="glass rounded-[2rem] p-2 border border-white/5 bg-white/[0.02]">
              <LiquidBattery
                percentage={leadsFound > 0 ? (Math.min(leadsFound, 100) / 100) * 100 : 0}
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
                  onClick={() => setMode('MAPS')}
                  disabled={isScanning}
                  label="Neural Discovery"
                />
                <ModeButton
                  active={mode === 'CNPJ'}
                  onClick={() => setMode('CNPJ')}
                  disabled={isScanning}
                  label="CNPJ em Massa"
                />
                <ModeButton
                  active={mode === 'ENRICH'}
                  onClick={() => setMode('ENRICH')}
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
                </>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <button
              onClick={handleSearch}
              disabled={(!isScanning && (!filters.keyword || (mode !== 'ENRICH' && !filters.location))) || stopSignal}
              className={`w-full py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed ${isScanning ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-primary text-slate-900 shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]'
                }`}
            >
              {isScanning ? (
                <>
                  {stopSignal ? (
                    <><Loader2 size={28} className="animate-spin" /><span>FINALIZANDO CICLO...</span></>
                  ) : (
                    <><Square size={28} fill="currentColor" /><span>INTERROMPER VARREDURA ({leadsFound})</span></>
                  )}
                  <div className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-500" style={{ width: `${scanProgress}%` }}></div>
                </>
              ) : (
                <>
                  <Zap size={28} fill="currentColor" className="group-hover/btn:rotate-12 transition-transform" />
                  <span>{mode === 'ENRICH' ? 'ENRIQUECER CNPJ AGORA' : 'INICIAR NEURAL EXTRACTION'}</span>
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
