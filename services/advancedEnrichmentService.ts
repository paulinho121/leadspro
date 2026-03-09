import { Lead } from '../types';
import { ApiGatewayService } from './apiGatewayService';
import { DataValidationService } from './dataValidationService';
import { IntelligentCacheService } from './intelligentCacheService';

interface MLInsight {
  category: 'market_position' | 'growth_potential' | 'decision_maker' | 'approach_strategy';
  confidence: number;
  insight: string;
  action_items: string[];
}

interface EnrichmentResult {
  lead: Lead;
  mlInsights: MLInsight[];
  qualityScore: number;
  duplicateRisk: number;
  recommendations: string[];
}

export class AdvancedEnrichmentService {
  /**
   * Enriquecimento avançado usando Machine Learning e múltiplas fontes
   */
  static async advancedEnrichLead(lead: Lead, apiKeys?: any, tenantId?: string): Promise<EnrichmentResult> {
    console.log(`[Advanced ML] Processing: ${lead.name}`);

    // Verificar cache primeiro
    const cacheKey = `advanced:${lead.id}:${lead.name}:${lead.location}`;
    const cached = await IntelligentCacheService.get<EnrichmentResult>(cacheKey);
    if (cached) {
      console.log(`[Advanced ML] Cache HIT para ${lead.name}`);
      return cached;
    }

    try {
      // 1. Validação avançada de dados
      const validations = await Promise.all([
        this.validateAndEnrichPhone(lead),
        this.validateAndEnrichEmail(lead),
        this.analyzeDigitalPresence(lead),
        this.extractDecisionMakers(lead)
      ]);

      // 2. Análise de Machine Learning
      const mlInsights = await this.generateMLInsights(lead, validations);
      
      // 3. Cálculo de score de qualidade
      const qualityScore = DataValidationService.calculateQualityScore(lead);
      
      // 4. Análise de risco de duplicatas
      const duplicateRisk = await this.assessDuplicateRisk(lead);
      
      // 5. Geração de recomendações
      const recommendations = this.generateRecommendations(lead, mlInsights, qualityScore);

      // 6. Enriquecer o lead com todos os dados
      const enrichedLead = this.enrichLeadWithData(lead, validations, mlInsights);

      const result: EnrichmentResult = {
        lead: enrichedLead,
        mlInsights,
        qualityScore,
        duplicateRisk,
        recommendations
      };

      // Armazenar no cache
      await IntelligentCacheService.set(cacheKey, result, 'gemini', 0.8);

      return result;

    } catch (error) {
      console.error('[Advanced ML] Erro no enriquecimento avançado:', error);
      throw error;
    }
  }

