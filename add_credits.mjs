import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Ler variáveis do .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_ANON_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addCredits() {
    try {
        console.log("Looking for tenant...");
        const { data: profileData, error: profileErr } = await supabase.from('profiles').select('tenant_id').limit(1);

        if (profileErr || !profileData || profileData.length === 0) {
            console.log("No profiles found.", profileErr);
            return;
        }

        const tenantId = profileData[0].tenant_id;
        console.log("Found tenant ID:", tenantId);

        console.log("Adding credits...");
        const { error: rpcErr } = await supabase.rpc('add_tenant_credits', {
            p_tenant_id: tenantId,
            p_amount: 5000,
            p_type: 'MANUAL_RECHARGE',
            p_description: 'Reabastecimento manual de 5000 créditos (Assistente).'
        });

        if (rpcErr) {
            console.error("Failed to add credits. Error:", rpcErr);
            // It might be that RLS blocked it, or the RPC doesn't exist.
            return;
        }

        console.log("Créditos adicionados com sucesso através da RPC!");

        const { data: walletData } = await supabase.from('tenant_wallets').select('credit_balance').eq('tenant_id', tenantId).single();
        if (walletData) {
            console.log("Saldo ATUAL da Wallet:", walletData.credit_balance);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

addCredits();
