---
description: How to configure and use the White Label module
---

### 1. Database Setup
Execute the migration script in your Supabase SQL Editor:
`supabase/migrations/20240204_white_label_setup.sql`

This will create the necessary tables for branding, API usage tracking, and configure Row Level Security (RLS).

### 2. Branding Configuration
Go to the **Partner Portal** in the sidebar.
Here you can simulate how a reseller would configure:
- Platform Name
- Colors (Primary, Secondary, Accent)
- Logo & Favicon
- Custom Domains

### 3. API Proxy Integration
All new API integrations should use the `ApiGatewayService.callApi` method located in `services/apiGatewayService.ts`. 
This ensures that:
- Responses are cached (reducing costs).
- Failed calls are retried automatically with exponential backoff.
- Usage is logged for billing/monitoring.

### 4. Custom Domains (CNAME)
To enable custom domains for your resellers:
1. Reseller points their CNAME to your main domain (e.g., `lb.leadflowpro.com`).
2. The `BrandingService` automatically detects the `window.location.hostname`.
3. It fetches the matching configuration from the `white_label_configs` table.

### 5. Multi-tenancy Isolation
Ensure every new table has a `tenant_id` column and the following RLS policy:
```sql
CREATE POLICY "tenant_isolation" ON your_table
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```
