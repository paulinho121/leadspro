
import { ApiGatewayService } from './apiGatewayService';
import { Lead } from '../types';

export class SdrService {
    /**
     * Gera uma mensagem de abordagem personalizada com base nos insights do Lead
     */
    static async generateOutreachMessage(lead: Lead, channel: 'whatsapp' | 'email', apiKeys?: any): Promise<string> {
        const prompt = `
            Você é um SDR (Sales Development Representative) de alta performance.
            Seu objetivo é gerar uma mensagem de prospecção para a empresa "${lead.name}".
            
            DADOS DO LEAD:
            - Nicho: ${lead.industry}
            - Local: ${lead.location}
            - Insights da IA: ${lead.ai_insights || 'Não disponíveis'}
            - Site: ${lead.website || 'Não identificado'}
            
            CANAL DE ABORDAGEM: ${channel.toUpperCase()}
            
            DIRETRIZES:
            1. Seja direto, profissional e gere curiosidade.
            2. Use os "Insights da IA" para personalizar a dor que você resolve.
            3. Não use placeholders como [Nome]. Use o nome da empresa se apropriado.
            4. Para WhatsApp: Curto, até 3 parágrafos, use quebras de linha.
            5. Para Email: Assunto chamativo + corpo estruturado.
            
            RETORNE APENAS O TEXTO DA MENSAGEM.
        `;

        try {
            const message = await ApiGatewayService.callApi<string>(
                'gemini-1.5-flash',
                'custom-prompt',
                { prompt },
                { apiKeys, ttl: 0 } // Não usar cache para mensagens de saída para garantir frescor
            );
            return message.trim();
        } catch (error) {
            console.error('[SdrService] Falha ao gerar mensagem:', error);
            return channel === 'whatsapp'
                ? `Olá! Notei que a ${lead.name} é referência em ${lead.industry}. Gostaria de conversar sobre como podemos acelerar seu crescimento.`
                : `Assunto: Parceria estratégica para ${lead.name}\n\nOlá, vi seu trabalho em ${lead.location} e gostaria de agendar uma breve call.`;
        }
    }

    /**
     * Analisa uma resposta do cliente para detectar intenção (Intelligent Feedback)
     */
    static async analyzeResponse(content: string, apiKeys?: any): Promise<{ sentiment: string, intent: 'positive' | 'negative' | 'neutral' | 'question' }> {
        const prompt = `
            Analise a resposta abaixo de um potencial cliente e classifique o sentimento e a intenção comercial.
            Resposta: "${content}"
            
            Retorne APENAS um JSON:
            {
                "sentiment": "descrição curta",
                "intent": "positive/negative/neutral/question"
            }
        `;

        try {
            const analysis = await ApiGatewayService.callApi<any>(
                'gemini-1.5-flash',
                'custom-prompt',
                { prompt },
                { apiKeys }
            );
            return JSON.parse(analysis.replace(/```json|```/g, '').trim());
        } catch (error) {
            return { sentiment: 'indefinido', intent: 'neutral' };
        }
    }
}
