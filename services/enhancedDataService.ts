import { Lead } from '../types';
import { ApiGatewayService } from './apiGatewayService';
import { IntelligentCacheService } from './intelligentCacheService';

interface EnhancedData {
  financials?: {
    revenue?: string;
    employees?: number;
    growth_rate?: number;
    funding?: string;
  };
  technology?: {
    website_tech?: string[];
    social_media?: {
      instagram?: SocialMediaProfile;
      facebook?: SocialMediaProfile;
      linkedin?: SocialMediaProfile;
      twitter?: SocialMediaProfile;
    };
    ads_active?: boolean;
    ecommerce_platform?: string;
  };
  market?: {
    competitors?: string[];
    market_position?: string;
    industry_trends?: string[];
  };
  contacts?: {
    decision_makers?: Contact[];
    emails?: EmailContact[];
    phones?: PhoneContact[];
  };
}

interface SocialMediaProfile {
  url: string;
  followers?: number;
  verified?: boolean;
  last_post?: string;
  engagement_rate?: number;
}

interface Contact {
  name: string;
  role: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  confidence: number;
}

interface EmailContact {
  email: string;
  position: string;
  confidence: number;
  source: string;
}

interface PhoneContact {
  phone: string;
  type: 'whatsapp' | 'mobile' | 'landline';
  confidence: number;
  source: string;
}

export class EnhancedDataService {
  /**
   * Enriquecimento completo com múltiplas fontes de dados avançadas
   */
  static async comprehensiveEnrichment(lead: Lead, apiKeys?: any): Promise<EnhancedData> {
    console.log(`[Enhanced Data] Enriquecimento completo para: ${lead.name}`);

    // Verificar cache
    const cacheKey = `enhanced:${lead.id}:${lead.name}:${lead.location}`;
    const cached = await IntelligentCacheService.get<EnhancedData>(cacheKey);
    if (cached) {
      console.log(`[Enhanced Data] Cache HIT para ${lead.name}`);
      return cached;
    }

    const enhancedData: EnhancedData = {};

    try {
      // 1. Análise financeira
      enhancedData.financials = await this.analyzeFinancials(lead);

      // 2. Análise tecnológica
      enhancedData.technology = await this.analyzeTechnology(lead, apiKeys);

      // 3. Análise de mercado
      enhancedData.market = await this.analyzeMarket(lead, apiKeys);

      // 4. Contatos avançados
      enhancedData.contacts = await this.findAdvancedContacts(lead, apiKeys);

      // Armazenar no cache
      await IntelligentCacheService.set(cacheKey, enhancedData, 'enhanced', 0.85);

      return enhancedData;

    } catch (error) {
      console.error('[Enhanced Data] Erro no enriquecimento:', error);
      return enhancedData;
    }
  }

  /**
   * Análise financeira usando múltiplas fontes
   */
  private static async analyzeFinancials(lead: Lead): Promise<EnhancedData['financials']> {
    const financials: EnhancedData['financials'] = {};

    try {
      // Se tiver CNPJ, buscar dados financeiros
      if (lead.socialLinks?.cnpj && lead.socialLinks.cnpj !== 'VERIFICAR') {
        const cnpjData = await this.fetchCNPJFinancials(lead.socialLinks.cnpj);
        if (cnpjData) {
          financials.revenue = cnpjData.revenue;
          financials.employees = cnpjData.employees;
        }
      }

      // Estimar com base no tamanho e setor
      if (!financials.revenue && lead.details?.size) {
        financials.revenue = this.estimateRevenue(lead.details.size, lead.industry);
      }

      if (!financials.employees && lead.details?.employee_count) {
        const employeeStr = lead.details.employee_count;
        financials.employees = this.parseEmployeeCount(employeeStr);
      }

      // Taxa de crescimento baseada em maturidade digital
      if (lead.details?.digital_maturity) {
        financials.growth_rate = this.estimateGrowthRate(lead.details.digital_maturity);
      }

    } catch (error) {
      console.warn('[Enhanced Data] Erro na análise financeira:', error);
    }

    return financials;
  }

  /**
   * Análise tecnológica avançada
   */
  private static async analyzeTechnology(lead: Lead, apiKeys?: any): Promise<EnhancedData['technology']> {
    const technology: EnhancedData['technology'] = {};

    try {
      // Análise do website
      if (lead.website) {
        technology.website_tech = await this.analyzeWebsiteTech(lead.website);
        technology.ecommerce_platform = await this.detectEcommercePlatform(lead.website);
      }

      // Análise de redes sociais
      technology.social_media = await this.analyzeSocialMedia(lead, apiKeys);

      // Verificar anúncios ativos
      technology.ads_active = await this.checkActiveAds(lead.name, lead.location);

    } catch (error) {
      console.warn('[Enhanced Data] Erro na análise tecnológica:', error);
    }

    return technology;
  }

