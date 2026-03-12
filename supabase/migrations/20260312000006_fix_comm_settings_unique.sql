
-- Migration to fix unique constraint on communication_settings
-- This ensures that the upsert operation in the frontend works correctly.

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'communication_settings_tenant_provider_unique'
    ) THEN 
        ALTER TABLE public.communication_settings 
        ADD CONSTRAINT communication_settings_tenant_provider_unique UNIQUE (tenant_id, provider_type);
    END IF;
END $$;
