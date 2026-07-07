'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '@/lib/firestore/settings';
import { ShopSettings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>({ shopName: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await getSettings();
        setSettings(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="text-muted">Configure shop details for printing bills</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="card-header">
          <h2>Shop Information</h2>
        </div>
        {loading ? (
          <div className="card-body text-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-body form-grid gap-4">
            <div className="form-group">
              <label className="form-label">Shop Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.shopName}
                onChange={e => setSettings({...settings, shopName: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={settings.phone}
                onChange={e => setSettings({...settings, phone: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea 
                className="form-textarea" 
                value={settings.address}
                onChange={e => setSettings({...settings, address: e.target.value})}
              />
            </div>

            <div className="mt-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthGuard>
  );
}
