import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ContactStatus = 'active' | 'inactive';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  tags: string[];
  general_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  contact_id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  appointment_type: string;
  google_calendar_event_id: string;
  location: string;
  notes: string;
  send_whatsapp_reminder: boolean;
  send_sms_reminder: boolean;
  send_email_reminder: boolean;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface Reminder {
  id: string;
  appointment_id: string;
  contact_id: string;
  reminder_type: 'whatsapp' | 'email' | 'phone';
  status: 'pending' | 'sent' | 'failed';
  scheduled_for: string;
  sent_at: string | null;
  message_body: string;
  error_message: string;
  created_at: string;
  appointment?: Appointment;
  contact?: Contact;
}