  /**
   * Enriquecimento em lote com otimização de performance
   */
  static async batchEnrichLeads(leads: Lead[], apiKeys?: any, tenantId?: string): Promise<EnrichmentResult[]> {
    console.log(`[Advanced ML] Batch processing ${leads.length} leads`);

    // Processar em paralelo com limite de concorrência
    const batchSize = 5;
    const results: EnrichmentResult[] = [];

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchPromises = batch.map(lead => 
        this.advancedEnrichLead(lead, apiKeys, tenantId).catch(error => {
          console.error(`[Advanced ML] Erro no lead ${lead.name}:`, error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as EnrichmentResult[]);

      // Pequeno delay entre batches para não sobrecarregar APIs
      if (i + batchSize < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Advanced ML] Batch completed: ${results.length}/${leads.length} leads processados`);
    return results;
  }

  /**
   * Detecção avançada de duplicatas usando múltiplos algoritmos
   */
  static async detectAdvancedDuplicates(
    lead: Lead, 
    existingLeads: Lead[], 
    threshold: number = 0.85
  ): Promise<Lead[]> {
    const duplicates: Lead[] = [];
    
    for (const existing of existingLeads) {
      const similarity = await this.calculateAdvancedSimilarity(lead, existing);
      
      if (similarity >= threshold) {
        duplicates.push(existing);
      }
    }
    
    return duplicates;
  }

  /**
   * Validação e enriquecimento de telefone com técnicas avançadas
   */
  private static async validateAndEnrichPhone(lead: Lead): Promise<any> {
    if (!lead.phone) return null;

    const validation = await DataValidationService.validatePhone(lead.phone, lead.name, lead.location);
    
    // Buscar telefones alternativos usando OSINT avançada
    const alternativePhones = await this.findAlternativePhones(lead.name, lead.location);
    
    return {
      ...validation,
      alternative_phones: alternativePhones,
      phone_confidence: validation.confidence
    };
  }

  /**
   * Validação e enriquecimento de email com verificação avançada
   */
  private static async validateAndEnrichEmail(lead: Lead): Promise<any> {
    if (!lead.email) return null;

    const domain = lead.email.split('@')[1];
    const validation = await DataValidationService.validateEmail(lead.email, domain);
    
    // Buscar emails alternativos usando Hunter.io e outras fontes
    const alternativeEmails = await this.findAlternativeEmails(lead.name, domain);
    
    return {
      ...validation,
      alternative_emails: alternativeEmails,
      email_confidence: validation.confidence
    };
  }

  /**
   * Análise de presença digital usando múltiplas fontes
   */
  private static async analyzeDigitalPresence(lead: Lead): Promise<any> {
    const presence = {
      has_website: !!lead.website,
      website_quality: 0,
      social_media_count: 0,
      digital_maturity: 'baixa',
      last_activity: null
    };

    if (lead.website) {
      // Análise do website
      presence.website_quality = await this.analyzeWebsiteQuality(lead.website);
    }

    // Contar redes sociais
    if (lead.socialLinks) {
      presence.social_media_count = Object.values(lead.socialLinks).filter(link => 
        link && link !== 'VERIFICAR' && !link.includes('google.com/maps')
      ).length;
    }

    // Calcular maturidade digital
    if (presence.website_quality > 0.7 && presence.social_media_count >= 2) {
      presence.digital_maturity = 'alta';
    } else if (presence.website_quality > 0.4 || presence.social_media_count >= 1) {
      presence.digital_maturity = 'média';
    }

    return presence;
  }

  /**
   * Extração de decisores usando IA e dados públicos
   */
  private static async extractDecisionMakers(lead: Lead): Promise<any> {
    const decisionMakers = {
      identified: [],
      confidence: 0,
      sources: []
    };

    // Usar dados do QSA se disponível
    if (lead.details?.qsa) {
      decisionMakers.identified.push(...lead.details.qsa.map((qsa: any) => ({
        name: qsa.nome,
        role: qsa.cargo,
        source: 'QSA',
        confidence: 0.9
      })));
      decisionMakers.sources.push('QSA');
    }

    // Buscar em redes sociais
    const socialDecisionMakers = await this.findDecisionMakersOnSocial(lead.name, lead.location);
    if (socialDecisionMakers.length > 0) {
      decisionMakers.identified.push(...socialDecisionMakers);
      decisionMakers.sources.push('Social Media');
    }

    // Calcular confiança geral
    decisionMakers.confidence = decisionMakers.identified.length > 0 ? 0.8 : 0.2;

    return decisionMakers;
  }

  /**
   * Geração de insights usando Machine Learning
   */
  private static async generateMLInsights(lead: Lead, validations: any[]): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];

    try {
      // Análise via Gemini
      const prompt = `Analise a empresa ${lead.name} e gere insights estratégicos:
      
      DADOS:
      - Nome: ${lead.name}
      - Indústria: ${lead.industry}
      - Localização: ${lead.location}
      - Website: ${lead.website}
      - Telefone: ${lead.phone}
      - CNPJ: ${lead.socialLinks?.cnpj || 'Não informado'}
      - Avaliação: ${lead.details?.rating || 'N/A'}
      - Tamanho: ${lead.details?.size || 'N/A'}
      
      Validações: ${JSON.stringify(validations)}
      
      Gere 4 insights nas categorias:
      1. market_position (posição no mercado)
      2. growth_potential (potencial de crescimento)
      3. decision_maker (perfil do decisor)
      4. approach_strategy (melhor estratégia de abordagem)
      
      Retorne em formato JSON array.`;

      const mlResponse = await ApiGatewayService.callApi(
        'gemini-1.5-flash',
        'custom-prompt',
        { prompt },
        { apiKeys: {}, ttl: 86400 }
      );

      if (typeof mlResponse === 'string') {
        try {
          const parsedInsights = JSON.parse(mlResponse.replace(/```json|```/g, '').trim());
          if (Array.isArray(parsedInsights)) {
            insights.push(...parsedInsights.map((insight, index) => ({
              category: insight.category || 'general',
              confidence: insight.confidence || 0.7,
              insight: insight.insight || `Insight ${index + 1}`,
              action_items: Array.isArray(insight.action_items) ? insight.action_items : []
            })));
          }
        } catch (e) {
          console.warn('[Advanced ML] Erro ao parsear insights da IA:', e);
        }
      }
    } catch (error) {
      console.warn('[Advanced ML] Erro na geração de insights:', error);
    }

    // Insights fallback baseados em regras
    if (insights.length === 0) {
      insights.push(...this.generateRuleBasedInsights(lead, validations));
    }

    return insights;
  }

  /**
   * Cálculo avançado de similaridade entre leads
   */
  private static async calculateAdvancedSimilarity(lead1: Lead, lead2: Lead): Promise<number> {
    let similarity = 0;
    let factors = 0;

    // Similaridade de nome (peso 40%)
    const nameSimilarity = this.calculateNameSimilarity(lead1.name, lead2.name);
    similarity += nameSimilarity * 0.4;
    factors += 0.4;

    // Similaridade de localização (peso 25%)
    if (lead1.location && lead2.location) {
      const locationSimilarity = lead1.location.toLowerCase() === lead2.location.toLowerCase() ? 1 : 0;
      similarity += locationSimilarity * 0.25;
      factors += 0.25;
    }

    // Similaridade de telefone (peso 20%)
    if (lead1.phone && lead2.phone) {
      const phoneSimilarity = this.calculatePhoneSimilarity(lead1.phone, lead2.phone);
      similarity += phoneSimilarity * 0.2;
      factors += 0.2;
    }

    // Similaridade de CNPJ (peso 15%)
    if (lead1.socialLinks?.cnpj && lead2.socialLinks?.cnpj && 
        lead1.socialLinks.cnpj !== 'VERIFICAR' && lead2.socialLinks.cnpj !== 'VERIFICAR') {
      const cnpjSimilarity = lead1.socialLinks.cnpj === lead2.socialLinks.cnpj ? 1 : 0;
      similarity += cnpjSimilarity * 0.15;
      factors += 0.15;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Análise de qualidade de website
   */
  private static async analyzeWebsiteQuality(url: string): Promise<number> {
    try {
      // Implementar análise básica de website
      // Por ora, retorna valor baseado em indicadores simples
      const hasHttps = url.startsWith('https');
      const hasCustomDomain = !url.includes('.wix.com') && !url.includes('.wordpress.com');
      
      let score = 0;
      if (hasHttps) score += 0.3;
      if (hasCustomDomain) score += 0.4;
      
      // Verificar se o site está online
      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (response.ok) score += 0.3;
      } catch (e) {
        score -= 0.2;
      }
      
      return Math.max(0, Math.min(1, score));
    } catch (error) {
      return 0.3; // Valor padrão baixo
    }
  }

  /**
   * Busca de telefones alternativos
   */
  private static async findAlternativePhones(companyName: string, location: string): Promise<string[]> {
    // Implementar busca avançada de telefones
    // Por ora, retorna array vazio
    return [];
  }

  /**
   * Busca de emails alternativos
   */
  private static async findAlternativeEmails(companyName: string, domain: string): Promise<string[]> {
    try {
      const hunterData = await ApiGatewayService.callApi('hunter', 'domain-search', { domain });
      const data = hunterData as any;
      return data?.data?.emails?.map((e: any) => e.value) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Busca de decisores em redes sociais
   */
  private static async findDecisionMakersOnSocial(companyName: string, location: string): Promise<any[]> {
    // Implementar busca em redes sociais
    // Por ora, retorna array vazio
    return [];
  }

  /**
   * Geração de insights baseados em regras (fallback)
   */
  private static generateRuleBasedInsights(lead: Lead, validations: any[]): MLInsight[] {
    const insights: MLInsight[] = [];

    // Insight sobre posição no mercado
    if (lead.details?.rating && lead.details.rating > 4.5) {
      insights.push({
        category: 'market_position',
        confidence: 0.8,
        insight: 'Empresa bem avaliada, provavelmente líder de mercado local',
        action_items: ['Destacar qualidade em abordagem', 'Usar como case de sucesso']
      });
    }

    // Insight sobre potencial de crescimento
    if (lead.details?.foundedDate && new Date(lead.details.foundedDate).getFullYear() > 2020) {
      insights.push({
        category: 'growth_potential',
        confidence: 0.7,
        insight: 'Empresa jovem com alto potencial de crescimento',
        action_items: ['Oferecer soluções escaláveis', 'Propor parceria de longo prazo']
      });
    }

    return insights;
  }

  /**
   * Avaliação de risco de duplicatas
   */
  private static async assessDuplicateRisk(lead: Lead): Promise<number> {
    // Implementar avaliação de risco
    // Por ora, retorna valor baseado em indicadores simples
    let risk = 0.1; // Risco base

    if (!lead.socialLinks?.cnpj || lead.socialLinks.cnpj === 'VERIFICAR') {
      risk += 0.3; // Sem CNPJ aumenta risco
    }

    if (lead.name.length < 5) {
      risk += 0.2; // Nome muito curto aumenta risco
    }

    return Math.min(1, risk);
  }

  /**
   * Geração de recomendações
   */
  private static generateRecommendations(lead: Lead, insights: MLInsight[], qualityScore: number): string[] {
    const recommendations: string[] = [];

    if (qualityScore < 50) {
      recommendations.push('Lead com baixa qualidade - considerar validação adicional');
    }

    if (qualityScore > 80) {
      recommendations.push('Lead de alta qualidade - priorizar abordagem');
    }

    // Adicionar recomendações dos insights
    insights.forEach(insight => {
      recommendations.push(...insight.action_items);
    });

    return recommendations;
  }

  /**
   * Enriquecer lead com dados validados
   */
  private static enrichLeadWithData(lead: Lead, validations: any[], insights: MLInsight[]): Lead {
    const enrichedLead = { ...lead };

    // Adicionar dados das validações
    validations.forEach(validation => {
      if (validation) {
        enrichedLead.details = { ...enrichedLead.details, ...validation };
      }
    });

    // Adicionar insights
    enrichedLead.details = {
      ...enrichedLead.details,
      ml_insights: insights,
      enrichment_timestamp: new Date().toISOString()
    };

    return enrichedLead;
  }

  /**
   * Cálculo de similaridade de nomes
   */
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    if (n1 === n2) return 1;
    
    // Similaridade de Levenshtein
    const distance = this.levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  /**
   * Cálculo de similaridade de telefones
   */
  private static calculatePhoneSimilarity(phone1: string, phone2: string): number {
    const clean1 = phone1.replace(/\D/g, '');
    const clean2 = phone2.replace(/\D/g, '');
    
    if (clean1 === clean2) return 1;
    
    // Verificar se são o mesmo número com diferentes formatos
    if (clean1.length >= 10 && clean2.length >= 10) {
      const suffix1 = clean1.slice(-8);
      const suffix2 = clean2.slice(-8);
      
      if (suffix1 === suffix2) return 0.9;
    }
    
    return 0;
  }

  /**
   * Distância de Levenshtein
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
