
import { supabase } from '../lib/supabase';

export interface TaskPayload {
    leads_ids?: string[];
    search_params?: any;
    [key: string]: any;
}

export class QueueService {
    /**
     * Adiciona uma nova tarefa à fila
     */
    static async submitTask(tenantId: string, type: 'ENRICH_BATCH' | 'DISCOVERY_STATE', payload: TaskPayload) {
        const { data, error } = await supabase
            .from('background_tasks')
            .insert([{
                tenant_id: tenantId,
                type,
                payload,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Busca o status de uma tarefa
     */
    static async getTaskStatus(taskId: string) {
        const { data, error } = await supabase
            .from('background_tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Busca todas as tarefas ativas do Tenant
     */
    static async getActiveTasks(tenantId: string) {
        const { data, error } = await supabase
            .from('background_tasks')
            .select('*')
            .eq('tenant_id', tenantId)
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}
