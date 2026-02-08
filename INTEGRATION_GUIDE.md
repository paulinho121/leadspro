
# 🚀 Guia de Integração LeadPro (CRM/ERP)

Este documento descreve como integrar os dados capturados e enriquecidos pelo LeadPro com sistemas externos (Hubspot, Pipedrive, Salesforce, ERPs customizados, Zapier, Make, etc).

## 1. Webhooks (Integração Direta)

O LeadPro utiliza Webhooks para disparar dados em tempo real. Sempre que um lead é **Enriquecido**, o sistema envia uma requisição `POST` para as URLs configuradas.

### Configuração
1. Acesse o **Painel Administrativo** -> **Integrações (CRM)**.
2. Adicione uma nova conexão informando o nome e a URL de destino (Endpoint).
3. Utilize o botão "Testar Agora" para verificar a conectividade.

### Formato do Payload (JSON)
O sistema enviará um objeto com a seguinte estrutura:

```json
{
  "id": "uuid-da-transacao",
  "event": "lead.enriched",
  "tenant_id": "seu-uuid-de-empresa",
  "timestamp": "2024-02-08T12:00:00Z",
  "data": {
    "id": "uuid-do-lead",
    "lead_name": "Nome da Empresa",
    "status": "ENRICHED",
    "ai_insights": "Análise neural detalhada...",
    "details": {
      "phone": "(11) 99999-9999",
      "email": "contato@empresa.com.br",
      "ai_score": 85,
      "instagram": "https://instagram.com/...",
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

### Segurança (Validação)
Para garantir que os dados vieram do LeadPro, validamos a requisição através do Header:
`X-Webhook-Secret`: Contém o token secreto gerado no momento da criação da integração no seu painel.

---

## 2. Integração via Zapier / Make.com

Para conectar com milhares de apps sem programar:
1. No Zapier, crie um novo Zap com o Trigger **"Webhooks by Zapier"** (Catch Hook).
2. Copie a URL gerada pelo Zapier.
3. Cole esta URL no painel de **Integrações** do LeadPro.
4. No Zapier, clique em "Test Your Trigger" e, no LeadPro, clique em "Testar Agora".
5. Mapeie os campos conforme desejar para o seu CRM final.

---

## 3. Próximos Passos (Public API)

Atualmente o fluxo é **Push** (LeadPro -> Seu Sistema). Caso sua equipe precise de um fluxo **Pull** (Seu Sistema -> LeadPro), entre em contato com o suporte para liberação de chaves de API restritas para consulta direta ao banco de dados Supabase via SDK.

---
*Documentação Gerada em: 08/02/2026*
