
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

  static async generateLeadScore(leadData: any) {
    return ApiGatewayService.callApi<any>(
      'gemini',
      'score-lead',
      { leadData },
      { ttl: 3600 } // Cache for 1 hour
    );
  }
}