  /**
   * Análise de mercado e concorrência
   */
  private static async analyzeMarket(lead: Lead, apiKeys?: any): Promise<EnhancedData['market']> {
    const market: EnhancedData['market'] = {};

    try {
      // Identificar concorrentes
      market.competitors = await this.identifyCompetitors(lead.name, lead.location, apiKeys);

      // Posição no mercado
      market.market_position = await this.assessMarketPosition(lead, market.competitors);

      // Tendências do setor
      market.industry_trends = await this.getIndustryTrends(lead.industry, apiKeys);

    } catch (error) {
      console.warn('[Enhanced Data] Erro na análise de mercado:', error);
    }

    return market;
  }

  /**
   * Busca avançada de contatos
   */
  private static async findAdvancedContacts(lead: Lead, apiKeys?: any): Promise<EnhancedData['contacts']> {
    const contacts: EnhancedData['contacts'] = {};

    try {
      // Decision makers
      contacts.decision_makers = await this.findDecisionMakers(lead, apiKeys);

      // Emails avançados
      contacts.emails = await this.findEmails(lead, apiKeys);

      // Telefones avançados
      contacts.phones = await this.findPhones(lead, apiKeys);

    } catch (error) {
      console.warn('[Enhanced Data] Erro na busca de contatos:', error);
    }

    return contacts;
  }

