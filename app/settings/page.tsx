'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '@/lib/firestore/settings';
import { ShopSettings } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>({ shopName: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

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

  const handleResetData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== 'admin') {
      alert('Incorrect password. Action denied.');
      return;
    }
    
    if (!confirm('WARNING: This will permanently delete ALL customers, products, orders, bills, and payments. Are you absolutely sure?')) {
      return;
    }

    setResetting(true);
    try {
      const collections = ['customers', 'products', 'orders', 'bills', 'payments'];
      
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, col, d.id)));
        await Promise.all(deletePromises);
      }
      
      alert('All project data has been successfully reset.');
      setResetPassword('');
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset data:', err);
      alert('Failed to reset data. Check console for details.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Settings</h1>
          <p className="text-muted mb-0">Configure shop details for printing bills</p>
        </div>
      </div>

      <div className="card shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
        <div className="card-header bg-white py-3">
          <h5 className="card-title mb-0 fw-bold">Shop Information</h5>
        </div>
        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-body p-4">
            <div className="mb-3">
              <label className="form-label fw-semibold">Shop Name <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="form-control form-control-lg" 
                value={settings.shopName}
                onChange={e => setSettings({...settings, shopName: e.target.value})}
                required
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Phone Number</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.phone}
                onChange={e => setSettings({...settings, phone: e.target.value})}
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label fw-semibold">Address</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={settings.address}
                onChange={e => setSettings({...settings, address: e.target.value})}
              />
            </div>

            <div className="d-grid pt-3 border-top">
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
                ) : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="card shadow-sm mx-auto mt-4 border-danger border-2" style={{ maxWidth: '600px' }}>
        <div className="card-header bg-danger text-white py-3">
          <h5 className="card-title mb-0 fw-bold">Danger Zone: Reset Project Data</h5>
        </div>
        <div className="card-body p-4">
          <p className="text-danger fw-semibold">
            Warning: This action will permanently delete all customers, products, orders, bills, and payments. Your shop settings will be preserved.
          </p>
          <form onSubmit={handleResetData} className="mt-3">
            <div className="input-group">
              <input
                type="password"
                className="form-control border-danger"
                placeholder="Enter admin password to reset"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn btn-danger fw-bold" 
                disabled={resetting || !resetPassword}
              >
                {resetting ? 'Resetting...' : 'Reset All Data'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
