/*
  # Add columns to appointments and contacts tables

  1. appointments table - new columns:
    - `appointment_type` (text) - type/category of the appointment
    - `status` (text) - already exists, skipped
    - `notes` (text) - already exists, skipped
    - `send_whatsapp_reminder` (boolean, default false) - whether to send WhatsApp reminder
    - `send_sms_reminder` (boolean, default false) - whether to send SMS reminder
    - `send_email_reminder` (boolean, default false) - whether to send email reminder

  2. contacts table - new columns:
    - `tags` (text[]) - already exists, skipped
    - `general_notes` (text) - general free-text notes about the contact
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE appointments ADD COLUMN appointment_type text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'send_whatsapp_reminder'
  ) THEN
    ALTER TABLE appointments ADD COLUMN send_whatsapp_reminder boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'send_sms_reminder'
  ) THEN
    ALTER TABLE appointments ADD COLUMN send_sms_reminder boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'send_email_reminder'
  ) THEN
    ALTER TABLE appointments ADD COLUMN send_email_reminder boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'general_notes'
  ) THEN
    ALTER TABLE contacts ADD COLUMN general_notes text DEFAULT '';
  END IF;
END $$;
