import { Lead } from '../types';
import { ApiGatewayService } from './apiGatewayService';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  enrichedData?: any;
}

export class DataValidationService {
  /**
   * Validação completa de CNPJ com múltiplas fontes governamentais
   */
  static async validateCNPJ(cnpj: string): Promise<ValidationResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (cleanCnpj.length !== 14) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['CNPJ com formato inválido']
      };
    }

    // Verificar dígito verificador
    if (!this.isValidCNPJChecksum(cleanCnpj)) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['CNPJ com dígito verificador inválido']
      };
    }

    try {
      // Consulta simultânea em múltiplas APIs governamentais
      const [brasilApi, receitaWs, cnpja] = await Promise.allSettled([
        fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`),
        fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`),
        fetch(`https://api.cnpja.com.br/companies/${cleanCnpj}`)
      ]);

      const results = [];
      let confidence = 0;
      let enrichedData = {};

      // Processar BrasilAPI
      if (brasilApi.status === 'fulfilled') {
        const data = await (brasilApi.value as Response).json();
        if (data.nome && !data.error) {
          results.push('BrasilAPI');
          confidence += 40;
          enrichedData = { ...enrichedData, ...this.normalizeBrasilAPIData(data) };
        }
      }

      // Processar ReceitaWS
      if (receitaWs.status === 'fulfilled') {
        const data = await (receitaWs.value as Response).json();
        if (data.nome && !data.status === 'ERROR') {
          results.push('ReceitaWS');
          confidence += 35;
          enrichedData = { ...enrichedData, ...this.normalizeReceitaWSData(data) };
        }
      }

      // Processar CNPJA
      if (cnpja.status === 'fulfilled') {
        const data = await (cnpja.value as Response).json();
        if (data.name) {
          results.push('CNPJA');
          confidence += 25;
          enrichedData = { ...enrichedData, ...this.normalizeCNPJAData(data) };
        }
      }

      // Cruzamento de dados para validação final
      const isConsistent = await this.crossValidateData(enrichedData);
      
      return {
        isValid: results.length > 0 && isConsistent,
        confidence: Math.min(confidence, 100),
        issues: results.length === 0 ? ['CNPJ não encontrado em nenhuma base governamental'] : [],
        enrichedData: results.length > 0 ? enrichedData : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['Erro na validação do CNPJ']
      };
    }
  }

  /**
   * Validação de telefone usando múltiplas fontes
   */
  static async validatePhone(phone: string, companyName: string, location: string): Promise<ValidationResult> {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['Telefone com formato inválido']
      };
    }

    try {
      // Verificar se é WhatsApp
      const isWhatsApp = await this.checkWhatsApp(cleanPhone);
      
      // Buscar telefone em fontes alternativas
      const alternativePhones = await this.findAlternativePhones(companyName, location);
      
      // Validar formato DDD + número
      const ddd = cleanPhone.substring(0, 2);
      const validDDDs = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
      
      const isValidDDD = validDDDs.includes(ddd);
      let confidence = 0;
      const issues: string[] = [];

      if (isValidDDD) confidence += 40;
      else issues.push('DDD inválido');

      if (isWhatsApp) confidence += 35;
      else issues.push('Não confirmado como WhatsApp');

      if (alternativePhones.includes(cleanPhone)) confidence += 25;

      return {
        isValid: confidence >= 50,
        confidence,
        issues,
        enrichedData: {
          is_whatsapp: isWhatsApp,
          alternative_phones: alternativePhones,
          phone_type: isWhatsApp ? 'WhatsApp' : 'Fixo/Celular'
        }
      };

    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['Erro na validação do telefone']
      };
    }
  }

  /**
   * Validação de email usando Hunter.io e verificação de MX records
   */
  static async validateEmail(email: string, domain: string): Promise<ValidationResult> {
    if (!email || !email.includes('@')) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['Email com formato inválido']
      };
    }

    try {
      const emailDomain = email.split('@')[1];
      
      // Verificar MX records
      const hasMX = await this.checkMXRecord(emailDomain);
      
      // Verificar formato profissional
      const isProfessional = this.isProfessionalEmail(email);
      
      // Consultar Hunter.io se disponível
      let hunterData = null;
      try {
        hunterData = await ApiGatewayService.callApi('hunter', 'domain-search', { domain });
      } catch (e) {
        // Hunter.io não disponível
      }

      let confidence = 0;
      const issues: string[] = [];

      if (hasMX) confidence += 40;
      else issues.push('Domínio sem MX record');

      if (isProfessional) confidence += 35;
      else issues.push('Email parece pessoal/temporário');

      if (hunterData?.data?.emails?.some((e: any) => e.value === email)) confidence += 25;

      return {
        isValid: confidence >= 50,
        confidence,
        issues,
        enrichedData: {
          has_mx_record: hasMX,
          is_professional: isProfessional,
          hunter_verified: hunterData?.data?.emails?.some((e: any) => e.value === email)
        }
      };

    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        issues: ['Erro na validação do email']
      };
    }
  }

  /**
   * Detecção de leads duplicados usando algoritmo de similaridade
   */
  static async detectDuplicates(lead: Lead, existingLeads: Lead[]): Promise<Lead[]> {
    const duplicates: Lead[] = [];
    
    for (const existing of existingLeads) {
      const similarity = this.calculateSimilarity(lead, existing);
      
      if (similarity > 0.8) {
        duplicates.push(existing);
      }
    }
    
    return duplicates;
  }

  /**
   * Score de qualidade do lead baseado em múltiplos fatores
   */
  static calculateQualityScore(lead: Lead): number {
    let score = 0;
    
    // CNPJ válido
    if (lead.socialLinks?.cnpj && lead.socialLinks.cnpj !== 'VERIFICAR') {
      score += 20;
    }
    
    // Website presente
    if (lead.website) {
      score += 15;
    }
    
    // Telefone válido
    if (lead.phone && lead.phone.replace(/\D/g, '').length >= 10) {
      score += 15;
    }
    
    // Email presente
    if (lead.email) {
      score += 15;
    }
    
    // Redes sociais
    if (lead.socialLinks?.instagram || lead.socialLinks?.facebook) {
      score += 10;
    }
    
    // Localização específica
    if (lead.location && !lead.location.includes('Brasil')) {
      score += 10;
    }
    
    // Indústria específica
    if (lead.industry && lead.industry !== 'Geral') {
      score += 10;
    }
    
    // Score da IA
    if (lead.details?.ai_score) {
      score += (lead.details.ai_score / 100) * 5;
    }
    
    return Math.min(score, 100);
  }

  // Métodos privados
  private static isValidCNPJChecksum(cnpj: string): boolean {
    // Implementação completa da validação de dígitos do CNPJ
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    const calcDigit = (numbers: string[], weights: number[]) => {
      const sum = numbers.reduce((acc, num, i) => acc + parseInt(num) * weights[i], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    
    const numbers = cnpj.split('');
    const digit1 = calcDigit(numbers.slice(0, 12), weights1);
    const digit2 = calcDigit(numbers.slice(0, 13), weights2);
    
    return parseInt(numbers[12]) === digit1 && parseInt(numbers[13]) === digit2;
  }

  private static async checkWhatsApp(phone: string): Promise<boolean> {
    try {
      // Implementar verificação via WhatsApp Business API
      // Por ora, simulação baseada em padrões
      const cellPhonePatterns = [
        /^55\d{2}9\d{8}$/, // Padrão Brasil com 9
        /^55\d{2}\d{8}$/   // Padrão Brasil sem 9
      ];
      
      return cellPhonePatterns.some(pattern => pattern.test(phone));
    } catch (error) {
      return false;
    }
  }

  private static async findAlternativePhones(companyName: string, location: string): Promise<string[]> {
    // Implementar busca em fontes alternativas
    // Por ora, retorna array vazio
    return [];
  }

  private static async checkMXRecord(domain: string): Promise<boolean> {
    try {
      // Implementar verificação DNS MX
      // Por ora, simulação
      return true;
    } catch (error) {
      return false;
    }
  }

  private static isProfessionalEmail(email: string): boolean {
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'ig.com.br'];
    const domain = email.split('@')[1].toLowerCase();
    return !personalDomains.includes(domain);
  }

  private static calculateSimilarity(lead1: Lead, lead2: Lead): number {
    // Algoritmo de similaridade baseado em Levenshtein
    const nameSimilarity = this.levenshteinSimilarity(
      lead1.name.toLowerCase(),
      lead2.name.toLowerCase()
    );
    
    const locationSimilarity = lead1.location.toLowerCase() === lead2.location.toLowerCase() ? 1 : 0;
    
    const phoneSimilarity = lead1.phone === lead2.phone ? 1 : 0;
    
    return (nameSimilarity * 0.5) + (locationSimilarity * 0.3) + (phoneSimilarity * 0.2);
  }

  private static levenshteinSimilarity(str1: string, str2: string): number {
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
    
    const distance = matrix[str2.length][str1.length];
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  private static async crossValidateData(data: any): Promise<boolean> {
    // Implementar cruzamento de dados entre diferentes fontes
    // Por ora, retorna true se dados básicos estiverem presentes
    return !!(data.nome && data.municipio && data.uf);
  }

  private static normalizeBrasilAPIData(data: any): any {
    return {
      nome: data.nome,
      fantasia: data.fantasia,
      municipio: data.municipio,
      uf: data.uf,
      telefone: data.telefone,
      email: data.email,
      atividade_principal: data.atividade_principal,
      data_abertura: data.data_inicio_atividade,
      porte: data.porte,
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cep: data.cep,
      qsa: data.qsa
    };
  }

  private static normalizeReceitaWSData(data: any): any {
    return {
      nome: data.nome,
      fantasia: data.fantasia,
      municipio: data.municipio,
      uf: data.uf,
      telefone: data.telefone,
      email: data.email,
      atividade_principal: data.atividade_principal,
      data_abertura: data.abertura,
      porte: data.porte,
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cep: data.cep,
      qsa: data.qsa
    };
  }

  private static normalizeCNPJAData(data: any): any {
    return {
      nome: data.name,
      fantasia: data.tradeName,
      municipio: data.address?.city,
      uf: data.address?.state,
      telefone: data.phone ? `${data.phone.area}${data.phone.number}` : '',
      email: data.email,
      atividade_principal: data.mainActivity ? [{ text: data.mainActivity.text }] : [],
      data_abertura: data.founded,
      porte: data.size,
      logradouro: data.address?.street,
      numero: data.address?.number,
      bairro: data.address?.district,
      cep: data.address?.zipCode,
      qsa: data.shareholders
    };
  }
}
