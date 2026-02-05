
import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building2, Filter, Loader2, Target, Globe, Crosshair, Sparkles, Zap, Square, ChevronDown } from 'lucide-react';
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
  const [mode, setMode] = useState<'MAPS' | 'CNPJ'>('MAPS');
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
  const [isStoppingUI, setIsStoppingUI] = useState(false);
  const isStopping = useRef(false);

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

  const handleSearch = async () => {
    if (isScanning) {
      isStopping.current = true;
      setIsStoppingUI(true);
      return;
    }

    setIsScanning(true);
    setHasFinished(false);
    setScanProgress(10);
    setLeadsFound(0);
    isStopping.current = false;
    setIsStoppingUI(false);

    const runDiscoveryLoop = async () => {
      while (!isStopping.current) {
        setScanProgress(20);
        try {
          if (isStopping.current) break;

          let currentSearchLocation = filters.location;

          // LOGICA DE VARREDURA ESTADUAL: Se escolheu "Todo o Estado", a cada loop pega uma cidade aleatória da lista
          if (selectedCity === 'TODO_ESTADO' && cities.length > 0) {
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            currentSearchLocation = `${randomCity}, ${selectedState}`;
            console.log(`[Neural Scan] Varrendo cidade aleatória no estado: ${currentSearchLocation}`);
          }

          let results: any[] = [];
          if (mode === 'MAPS') {
            results = await DiscoveryService.performDeepScan(filters.keyword, currentSearchLocation, config.tenantId, config.apiKeys);
          } else {
            // Para CNPJ, talvez mantenha o estado todo ou use a mesma lógica
            results = await DiscoveryService.performCNPJScan(filters.keyword, currentSearchLocation, config.tenantId);
          }

          if (isStopping.current) break;

          setLeadsFound(prev => prev + results.length);
          onResultsFound(results);
          setScanProgress(100);

          // Aguarda 3 segundos ou para imediatamente se solicitado
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (isStopping.current) break;
          }

          if (isStopping.current) break;
          setScanProgress(10);
        } catch (err) {
          console.error(err);
          break;
        }
      }
      setIsScanning(false);
      setScanProgress(0);
      isStopping.current = false;
      setIsStoppingUI(false);
      setHasFinished(true);
    };

    runDiscoveryLoop();
  };

  return (
    <div className="glass rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

      {/* Mode Selector */}
      <div className="flex bg-white/5 rounded-2xl p-1 mb-10 w-fit border border-white/5 relative z-10">
        <button
          onClick={() => !isScanning && setMode('MAPS')}
          disabled={isScanning}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'MAPS' ? 'bg-primary text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Google Maps
        </button>
        <button
          onClick={() => !isScanning && setMode('CNPJ')}
          disabled={isScanning}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'CNPJ' ? 'bg-primary text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Base CNPJ (Gov)
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Info */}
        <div className="lg:w-1/3 space-y-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-all ${isScanning ? 'bg-primary animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-primary/10'} text-primary`}>
              {mode === 'MAPS' ? <Target size={28} /> : <Building2 size={28} />}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {mode === 'MAPS' ? 'Captador Google Maps' : 'Buscador de Empresas'}
              </h3>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">
                {mode === 'MAPS' ? 'Extração_Geolocalizada' : 'Dataset_Governamental'}
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            {mode === 'MAPS'
              ? 'Utilize nossa IA para varrer o Google Maps em busca de empresas ativas, redes sociais e contatos diretos.'
              : 'Acesse a base oficial da Receita Federal para encontrar dados cadastrais, sócios e faturamento presumido.'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FeatureTag icon={<Globe size={12} />} label={mode === 'MAPS' ? 'Web Scan' : 'Dados Oficiais'} />
            <FeatureTag icon={<Zap size={12} />} label="Loops Ativos" />
            <FeatureTag icon={<Crosshair size={12} />} label="Auto-Pilot" />
            <FeatureTag icon={<Sparkles size={12} />} label="AI Enrich" />
          </div>

          {hasFinished && leadsFound > 0 && (
            <div className="pt-6 animate-fade-in-up">
              <button
                onClick={onStartEnrichment}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-magenta-500 to-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-magenta-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Sparkles size={16} />
                Iniciar Enriquecimento IA
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-3 font-mono font-bold uppercase tracking-widest">
                Processar {leadsFound} amostras agora
              </p>
            </div>
          )}
        </div>

        {/* Input Controls */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                {mode === 'MAPS' ? 'Nicho ou Atividade' : 'CNAE ou Palavra-chave'}
              </label>
              <div className="relative group/input">
                <Search className="absolute left-4 top-4.5 translate-y-0.5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                <input
                  type="text"
                  disabled={isScanning}
                  placeholder={mode === 'MAPS' ? "Ex: Academias, Restaurantes..." : "Ex: 6201-5/00 ou Tecnologia"}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4.5 pl-12 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Estado (UF)</label>
              <div className="relative group/input">
                <MapPin className="absolute left-4 top-4.5 translate-y-0.5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                <select
                  disabled={isScanning}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4.5 pl-12 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  <option value="" className="bg-slate-900 text-slate-500">Selecione o Estado</option>
                  {states.map(uf => (
                    <option key={uf} value={uf} className="bg-slate-900 text-white">{uf}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Cidade</label>
              <div className="relative group/input">
                {loadingCities ? (
                  <Loader2 className="absolute left-4 top-4.5 translate-y-0.5 w-5 h-5 text-primary animate-spin" />
                ) : (
                  <MapPin className="absolute left-4 top-4.5 translate-y-0.5 w-5 h-5 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                )}
                <select
                  disabled={isScanning || !selectedState || loadingCities}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4.5 pl-12 pr-6 text-white focus:ring-2 focus:ring-primary/40 focus:bg-white/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
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
                <ChevronDown className="absolute right-4 top-5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="relative pt-4">
            <button
              onClick={handleSearch}
              disabled={(!isScanning && (!filters.keyword || !filters.location)) || isStoppingUI}
              className={`w-full py-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed ${isScanning ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-primary text-slate-900 shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]'
                }`}
            >
              {isScanning ? (
                <>
                  {isStoppingUI ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span>PARANDO... AGUARDE</span>
                    </>
                  ) : (
                    <>
                      <Square size={24} fill="currentColor" />
                      <span>PARAR EXTRAÇÃO CONTÍNUA ({leadsFound})</span>
                    </>
                  )}
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </>
              ) : (
                <>
                  <Zap size={24} fill="currentColor" />
                  <span>INICIAR NEURAL EXTRACTION</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {isScanning ? 'Varredura Infinita em Execução' : 'Motor Pronto para Loop'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 italic">Novo lote a cada 3s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureTag = ({ icon, label }: any) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
    <span className="text-primary">{icon}</span>
    {label}
  </div>
);

export default LeadDiscovery;
