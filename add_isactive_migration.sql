-- Migration to add isActive field to users table
ALTER TABLE users ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;