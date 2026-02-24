# Plano de Escalonamento Enterprise - LeadPro

Este documento detalha o roadmap técnico para transformar o LeadPro em um SaaS B2B escalável de alto nível.

## Fase 1: Fundação de Billing e Créditos (Segurança Financeira)
- [ ] Criar tabela `tenant_wallets` para rastreio de saldo.
- [ ] Criar log de transações `credit_logs` para auditoria.
- [ ] Implementar `BillingService` no frontend para validar saldo antes de chamadas de IA/Busca.
- [ ] Adicionar indicador visual de créditos no Header/Sidebar.

## Fase 2: Performance e Engenharia de Frontend (UX Fluida)
- [ ] Migrar para **Zustand** para gestão de estado global (Tabs, UI local).
- [ ] Implementar **TanStack Query (React Query)** para cache e sincronização de dados (leads, profile).
- [ ] Implementar **Virtualização de Lista** no `LeadLab.tsx` para suportar 10.000+ registros sem lag.

## Fase 3: Background Processing e Resiliência (Escalabilidade Técnica)
- [ ] Criar infraestrutura de Fila de Tarefas (`tasks_queue`) no Supabase.
- [ ] Desacoplar Enriquecimento: O usuário solicita -> Tarefa entra na fila -> Worker processa em background.
- [ ] Implementar Notificações via Realtime para conclusão de tarefas pesadas.

## Fase 4: Automação e Agentes (Valor Enterprise)
- [ ] Implementar "Hunters Agendados" (Buscas recorrentes automáticas).
- [ ] Melhorar integração nativa com CRMs (OAuth do HubSpot/Pipedrive).

---
*Assinado: Engenheiro de Software Specialist*
