# Plano de Implementação: Disparo em Massa & Automações Inteligentes

Este plano detalha a implementação da engine de prospecção e automação do LeadPro, permitindo disparos em massa e respostas automáticas baseadas em IA.

## 1. Infraestrutura de Dados (Database Migration)
Responsável por armazenar campanhas, regras de automação e a fila de mensagens.

- [ ] **Tabela `outreach_campaigns`**: Agrupador de disparos em massa.
- [ ] **Tabela `automation_rules`**: Configurações estilo n8n (Trigger -> IA Analysis -> Action).
- [ ] **Tabela `communication_settings`**: Armazenar chaves de API específicas de cada tenant (Evolution API, Resend).
- [ ] **Tabela `message_queue`**: Fila de mensagens individuais com controle de delay humano.

## 2. Camada de Serviços (Backend Logic)

- [ ] **CommunicationService**: Abstração para envio via Evolution API (WhatsApp) e Resend (Email).
- [ ] **AutomationEngine**: Serviço que escuta webhooks de mensagens recebidas e processa as `automation_rules`.
- [ ] **CampaignManager**: Serviço para criar disparos em massa, injetando leads na `message_queue`.

## 3. Integração de Webhooks (Recebimento)

- [ ] Criar endpoint para receber Webhooks da Evolution API.
- [ ] Criar endpoint para receber Webhooks de e-mail (Bounce/Resposta).
- [ ] Integrar com o `SdrService.analyzeResponse` para classificar o sentimento do lead automaticamente.

## 4. Frontend (Interface do Usuário)

- [ ] **Campaign Builder**: Tela para selecionar leads e definir o template de abordagem.
- [ ] **Automation Dashboard**: Interface para gerenciar regras "Se acontecer isso...".
- [ ] **Settings Integration**: Painel para o cliente conectar seu próprio WhatsApp (Link de QR Code via Evolution API).

## 5. Cron & Jobs (Processing)

- [ ] Configurar Worker para processar a `message_queue` respeitando o rate limit para evitar banimentos.

---
*Status: Aguardando Migração de Banco*
