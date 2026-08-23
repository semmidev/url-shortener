-- Add is_group column to navigation_menus
ALTER TABLE navigation_menus ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;
