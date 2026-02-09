# Guia de Integração e Prompt para Antigravity (LeadPro)

Se você precisa integrar o **LeadPro** com outro site ou sistema, utilize os materiais abaixo.

---

## 1. Documentação Técnica para o Desenvolvedor

**URL de Destino:** O desenvolvedor do site receptor deve fornecer uma URL (Endpoint) que aceite requisições `POST`.

**Headers Enviados:**
- `Content-Type: application/json`
- `X-Webhook-Secret`: Token de segurança (configurado no painel do LeadPro).
- `X-Event-Type`: Tipo de evento (atualmente `lead.enriched`).

**Exemplo de Payload (JSON):**
```json
{
  "id": "uuid-da-transacao",
  "event": "lead.enriched",
  "tenant_id": "uuid-do-seu-cliente",
  "timestamp": "2024-02-09T10:00:00Z",
  "data": {
    "id": "uuid-do-lead",
    "lead_name": "Nome da Empresa",
    "status": "ENRICHED",
    "ai_insights": "Análise neural detalhada...",
    "details": {
      "phone": "(85) 99999-9999",
      "email": "contato@empresa.com.br",
      "ai_score": 85,
      "instagram": "https://instagram.com/empresa",
      "tradeName": "Nome Fantasia",
      "size": "Médio Porte"
    },
    "social_links": {
      "instagram": "...",
      "facebook": "...",
      "website": "..."
    }
  }
}
```

---

## 2. Prompt para o Antigravity (Copiável)

Envie o texto abaixo para o desenvolvedor do outro site. Ele deve colar isso no Antigravity/Gemini dele:

> **PROMPT DE INTEGRAÇÃO:**
> "Preciso integrar meu site com o sistema LeadPro. O LeadPro enviará dados de novos leads enriquecidos via Webhooks (POST JSON) para o nosso backend.
> 
> **Sua tarefa:**
> 1. Crie um endpoint de API robusto (ex: `/api/webhooks/leadpro`) para receber as notificações.
> 2. Implemente a validação do Header `X-Webhook-Secret`. O valor deve ser comparado com uma chave que definiremos no nosso arquivo `.env` (ex: `LEADPRO_WEBHOOK_SECRET`).
> 3. O payload recebido seguirá este formato:
>    - `id`: ID único da transação.
>    - `event`: Tipo do evento (ex: 'lead.enriched').
>    - `data`: Objeto contendo `lead_name`, `ai_insights`, e um objeto `details` com `phone`, `email`, etc.
> 4. Processe esses dados e os salve no nosso banco de dados (Crie a tabela/schema necessário se não existir) ou encaminhe para nosso CRM interno.
> 5. Garanta que o endpoint responda com `200 OK` rapidamente para evitar timeouts.
> 
> Considere as melhores práticas de logs e tratamento de exceções."

---

## 3. Como configurar no LeadPro
1. Vá em **Configurações/Parceiro** -> **Integrações**.
2. Clique em **Novo CRM/Webhook**.
3. Informe o nome da integração e a URL que o outro desenvolvedor criou.
4. O sistema gerará um **Secret Token**. Copie este token e envie para o desenvolvedor colocar no `.env` dele.
