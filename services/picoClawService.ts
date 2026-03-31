
/**
 * PicoClaw Integration Service
 * 
 * Provides a bridge between the LeadPro Matrix ecosystem and the PicoClaw AI Agent framework.
 * This service handles command mapping and state synchronization.
 */

import { supabase } from '../lib/supabase';
import { DiscoveryService } from './discoveryService';
import { GeminiService } from './geminiService';
import { getPicoClawPrompt } from './picoClawPrompts';
import { ApiGatewayService } from './apiGatewayService';

export interface PicoClawCommand {
  intent: 'EXTRACT_MAPS' | 'EXTRACT_CNPJ' | 'ENRICH_LEAD' | 'GET_STATS' | 'NOTIFY_USER';
  params: Record<string, any>;
  timestamp: string;
}

export class PicoClawService {
  private static status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' = 'DISCONNECTED';

  /**
   * Initializes the bridge and sets up listeners for incoming agent commands
   */
  static async initializeBridge(tenantId: string) {
    console.log(`[PicoClaw] Initializing bridge for tenant: ${tenantId}`);
    this.status = 'SYNCING';
    
    // In a real scenario, we would subscribe to a specific Realtime channel or an Edge Function
    const channel = supabase
      .channel(`picoclaw-bridge-${tenantId}`)
      .on('broadcast', { event: 'agent-command' }, (payload) => {
        this.handleIncomingCommand(tenantId, payload.payload as PicoClawCommand);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.status = 'CONNECTED';
          console.log('[PicoClaw] Neural Bridge established.');
        }
      });

    return channel;
  }

  /**
   * Handles commands sent from the PicoClaw agent
   */
  private static async handleIncomingCommand(tenantId: string, command: PicoClawCommand) {
    console.log(`[PicoClaw] Command received: ${command.intent}`, command.params);

    try {
      switch (command.intent) {
        case 'EXTRACT_MAPS':
          await this.executeMapsExtraction(tenantId, command.params);
          break;
        case 'GET_STATS':
          return this.getPlatformStats(tenantId);
        default:
          console.warn(`[PicoClaw] Unknown intent: ${command.intent}`);
      }
    } catch (error) {
      console.error('[PicoClaw] Command execution failed:', error);
    }
  }

  private static async executeMapsExtraction(tenantId: string, params: any) {
    const { keyword, location, limit } = params;
    console.log(`[PicoClaw] Triggering Maps Sniper: ${keyword} in ${location}`);
    
    // This would call the real DiscoveryService
    // results = await DiscoveryService.performDeepScan(keyword, location, tenantId, ...);
  }

  static async getPlatformStats(tenantId: string) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
      
    return {
      totalLeads: count || 0,
      bridgeStatus: this.status,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Processes a direct chat message from the user using PicoClaw's persona
   */
  static async chat(tenantId: string, message: string, apiKeys?: any) {
    console.log(`[PicoClaw] Processing chat for tenant: ${tenantId}`);
    
    // 1. Gather Operational Context
    const stats = await this.getPlatformStats(tenantId);
    
    // 2. Gather Recent Activity (for Churn Detection)
    const { data: recentActivity } = await supabase
      .from('activity_logs')
      .select('action, details, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    const context = `
      - Total de Leads: ${stats.totalLeads}
      - Status da Conexão: ${stats.bridgeStatus}
      - Atividades Recentes: ${JSON.stringify(recentActivity || [])}
      - Timestamp Atual: ${new Date().toISOString()}
    `;

    // 3. Build Prompt and Call AI
    const systemPrompt = getPicoClawPrompt(context);
    
    try {
      const response = await ApiGatewayService.callApi<string>(
        'gemini',
        'custom-prompt',
        { prompt: systemPrompt + `\n\nUsuário diz: "${message}"` },
        { apiKeys, useCache: false }
      );

      // Log the interaction
      await supabase.from('activity_logs').insert([{
        tenant_id: tenantId,
        action: 'PICOCLAW_CHAT',
        details: `Mensagem: ${message.substring(0, 50)}...`
      }]);

      return response.replace(/```json|```/g, '').trim();
    } catch (error) {
      console.error('[PicoClaw] Chat failed:', error);
      return "Estou com uma pequena instabilidade na minha matriz neural, mas posso ajudar você com a busca de leads agora mesmo. O que você precisa?";
    }
  }

  /**
   * Sends a notification or data back to the PicoClaw agent
   */
  static async notifyAgent(tenantId: string, event: string, data: any) {
    await supabase.channel(`picoclaw-bridge-${tenantId}`).send({
      type: 'broadcast',
      event: 'platform-update',
      payload: { event, data, timestamp: new Date().toISOString() }
    });
  }
}
