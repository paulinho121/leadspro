import { Lead } from '../types';
import { DataValidationService } from './dataValidationService';
import { AdvancedEnrichmentService } from './advancedEnrichmentService';
import { supabase } from '../lib/supabase';

interface DuplicateMatch {
  duplicateLead: Lead;
  similarity: number;
  matchReasons: string[];
  confidence: number;
}

interface DuplicateReport {
  totalLeads: number;
  duplicatesFound: number;
  duplicateGroups: DuplicateMatch[][];
  recommendations: string[];
}

export class DuplicateDetectionService {
  /**
   * Detecta duplicatas em tempo real para um novo lead
   */
  static async detectDuplicatesForNewLead(
    newLead: Lead, 
    tenantId: string,
    threshold: number = 0.85
  ): Promise<DuplicateMatch[]> {
    console.log(`[Duplicate Detection] Analisando lead: ${newLead.name}`);

    try {
      // Buscar leads existentes no mesmo tenant
      const { data: existingLeads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('id', newLead.id);

      if (error) {
        console.error('[Duplicate Detection] Erro ao buscar leads existentes:', error);
        return [];
      }

      if (!existingLeads || existingLeads.length === 0) {
        console.log('[Duplicate Detection] Nenhum lead existente para comparar');
        return [];
      }

      // Detectar duplicatas usando algoritmo avançado
      const duplicates = await AdvancedEnrichmentService.detectAdvancedDuplicates(
        newLead, 
        existingLeads, 
        threshold
      );

      // Converter para formato DuplicateMatch
      const duplicateMatches: DuplicateMatch[] = [];
      
      for (const duplicate of duplicates) {
        const similarity = await AdvancedEnrichmentService['calculateAdvancedSimilarity'](newLead, duplicate);
        const matchReasons = this.getMatchReasons(newLead, duplicate);
        
        duplicateMatches.push({
          duplicateLead: duplicate,
          similarity,
          matchReasons,
          confidence: similarity
        });
      }

      // Ordenar por similaridade (maior primeiro)
      duplicateMatches.sort((a, b) => b.similarity - a.similarity);

      console.log(`[Duplicate Detection] Encontradas ${duplicateMatches.length} duplicatas para ${newLead.name}`);
      return duplicateMatches;

    } catch (error) {
      console.error('[Duplicate Detection] Erro na detecção de duplicatas:', error);
      return [];
    }
  }

  /**
   * Análise completa de duplicatas em lote
   */
  static async analyzeAllDuplicates(tenantId: string): Promise<DuplicateReport> {
    console.log(`[Duplicate Detection] Iniciando análise completa para tenant: ${tenantId}`);

    try {
      // Buscar todos os leads do tenant
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Duplicate Detection] Erro ao buscar todos os leads:', error);
        return {
          totalLeads: 0,
          duplicatesFound: 0,
          duplicateGroups: [],
          recommendations: []
        };
      }

      if (!allLeads || allLeads.length === 0) {
        return {
          totalLeads: 0,
          duplicatesFound: 0,
          duplicateGroups: [],
          recommendations: ['Nenhum lead encontrado para análise']
        };
      }

      const duplicateGroups: DuplicateMatch[][] = [];
      const processedLeads = new Set<string>();
      let totalDuplicates = 0;

      // Comparar cada lead com os demais
      for (let i = 0; i < allLeads.length; i++) {
        const lead1 = allLeads[i];
        
        if (processedLeads.has(lead1.id)) continue;

        const duplicatesForLead: DuplicateMatch[] = [];

        // Comparar com leads seguintes
        for (let j = i + 1; j < allLeads.length; j++) {
          const lead2 = allLeads[j];
          
          if (processedLeads.has(lead2.id)) continue;

          const similarity = await AdvancedEnrichmentService['calculateAdvancedSimilarity'](lead1, lead2);
          
          if (similarity >= 0.85) {
            const matchReasons = this.getMatchReasons(lead1, lead2);
            
            duplicatesForLead.push({
              duplicateLead: lead2,
              similarity,
              matchReasons,
              confidence: similarity
            });
            
            processedLeads.add(lead2.id);
            totalDuplicates++;
          }
        }

        if (duplicatesForLead.length > 0) {
          duplicateGroups.push(duplicatesForLead);
          processedLeads.add(lead1.id);
        }
      }

      const recommendations = this.generateRecommendations(allLeads.length, duplicateGroups);

      const report: DuplicateReport = {
        totalLeads: allLeads.length,
        duplicatesFound: totalDuplicates,
        duplicateGroups,
        recommendations
      };

      console.log(`[Duplicate Detection] Análise completa: ${totalDuplicates} duplicatas encontradas`);
      return report;

    } catch (error) {
      console.error('[Duplicate Detection] Erro na análise completa:', error);
      return {
        totalLeads: 0,
        duplicatesFound: 0,
        duplicateGroups: [],
        recommendations: ['Erro na análise de duplicatas']
      };
    }
  }

  /**
   * Merge inteligente de leads duplicados
   */
  static async mergeDuplicateLeads(
    primaryLeadId: string, 
    duplicateLeadIds: string[], 
    tenantId: string
  ): Promise<Lead | null> {
    console.log(`[Duplicate Detection] Merge: ${primaryLeadId} <- [${duplicateLeadIds.join(', ')}]`);

    try {
      // Buscar lead primário
      const { data: primaryLead, error: primaryError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', primaryLeadId)
        .eq('tenant_id', tenantId)
        .single();

      if (primaryError || !primaryLead) {
        console.error('[Duplicate Detection] Lead primário não encontrado:', primaryError);
        return null;
      }

      // Buscar leads duplicados
      const { data: duplicateLeads, error: duplicateError } = await supabase
        .from('leads')
        .select('*')
        .in('id', duplicateLeadIds)
        .eq('tenant_id', tenantId);

      if (duplicateError || !duplicateLeads) {
        console.error('[Duplicate Detection] Leads duplicados não encontrados:', duplicateError);
        return null;
      }

      // Merge inteligente de dados
      const mergedLead = this.intelligentMerge(primaryLead, duplicateLeads);

      // Atualizar lead primário com dados mergeados
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          ...mergedLead,
          lastUpdated: new Date().toISOString()
        })
        .eq('id', primaryLeadId)
        .select()
        .single();

      if (updateError || !updatedLead) {
        console.error('[Duplicate Detection] Erro ao atualizar lead primário:', updateError);
        return null;
      }

      // Mover leads duplicados para status DISCARDED
      await supabase
        .from('leads')
        .update({ 
          status: 'DISCARDED',
          lastUpdated: new Date().toISOString()
        })
        .in('id', duplicateLeadIds);

      console.log(`[Duplicate Detection] Merge concluído com sucesso`);
      return updatedLead;

    } catch (error) {
      console.error('[Duplicate Detection] Erro no merge de duplicatas:', error);
      return null;
    }
  }

  /**
   * Prevenção proativa de duplicatas antes da inserção
   */
  static async preventDuplicateInsertion(
    candidateLead: Lead, 
    tenantId: string
  ): Promise<{ canInsert: boolean; duplicates?: DuplicateMatch[] }> {
    console.log(`[Duplicate Prevention] Verificando: ${candidateLead.name}`);

    const duplicates = await this.detectDuplicatesForNewLead(candidateLead, tenantId, 0.9);

    if (duplicates.length > 0) {
      console.log(`[Duplicate Prevention] Bloqueada inserção - ${duplicates.length} duplicatas encontradas`);
      return { 
        canInsert: false, 
        duplicates 
      };
    }

    return { canInsert: true };
  }

  /**
   * Identifica razões de matching entre leads
   */
  private static getMatchReasons(lead1: Lead, lead2: Lead): string[] {
    const reasons: string[] = [];

    // Nome similar
    const nameSimilarity = DataValidationService['levenshteinSimilarity'](
      lead1.name.toLowerCase(), 
      lead2.name.toLowerCase()
    );
    if (nameSimilarity > 0.8) {
      reasons.push(`Nome similar (${Math.round(nameSimilarity * 100)}%)`);
    }

    // Mesmo local
    if (lead1.location.toLowerCase() === lead2.location.toLowerCase()) {
      reasons.push('Mesma localização');
    }

    // Telefone similar
    if (lead1.phone && lead2.phone) {
      const phone1 = lead1.phone.replace(/\D/g, '');
      const phone2 = lead2.phone.replace(/\D/g, '');
      
      if (phone1 === phone2) {
        reasons.push('Mesmo telefone');
      } else if (phone1.length >= 8 && phone2.length >= 8) {
        const suffix1 = phone1.slice(-8);
        const suffix2 = phone2.slice(-8);
        if (suffix1 === suffix2) {
          reasons.push('Telefone similar');
        }
      }
    }

    // Mesmo CNPJ
    if (lead1.socialLinks?.cnpj && lead2.socialLinks?.cnpj &&
        lead1.socialLinks.cnpj !== 'VERIFICAR' && lead2.socialLinks.cnpj !== 'VERIFICAR') {
      if (lead1.socialLinks.cnpj === lead2.socialLinks.cnpj) {
        reasons.push('Mesmo CNPJ');
      }
    }

    // Website similar
    if (lead1.website && lead2.website) {
      const domain1 = this.extractDomain(lead1.website);
      const domain2 = this.extractDomain(lead2.website);
      
      if (domain1 && domain2 && domain1 === domain2) {
        reasons.push('Mesmo website');
      }
    }

    return reasons;
  }

  /**
   * Merge inteligente de dados de múltiplos leads
   */
  private static intelligentMerge(primaryLead: Lead, duplicateLeads: Lead[]): Lead {
    const merged = { ...primaryLead };

    // Merge de campos básicos - sempre usar o mais completo
    for (const duplicate of duplicateLeads) {
      // Website (priorizar o que existir)
      if (!merged.website && duplicate.website) {
        merged.website = duplicate.website;
      }

      // Phone (priorizar o mais completo/validado)
      if (!merged.phone && duplicate.phone) {
        merged.phone = duplicate.phone;
      }

      // Email (priorizar o que existir)
      if (!merged.email && duplicate.email) {
        merged.email = duplicate.email;
      }

      // Social links (merge de todos os links)
      if (duplicate.socialLinks) {
        merged.socialLinks = {
          ...merged.socialLinks,
          ...duplicate.socialLinks
        };
      }

      // Details (merge profundo)
      if (duplicate.details) {
        merged.details = {
          ...merged.details,
          ...duplicate.details,
          // Arrays específicos - combinar sem duplicar
          qsa: this.mergeArrays(merged.details?.qsa, duplicate.details.qsa),
          partners: this.mergeArrays(merged.details?.partners, duplicate.details.partners),
          partners_contacts: this.mergeArrays(merged.details?.partners_contacts, duplicate.details.partners_contacts),
          realPhones: this.mergeArrays(merged.details?.realPhones, duplicate.details.realPhones),
          alternative_phones: this.mergeArrays(merged.details?.alternative_phones, duplicate.details.alternative_phones),
          alternative_emails: this.mergeArrays(merged.details?.alternative_emails, duplicate.details.alternative_emails)
        };
      }
    }

    // Atualizar timestamp
    merged.lastUpdated = new Date().toISOString();

    return merged;
  }

  /**
   * Extrai domínio de URL
   */
  private static extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      return null;
    }
  }

  /**
   * Merge de arrays sem duplicatas
   */
  private static mergeArrays<T>(array1?: T[], array2?: T[]): T[] {
    const merged = new Set<T>();
    
    if (array1) {
      array1.forEach(item => merged.add(item));
    }
    
    if (array2) {
      array2.forEach(item => merged.add(item));
    }
    
    return Array.from(merged);
  }

  /**
   * Gera recomendações baseadas na análise de duplicatas
   */
  private static generateRecommendations(totalLeads: number, duplicateGroups: DuplicateMatch[][]): string[] {
    const recommendations: string[] = [];

    if (duplicateGroups.length === 0) {
      recommendations.push('Nenhuma duplicata encontrada. Ótima qualidade de dados!');
      return recommendations;
    }

    const duplicatePercentage = (duplicateGroups.length / totalLeads) * 100;

    if (duplicatePercentage > 20) {
      recommendations.push('Alta taxa de duplicatas. Considerar limpeza completa da base.');
    } else if (duplicatePercentage > 10) {
      recommendations.push('Taxa moderada de duplicatas. Recomendada limpeza seletiva.');
    } else {
      recommendations.push('Baixa taxa de duplicatas. Manter monitoramento.');
    }

    if (duplicateGroups.length > 0) {
      recommendations.push(`${duplicateGroups.length} grupos de duplicatas encontrados para merge.`);
      recommendations.push('Priorizar merge de leads com maior similaridade.');
    }

    // Recomendações específicas baseadas nos padrões encontrados
    const commonReasons = this.analyzeCommonMatchReasons(duplicateGroups);
    if (commonReasons.includes('Nome similar')) {
      recommendations.push('Considerar normalização de nomes na entrada de dados.');
    }
    
    if (commonReasons.includes('Mesmo telefone')) {
      recommendations.push('Implementar validação de telefone na entrada de dados.');
    }

    return recommendations;
  }

  /**
   * Analisa razões mais comuns de matching
   */
  private static analyzeCommonMatchReasons(duplicateGroups: DuplicateMatch[][]): string[] {
    const reasonCounts = new Map<string, number>();

    duplicateGroups.forEach(group => {
      group.forEach(match => {
        match.matchReasons.forEach(reason => {
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });
      });
    });

    // Retornar razões ordenadas por frequência
    return Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason]) => reason);
  }
}
