import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Tag, FileText } from 'lucide-react';
import { supabase, Contact } from '../lib/supabase';

interface Props {
  contact?: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContactModal({ contact, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', notes: '', tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        notes: contact.notes,
        tags: (contact.tags || []).join(', '),
      });
    }
  }, [contact]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('שם הוא שדה חובה'); return; }
    setSaving(true);
    setError('');

    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    const res = contact
      ? await supabase.from('contacts').update(data).eq('id', contact.id)
      : await supabase.from('contacts').insert(data);

    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-frank font-bold text-slate-800 text-lg">
            {contact ? 'עריכת איש קשר' : 'הוספת איש קשר חדש'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <User className="w-3.5 h-3.5 inline ml-1 text-slate-400" />שם מלא *
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              placeholder="ישראל ישראלי"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Phone className="w-3.5 h-3.5 inline ml-1 text-slate-400" />טלפון
              </label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                placeholder="050-0000000"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Mail className="w-3.5 h-3.5 inline ml-1 text-slate-400" />אימייל
              </label>
              <input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline ml-1 text-slate-400" />כתובת
            </label>
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              placeholder="רחוב, עיר"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Tag className="w-3.5 h-3.5 inline ml-1 text-slate-400" />תגיות (מופרדות בפסיק)
            </label>
            <input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              placeholder="משפחה, חתן, גיור"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline ml-1 text-slate-400" />הערות
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition resize-none"
              placeholder="הערות חופשיות..."
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? 'שומר...' : contact ? 'שמור שינויים' : 'הוסף איש קשר'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
