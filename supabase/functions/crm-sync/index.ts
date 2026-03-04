import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { provider, token, leads } = body;

        console.log(`[CRM-Sync] Sincronizando ${leads?.length || 0} leads para o provedor: ${provider}`);

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return new Response(JSON.stringify({ ok: false, msg: "Nenhum lead fornecido." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }

        if (!token) {
            return new Response(JSON.stringify({ ok: false, msg: "Token do CRM ausente." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;

        for (const lead of leads) {
            let apiCallSuccessful = false;

            if (provider === 'hubspot') {
                const nameParts = (lead.name || 'Sem Nome').split(' ');
                const firstname = nameParts[0];
                const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';
                const payload = {
                    properties: {
                        email: lead.email || lead.details?.email || '',
                        firstname: firstname,
                        lastname: lastname,
                        phone: lead.phone || '',
                        company: lead.details?.tradeName || lead.name,
                        website: lead.website || '',
                        lifecyclestage: 'lead'
                    }
                };

                // Remove empty
                Object.keys(payload.properties).forEach(key => {
                    if (!(payload.properties as any)[key]) {
                        delete (payload.properties as any)[key];
                    }
                });

                const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                // 409 conflict = already exists
                if (res.ok || res.status === 409) apiCallSuccessful = true;
                else console.error('[HubSpot] Erro:', await res.text().catch(() => ''));
            }

            else if (provider === 'pipedrive') {
                const payload = {
                    name: lead.name || lead.details?.tradeName || 'Lead Sem Nome',
                    phone: lead.phone ? [{ value: lead.phone, primary: true }] : [],
                    email: lead.email || lead.details?.email ? [{ value: lead.email || lead.details?.email, primary: true }] : []
                };

                const res = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) apiCallSuccessful = true;
                else console.error('[Pipedrive] Erro:', await res.text().catch(() => ''));
            }

            else if (provider === 'rd_station') {
                const empresaName = lead.details?.tradeName || lead.name;
                const payload = {
                    token: token,
                    deal: { name: `Venda - ${empresaName}`, rating: 1 },
                    organization: { organization: { name: empresaName } },
                    contacts: [{
                        name: lead.name || empresaName,
                        emails: lead.email || lead.details?.email ? [{ email: lead.email || lead.details?.email }] : [],
                        phones: lead.phone ? [{ phone: lead.phone }] : []
                    }],
                    deal_custom_fields: []
                };

                const res = await fetch(`https://crm.rdstation.com/api/v1/deals?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) apiCallSuccessful = true;
                else console.error('[RDStation] Erro:', await res.text().catch(() => ''));
            }

            else if (provider === 'salesforce') {
                // Salesforce needs URL::Token
                if (!token.includes('::')) {
                    return new Response(JSON.stringify({ ok: false, msg: "Salesforce token must be in URL::Token format" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
                }
                const [instanceUrlRaw, authTokenRaw] = token.split('::');
                const instanceUrl = instanceUrlRaw.trim().replace(/\/$/, "");
                const authToken = authTokenRaw.trim();

                const nameParts = (lead.name || 'Sem Nome').split(' ');
                const firstname = nameParts[0];
                const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Desconhecido';
                const payload = {
                    FirstName: firstname,
                    LastName: lastname,
                    Company: lead.details?.tradeName || lead.name || 'Empresa Desconhecida',
                    Email: lead.email || lead.details?.email || '',
                    Phone: lead.phone || '',
                    Website: lead.website || '',
                    Industry: lead.industry || ''
                };

                const res = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(payload)
                });

                if (res.ok || res.status === 201) apiCallSuccessful = true;
                else console.error('[Salesforce] Erro:', await res.text().catch(() => ''));
            }

            if (apiCallSuccessful) successCount++;
            else errorCount++;
        }

        return new Response(JSON.stringify({
            ok: successCount > 0,
            successCount,
            errorCount,
            msg: `Sincronizados ${successCount} leads. Erros: ${errorCount}`
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("[CRM-Sync] Erro interno:", err.message);
        return new Response(JSON.stringify({ ok: false, msg: `Erro de servidor / proxy: ${err.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
