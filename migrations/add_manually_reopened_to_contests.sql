-- Add manually reopened tracking to contests
ALTER TABLE contests ADD COLUMN manually_reopened BOOLEAN DEFAULT FALSE;