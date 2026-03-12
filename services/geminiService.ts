
import { ApiGatewayService } from "./apiGatewayService";

export class GeminiService {
  static async analyzeLeadWebsite(leadName: string, website: string, industry: string) {
    return ApiGatewayService.callApi<string>(
      'gemini',
      'analyze-website',
      { leadName, website, industry },
      { ttl: 86400 * 7 } // Cache for 7 days
    );
  }

  static async generateBrandingPalette(logoUrl: string, platformName: string, apiKeys?: any) {
    const prompt = `Você é um especialista em design de marcas de luxo e tech. 
      Analise o nome da empresa "${platformName}" e o logo ${logoUrl ? `em ${logoUrl}` : 'pelo nome'}. 
      Sugira uma paleta de cores moderna, premium e com alto contraste para um sistema SaaS. 
      Retorne APENAS um JSON puro (sem markdown) no seguinte formato:
      {"primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "sidebar": "#hex"}`;

    const response = await ApiGatewayService.callApi<string>(
      'gemini',
      'custom-prompt',
      { prompt },
      { 
        useCache: false, 
        apiKeys 
      }
    );

    try {
      // Limpar o texto caso a IA retorne markdown
      const cleanJson = response.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
        console.error("[Gemini] Erro ao parsear paleta:", e);
        return null;
    }
  }
}
