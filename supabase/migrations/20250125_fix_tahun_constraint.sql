-- Fix tahun constraint to allow grade levels 1-3 instead of calendar years
-- Migration: 20250125_fix_tahun_constraint.sql

BEGIN;

-- Drop the existing constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_tahun_check;

-- Add the new constraint for grade levels 1-3
ALTER TABLE projects ADD CONSTRAINT projects_tahun_check CHECK (tahun >= 1 AND tahun <= 3);

COMMIT;