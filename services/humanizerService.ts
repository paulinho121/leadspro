
/**
 * HumanizerService — Motor Anti-Ban para Disparos em Massa
 * Garante que os disparos pareçam completamente humanos para os provedores.
 */
export class HumanizerService {

    // Limites seguros por canal (mensagens/dia por instância)
    private static readonly DAILY_LIMITS = {
        whatsapp: 150,  // Limite conservador para não ser banido
        email: 500,     // Limite do Resend no plano gratuito
    };

    // Janela de envio humanizada (8h às 20h hora de Brasília)
    private static readonly SEND_WINDOW = { start: 8, end: 20 };

    /**
     * Retorna um delay em segundos com distribuição natural (não robótica)
     * WhatsApp: 2-5 minutos entre mensagens
     * Email: 30-90 segundos entre envios
     */
    static getHumanizedDelaySeconds(channel: 'whatsapp' | 'email'): number {
        if (channel === 'whatsapp') {
            // Entre 120s (2min) e 300s (5min) com curva gaussiana
            const base = 210; // ~3.5 minutos
            const jitter = (Math.random() - 0.5) * 120;
            return Math.round(Math.max(120, base + jitter));
        } else {
            // Entre 30s e 90s para email
            const base = 60;
            const jitter = (Math.random() - 0.5) * 40;
            return Math.round(Math.max(30, base + jitter));
        }
    }

    /**
     * Verifica se está dentro da janela de envio humanizada (8h-20h)
     */
    static isWithinSendingWindow(timezoneOffset: number = -3): boolean {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const localHour = (utcHour + timezoneOffset + 24) % 24;
        return localHour >= this.SEND_WINDOW.start && localHour < this.SEND_WINDOW.end;
    }

    /**
     * Retorna a próxima janela de envio se estiver fora do horário
     */
    static getNextSendingWindowStart(): Date {
        const now = new Date();
        const next = new Date(now);

        // Se já passou das 20h, agendar para amanhã às 8h
        const currentHour = now.getHours() - 3; // Timezone Brasil
        if (currentHour >= 20 || currentHour < 8) {
            next.setDate(next.getDate() + (currentHour >= 20 ? 1 : 0));
            next.setHours(8 + 3, Math.floor(Math.random() * 30), 0, 0); // +3 offset
        }

        return next;
    }

    /**
     * Calcula a data de agendamento para um item na fila,
     * respeitando a janela de envio e o ritmo humanizado.
     */
    static calculateScheduleDate(baseDate: Date, channel: 'whatsapp' | 'email', delaySeconds: number): Date {
        const scheduleDate = new Date(baseDate.getTime() + delaySeconds * 1000);

        // Se cair fora da janela de envio, ajustar para próximo horário válido
        const scheduleHour = scheduleDate.getHours();
        if (scheduleHour >= 20 || scheduleHour < 8) {
            scheduleDate.setDate(scheduleDate.getDate() + (scheduleHour >= 20 ? 1 : 0));
            scheduleDate.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        }

        return scheduleDate;
    }

    /**
     * Verifica se o limite diário de disparos foi atingido para um tenant
     * Deve ser checado antes de cada envio pelo worker.
     */
    static isDailyLimitSafe(currentCount: number, channel: 'whatsapp' | 'email'): boolean {
        return currentCount < this.DAILY_LIMITS[channel];
    }

    /**
     * Gera intervalo de pausa aleatória entre lotes (simula comportamento humano)
     * Pausa de 10-20 minutos a cada 30 mensagens enviadas
     */
    static shouldPauseBatch(messagesSent: number): boolean {
        return messagesSent > 0 && messagesSent % 30 === 0;
    }

    static getBatchPauseSeconds(): number {
        // Entre 600s (10min) e 1200s (20min)
        return Math.round(600 + Math.random() * 600);
    }

    /**
     * Detecta padrão de falha consecutiva (possível bloqueio)
     * Retorna true se dever pausar a campanha por suspeita de ban
     */
    static detectSuspectedBan(recentFailures: number, totalAttempts: number): boolean {
        if (totalAttempts < 5) return false;
        const failureRate = recentFailures / totalAttempts;
        return failureRate > 0.5; // Mais de 50% de falhas = suspeita de ban
    }
}
