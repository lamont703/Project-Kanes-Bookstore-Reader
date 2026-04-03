-- ============================================================
-- Kane's Komet Book Reader — Fulfillment Status Cleanup
-- Migration: Revert/Remove fulfillment_status column
-- ============================================================

-- 1. Remove the fulfillment_status column from the orders table
ALTER TABLE public.orders 
DROP COLUMN IF EXISTS fulfillment_status;

-- 2. Drop the custom enum type if it exists
DROP TYPE IF EXISTS fulfillment_status_enum;
