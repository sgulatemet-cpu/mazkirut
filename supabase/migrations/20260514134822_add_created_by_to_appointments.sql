/*
  # Add created_by column to appointments

  ## Changes
  - `appointments` table: new column `created_by` (text, default 'sec_1')
    Stores the ID of the secretary or system that created the appointment.
    Examples: 'sec_1', 'sec_2', 'sec_3', 'booking_page'.

  ## Notes
  - Default value 'sec_1' so existing rows get a valid value without being null.
  - No RLS change needed – policies already cover the authenticated role.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE appointments ADD COLUMN created_by text NOT NULL DEFAULT 'sec_1';
  END IF;
END $$;
