interface CacheEntry<T> {
  data: T;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  source: string;
  confidence: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class IntelligentCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  private static maxCacheSize = 10000;
  private static cleanupInterval = 5 * 60 * 1000; // 5 minutos

  /**
   * Cache inteligente com TTL dinâmico baseado na fonte e confiança
   */
  static async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Verificar expiração
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateStats();

    console.log(`[Cache HIT] ${key} (acessado ${entry.accessCount}x)`);
    return entry.data;
  }

  /**
   * Armazenamento com TTL inteligente
   */
  static set<T>(key: string, data: T, source: string, confidence: number = 0.8): void {
    // TTL dinâmico baseado na fonte e confiança
    const ttl = this.calculateTTL(source, confidence);
    
    const entry: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      source,
      confidence
    };

    // Implementar LRU se cache estiver cheio
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, entry);
    console.log(`[Cache SET] ${key} (TTL: ${ttl}ms, Fonte: ${source})`);
  }

  /**
   * Cache multi-fonte com merge inteligente
   */
  static async getWithFallback<T>(key: string, fetchers: Array<{ name: string; fn: () => Promise<T> }>): Promise<T> {
    // Tentar obter do cache primeiro
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Tentar cada fonte em ordem de prioridade
    for (const fetcher of fetchers) {
      try {
        const data = await fetcher.fn();
        if (data) {
          // Calcular confiança baseado na fonte
          const confidence = this.getSourceConfidence(fetcher.name);
          this.set(key, data, fetcher.name, confidence);
          return data;
        }
      } catch (error) {
        console.warn(`[Cache Fallback] Falha na fonte ${fetcher.name}:`, error);
        continue;
      }
    }

    throw new Error(`Todas as fontes falharam para key: ${key}`);
  }

  /**
   * Invalidação inteligente por padrão
   */
  static invalidatePattern(pattern: string): number {
    let invalidated = 0;
    const regex = new RegExp(pattern);

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    console.log(`[Cache Invalidate] ${invalidated} entradas removidas (pattern: ${pattern})`);
    return invalidated;
  }

  /**
   * Pré-carregamento inteligente baseado em padrões de uso
   */
  static async preloadCommonData(): Promise<void> {
    const commonPatterns = [
      'cnpj:*',
      'phone:*',
      'email:*',
      'social:*'
    ];

    for (const pattern of commonPatterns) {
      // Implementar lógica de pré-carregamento baseado em uso histórico
      console.log(`[Cache Preload] Analisando padrão: ${pattern}`);
    }
  }

  /**
   * Otimização automática do cache
   */
  static optimizeCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remover entradas expiradas
    let expired = 0;
    for (const [key, entry] of entries) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        expired++;
      }
    }

    // Remover entradas raramente usadas (LRU)
    if (this.cache.size > this.maxCacheSize * 0.8) {
      const sorted = entries
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, Math.floor(this.maxCacheSize * 0.2));

      for (const [key] of sorted) {
        this.cache.delete(key);
      }

      console.log(`[Cache Optimize] ${expired} expiradas, ${sorted.length} LRU removidas`);
    } else {
      console.log(`[Cache Optimize] ${expired} expiradas, 0 LRU removidas`);
    }
  }

  /**
   * Estatísticas detalhadas do cache
   */
  static getStats(): CacheStats & { topEntries: Array<{ key: string; accessCount: number; source: string }> } {
    const topEntries = Array.from(this.cache.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        source: entry.source
      }));

    return {
      ...this.stats,
      topEntries
    };
  }

  /**
   * Limpeza completa do cache
   */
  static clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
    console.log('[Cache Clear] Cache limpo completamente');
  }

  // Métodos privados
  private static calculateTTL(source: string, confidence: number): number {
    const ttlMap = {
      'brasilapi': 24 * 60 * 60 * 1000,      // 24 horas
      'receitaws': 24 * 60 * 60 * 1000,      // 24 horas
      'cnpja': 24 * 60 * 60 * 1000,          // 24 horas
      'hunter': 7 * 24 * 60 * 60 * 1000,     // 7 dias
      'serper': 1 * 60 * 60 * 1000,          // 1 hora
      'gemini': 30 * 24 * 60 * 60 * 1000,    // 30 dias
      'manual': 7 * 24 * 60 * 60 * 1000      // 7 dias
    };

    const defaultTTL = ttlMap.manual;
    const sourceTTL = ttlMap[source] || defaultTTL;
    return Math.floor(sourceTTL * confidence);
  }

  private static getSourceConfidence(source: string): number {
    const confidences = {
      'brasilapi': 0.9,
      'receitaws': 0.85,
      'cnpja': 0.88,
      'hunter': 0.75,
      'serper': 0.7,
      'gemini': 0.6,
      'manual': 0.95
    };

    return confidences[source] || 0.5;
  }

  private static evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toEvict = Math.floor(this.maxCacheSize * 0.1);
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }

    console.log(`[Cache LRU] ${toEvict} entradas removidas`);
  }

  private static updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
  }

  // Iniciar limpeza automática
  static {
    setInterval(() => {
      this.optimizeCache();
    }, this.cleanupInterval);
  }
}
