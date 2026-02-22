
SELECT 
    p.id as profile_id,
    u.email,
    p.tenant_id,
    p.is_master_admin,
    t.name as tenant_name
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN tenants t ON p.tenant_id = t.id;

SELECT count(*) as total_leads FROM leads;
SELECT tenant_id, count(*) FROM leads GROUP BY tenant_id;
