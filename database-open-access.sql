/*
  # Remove Authentication Requirements - Open Access

  This migration removes authentication requirements and makes the application
  publicly accessible without sign-in.

  ## Changes
  - Drop existing restrictive RLS policies
  - Create new public access policies
  - Allow anonymous access to all tables
  - Update storage bucket policies for public access
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can view own project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own project images" ON storage.objects;

-- Create public access policies for projects table
CREATE POLICY "Public can view all projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Public can create projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update projects"
  ON projects FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete projects"
  ON projects FOR DELETE
  USING (true);

-- Update storage policies for public access to project-images bucket
DROP POLICY IF EXISTS "Users can view own reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own reference images" ON storage.objects;

CREATE POLICY "Public can view project images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "Public can upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Public can delete project images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-images');

-- Make project-images bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'project-images';

-- Note: Slab images already have public read access, admin policies remain the same
-- Note: profiles table remains but is not used in the application
