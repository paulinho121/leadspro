-- ==========================================
-- STORAGE SETUP FOR BRANDING
-- ==========================================

-- 1. Create the 'branding' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access for Branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Submit Branding" ON storage.objects;
DROP POLICY IF EXISTS "Owners Update Branding" ON storage.objects;
DROP POLICY IF EXISTS "Owners Delete Branding" ON storage.objects;

-- 3. Create RLS Policies for the bucket
-- Allow public read access to all files in the branding bucket
CREATE POLICY "Public Access for Branding" ON storage.objects
FOR SELECT USING (bucket_id = 'branding');

-- Allow authenticated users (admins) to upload files
CREATE POLICY "Authenticated Users Submit Branding" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'branding' AND
    auth.role() = 'authenticated'
);

-- Allow users to update their own files
CREATE POLICY "Owners Update Branding" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'branding' AND
    auth.uid() = owner
);

-- Allow users to delete their own files
CREATE POLICY "Owners Delete Branding" ON storage.objects
FOR DELETE USING (
     bucket_id = 'branding' AND
     auth.uid() = owner
);