  /**
   * Busca dados financeiros do CNPJ
   */
  private static async fetchCNPJFinancials(cnpj: string): Promise<any> {
    try {
      // Usar APIs que fornecem dados financeiros
      const endpoints = [
        `https://api.cnpja.com.br/companies/${cnpj}`,
        `https://minhareceita.org/${cnpj}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            const data = await response.json();
            
            return {
              revenue: data.faturamento || data.revenue || data.annual_revenue,
              employees: data.funcionarios || data.employees || data.employee_count
            };
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.warn('[Enhanced Data] Erro ao buscar dados financeiros:', error);
    }

    return null;
  }

  /**
   * Estima receita baseada no porte e setor
   */
  private static estimateRevenue(size: string, industry: string): string {
    const revenueRanges = {
      'Micro Empresa': 'Até R$ 360K/ano',
      'Pequeno Porte': 'R$ 360K - R$ 4.8M/ano',
      'Médio Porte': 'R$ 4.8M - R$ 300M/ano',
      'Grande Porte': 'Acima de R$ 300M/ano'
    };

    return revenueRanges[size] || 'Não estimado';
  }

  /**
   * Converte string de número de funcionários para número
   */
  private static parseEmployeeCount(employeeStr: string): number {
    const numbers = employeeStr.match(/\d+/);
    if (numbers) {
      const num = parseInt(numbers[0]);
      
      if (employeeStr.includes('mil')) {
        return num * 1000;
      }
      
      return num;
    }

    return 0;
  }

  /**
   * Estima taxa de crescimento baseada na maturidade digital
   */
  private static estimateGrowthRate(digitalMaturity: string): number {
    const rates = {
      'baixa': 0.05,    // 5%
      'média': 0.15,    // 15%
      'alta': 0.25      // 25%
    };

    return rates[digitalMaturity] || 0.1;
  }

  /**
   * Analisa tecnologias do website
   */
  private static async analyzeWebsiteTech(url: string): Promise<string[]> {
    const technologies: string[] = [];

    try {
      // Análise básica baseada em URL
      if (url.includes('.shopify.com')) {
        technologies.push('Shopify');
      }
      if (url.includes('.wordpress.com') || url.includes('wp-content')) {
        technologies.push('WordPress');
      }
      if (url.includes('.wix.com')) {
        technologies.push('Wix');
      }
      if (url.includes('hotmart')) {
        technologies.push('Hotmart');
      }
      if (url.includes('eduzz')) {
        technologies.push('Eduzz');
      }

      // Tentar detectar tecnologias via análise HTTP
      try {
        const response = await fetch(url, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000) 
        });
        
        const server = response.headers.get('server');
        const poweredBy = response.headers.get('x-powered-by');
        
        if (server) technologies.push(`Server: ${server}`);
        if (poweredBy) technologies.push(poweredBy);
        
      } catch (e) {
        // Website não acessível
      }

    } catch (error) {
      console.warn('[Enhanced Data] Erro na análise de tecnologias:', error);
    }

    return technologies;
  }

  /**
   * Detecta plataforma de e-commerce
   */
  private static async detectEcommercePlatform(url: string): Promise<string> {
    const platforms = {
      'shopify': 'Shopify',
      'woocommerce': 'WooCommerce',
      'magento': 'Magento',
      'nuvemshop': 'Nuvemshop',
      'tray': 'Tray',
      'xtech': 'Xtech'
    };

    for (const [indicator, platform] of Object.entries(platforms)) {
      if (url.includes(indicator)) {
        return platform;
      }
    }

    // Tentar detecção via análise do conteúdo
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const html = await response.text();
      
      for (const [indicator, platform] of Object.entries(platforms)) {
        if (html.toLowerCase().includes(indicator)) {
          return platform;
        }
      }
    } catch (e) {
      // Não foi possível analisar o conteúdo
    }

    return 'Não detectada';
  }

  /**
   * Analisa redes sociais
   */
  private static async analyzeSocialMedia(lead: Lead, apiKeys?: any): Promise<EnhancedData['technology']['social_media']> {
    const socialMedia: EnhancedData['technology']['social_media'] = {};

    // Instagram
    if (lead.socialLinks?.instagram) {
      socialMedia.instagram = await this.analyzeInstagramProfile(lead.socialLinks.instagram);
    }

    // Facebook
    if (lead.socialLinks?.facebook) {
      socialMedia.facebook = await this.analyzeFacebookProfile(lead.socialLinks.facebook);
    }

    // LinkedIn
    if (lead.socialLinks?.linkedin) {
      socialMedia.linkedin = await this.analyzeLinkedInProfile(lead.socialLinks.linkedin);
    }

    return socialMedia;
  }

  /**
   * Analisa perfil do Instagram
   */
  private static async analyzeInstagramProfile(url: string): Promise<SocialMediaProfile> {
    const profile: SocialMediaProfile = { url };

    try {
      // Por ora, retorna dados básicos
      // Implementação futura poderia usar APIs do Instagram ou web scraping
      profile.verified = false;
      profile.last_post = 'Não disponível';
    } catch (error) {
      console.warn('[Enhanced Data] Erro ao analisar Instagram:', error);
    }

    return profile;
  }

  /**
   * Analisa perfil do Facebook
   */
  private static async analyzeFacebookProfile(url: string): Promise<SocialMediaProfile> {
    const profile: SocialMediaProfile = { url };

    try {
      // Implementação básica
      profile.verified = false;
      profile.last_post = 'Não disponível';
    } catch (error) {
      console.warn('[Enhanced Data] Erro ao analisar Facebook:', error);
    }

    return profile;
  }

  /**
   * Analisa perfil do LinkedIn
   */
  private static async analyzeLinkedInProfile(url: string): Promise<SocialMediaProfile> {
    const profile: SocialMediaProfile = { url };

    try {
      // Implementação básica
      profile.verified = false;
      profile.last_post = 'Não disponível';
    } catch (error) {
      console.warn('[Enhanced Data] Erro ao analisar LinkedIn:', error);
    }

    return profile;
  }

  /**
   * Verifica anúncios ativos
   */
  private static async checkActiveAds(companyName: string, location: string): Promise<boolean> {
    try {
      const query = `${companyName} ${location} anúncio OR propaganda OR ads`;
      
      const response = await ApiGatewayService.callApi(
        'google-search',
        'search',
        { q: query, num: 10 },
        { ttl: 3600 }
      );

      // Verificar se há resultados de anúncios
      const searchResults = response as any;
      return searchResults?.ads?.length > 0;

    } catch (error) {
      console.warn('[Enhanced Data] Erro ao verificar anúncios:', error);
      return false;
    }
  }

  /**
   * Identifica concorrentes
   */
  private static async identifyCompetitors(companyName: string, location: string, apiKeys?: any): Promise<string[]> {
    try {
      const query = `${companyName} ${location} concorrentes OR competidores OR alternativas`;
      
      const response = await ApiGatewayService.callApi(
        'google-search',
        'search',
        { q: query, num: 20 },
        { ttl: 7200 }
      );

      const searchResults = response as any;
      const competitors: string[] = [];

      if (searchResults?.organic) {
        searchResults.organic.forEach((result: any) => {
          // Extrair nomes de empresas dos resultados
          const title = result.title;
          const snippet = result.snippet;
          
          // Lógica simples para extrair nomes de concorrentes
          const competitorNames = this.extractCompetitorNames(title + ' ' + snippet);
          competitors.push(...competitorNames);
        });
      }

      // Remover duplicatas e o próprio nome da empresa
      return [...new Set(competitors)]
        .filter(name => 
          name.toLowerCase() !== companyName.toLowerCase() && 
          name.length > 2
        )
        .slice(0, 5);

    } catch (error) {
      console.warn('[Enhanced Data] Erro ao identificar concorrentes:', error);
      return [];
    }
  }

  /**
   * Extrai nomes de concorrentes do texto
   */
  private static extractCompetitorNames(text: string): string[] {
    const names: string[] = [];
    
    // Padrões simples para identificar nomes de empresas
    const patterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:vs|versus|contra|alternativa a)/gi,
      /alternativa\s+a\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /concorrente\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const name = match.replace(/(vs|versus|contra|alternativa a|concorrente\s+)/gi, '').trim();
          if (name.length > 2) {
            names.push(name);
          }
        });
      }
    });

    return names;
  }

  /**
   * Avalia posição no mercado
   */
  private static async assessMarketPosition(lead: Lead, competitors: string[]): Promise<string> {
    if (competitors.length === 0) {
      return 'Líder de mercado aparente';
    }

    if (competitors.length <= 2) {
      return 'Mercado com pouca concorrência';
    }

    if (competitors.length <= 5) {
      return 'Mercado competitivo';
    }

    return 'Mercado saturado';
  }

  /**
   * Obtém tendências do setor
   */
  private static async getIndustryTrends(industry: string, apiKeys?: any): Promise<string[]> {
    try {
      const query = `tendências ${industry} 2024 2025 mercado brasil`;
      
      const response = await ApiGatewayService.callApi(
        'google-search',
        'search',
        { q: query, num: 10 },
        { ttl: 86400 }
      );

      const searchResults = response as any;
      const trends: string[] = [];

      if (searchResults?.organic) {
        searchResults.organic.forEach((result: any) => {
          // Extrair tendências dos títulos e snippets
          const text = result.title + ' ' + result.snippet;
          const trendKeywords = this.extractTrendKeywords(text);
          trends.push(...trendKeywords);
        });
      }

      return [...new Set(trends)].slice(0, 5);

    } catch (error) {
      console.warn('[Enhanced Data] Erro ao obter tendências:', error);
      return [];
    }
  }

  /**
   * Extrai palavras-chave de tendências
   */
  private static extractTrendKeywords(text: string): string[] {
    const trends: string[] = [];
    
    const trendKeywords = [
      'digitalização', 'automatização', 'sustentabilidade', 'ia', 'inteligência artificial',
      'e-commerce', 'marketplace', 'assinatura', 'saas', 'nuvem', 'mobile',
      'experiência do cliente', 'personalização', 'omnichannel', 'data driven'
    ];

    trendKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        trends.push(keyword);
      }
    });

    return trends;
  }

  /**
   * Encontra decision makers avançados
   */
  private static async findDecisionMakers(lead: Lead, apiKeys?: any): Promise<Contact[]> {
    const contacts: Contact[] = [];

    // Usar dados do QSA se disponível
    if (lead.details?.qsa) {
      lead.details.qsa.forEach((qsa: any) => {
        contacts.push({
          name: qsa.nome,
          role: qsa.cargo || 'Sócio',
          confidence: 0.9
        });
      });
    }

    // Buscar em redes sociais
    const socialContacts = await this.findContactsOnSocial(lead.name, lead.location);
    contacts.push(...socialContacts);

    return contacts.slice(0, 5); // Limitar a 5 contatos
  }

  /**
   * Encontre contatos em redes sociais
   */
  private static async findContactsOnSocial(companyName: string, location: string): Promise<Contact[]> {
    // Implementação futura
    return [];
  }

  /**
   * Encontra emails avançados
   */
  private static async findEmails(lead: Lead, apiKeys?: any): Promise<EmailContact[]> {
    const emails: EmailContact[] = [];

    // Usar Hunter.io se disponível
    if (lead.website && apiKeys?.hunter) {
      try {
        const domain = new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`).hostname;
        const hunterData = await ApiGatewayService.callApi('hunter', 'domain-search', { domain });
        
        const data = hunterData as any;
        if (data?.data?.emails) {
          data.data.emails.forEach((email: any) => {
            emails.push({
              email: email.value,
              position: email.position || 'Contato',
              confidence: email.confidence || 0.5,
              source: 'Hunter.io'
            });
          });
        }
      } catch (error) {
        console.warn('[Enhanced Data] Erro ao buscar emails Hunter.io:', error);
      }
    }

    return emails;
  }

  /**
   * Encontra telefones avançados
   */
  private static async findPhones(lead: Lead, apiKeys?: any): Promise<PhoneContact[]> {
    const phones: PhoneContact[] = [];

    // Adicionar telefone principal se existir
    if (lead.phone) {
      phones.push({
        phone: lead.phone,
        type: lead.phone.includes('9') ? 'mobile' : 'landline',
        confidence: 0.8,
        source: 'Dados principais'
      });
    }

    // Buscar telefones alternativos
    if (lead.details?.alternative_phones) {
      lead.details.alternative_phones.forEach(phone => {
        phones.push({
          phone,
          type: phone.includes('9') ? 'mobile' : 'landline',
          confidence: 0.6,
          source: 'Busca avançada'
        });
      });
    }

    return phones;
  }
}
