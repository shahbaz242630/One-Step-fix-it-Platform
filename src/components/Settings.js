import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function Settings() {
  const [settings, setSettings] = useState({
    starting_balance: 0,
    initial_deposits: 0,
    initial_vat: 0
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await ipcRenderer.invoke('get-settings');
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await ipcRenderer.invoke('save-settings', settings);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
  };

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will delete ALL data including:\n' +
      '- All projects (regular and contractor)\n' +
      '- All expenses\n' +
      '- All PM payments\n' +
      '- All VAT records\n' +
      '- Reset all settings to zero\n\n' +
      'This CANNOT be undone!\n\n' +
      'Are you absolutely sure?'
    );

    if (!confirmed) return;

    const doubleCheck = window.confirm('Are you REALLY sure? This will delete everything!');

    if (!doubleCheck) return;

    try {
      await ipcRenderer.invoke('reset-all-data');
      setSettings({
        starting_balance: 0,
        initial_deposits: 0,
        initial_vat: 0
      });
      alert('✓ All data has been reset! You can start fresh now.');
      window.location.reload(); // Reload the app to refresh all pages
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Error resetting data');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="settings">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your initial balances and application settings</p>
      </div>

      <div className="table-container" style={{ maxWidth: '700px' }}>
        <div className="table-header">
          <h2>Initial Financial Settings</h2>
        </div>
        <div style={{ padding: '30px' }}>
          <p style={{ color: '#718096', marginBottom: '30px', lineHeight: '1.6' }}>
            Set your starting balances here. These values help calculate your current financial position accurately.
            <br /><strong>Note:</strong> Only set these once when you first start using the app!
          </p>

          <div className="form-group">
            <label>Starting Bank Balance (AED)</label>
            <input
              type="number"
              step="0.01"
              value={settings.starting_balance}
              onChange={(e) => setSettings({ ...settings, starting_balance: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              style={{ fontSize: '16px' }}
            />
            <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px' }}>
              The actual cash you have in your bank account right now
            </p>
          </div>

          <div className="form-group">
            <label>Initial Client Deposits (AED)</label>
            <input
              type="number"
              step="0.01"
              value={settings.initial_deposits}
              onChange={(e) => setSettings({ ...settings, initial_deposits: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              style={{ fontSize: '16px' }}
            />
            <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px' }}>
              Total advance payments from clients that are already in your bank (from old projects)
            </p>
          </div>

          <div className="form-group">
            <label>Initial VAT Owed (AED)</label>
            <input
              type="number"
              step="0.01"
              value={settings.initial_vat}
              onChange={(e) => setSettings({ ...settings, initial_vat: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              style={{ fontSize: '16px' }}
            />
            <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px' }}>
              VAT amount you need to pay to government (from previous quarter)
            </p>
          </div>

          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>Calculated Owner's Balance:</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d', margin: 0 }}>
              {formatCurrency(settings.starting_balance - settings.initial_deposits - settings.initial_vat)} AED
            </p>
            <p style={{ fontSize: '13px', color: '#166534', marginTop: '8px', marginBottom: 0 }}>
              = Starting Balance ({formatCurrency(settings.starting_balance)}) - Deposits ({formatCurrency(settings.initial_deposits)}) - VAT ({formatCurrency(settings.initial_vat)})
            </p>
          </div>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ padding: '12px 40px', fontSize: '16px' }}>
              {isSaved ? '✓ Saved!' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ maxWidth: '700px', marginTop: '30px' }}>
        <div className="table-header">
          <h2>How This Works</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ lineHeight: '1.8', color: '#4a5568' }}>
            <h4 style={{ color: '#2d3748', marginBottom: '10px' }}>Example Scenario:</h4>
            <p>Let's say when you start using this app:</p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Your bank has <strong>100,000 AED</strong> in it</li>
              <li>But <strong>30,000 AED</strong> is client deposits from old projects</li>
              <li>And you owe <strong>5,000 AED</strong> in VAT</li>
            </ul>
            <p style={{ marginTop: '15px' }}>You would enter:</p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Starting Bank Balance: <strong>100,000</strong></li>
              <li>Initial Client Deposits: <strong>30,000</strong></li>
              <li>Initial VAT Owed: <strong>5,000</strong></li>
            </ul>
            <p style={{ marginTop: '15px' }}>
              Then your Owner's Available Balance would correctly show: <strong>65,000 AED</strong>
              <br />
              (The money you can actually use for business or personal needs)
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="table-container" style={{ maxWidth: '700px', marginTop: '30px', borderColor: '#fc8181', borderWidth: '2px' }}>
        <div className="table-header" style={{ backgroundColor: '#fef2f2' }}>
          <h2 style={{ color: '#dc2626' }}>⚠️ Danger Zone</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ lineHeight: '1.8', color: '#4a5568' }}>
            <h4 style={{ color: '#dc2626', marginBottom: '10px' }}>Reset All Data</h4>
            <p style={{ marginBottom: '20px' }}>
              This will permanently delete ALL data from the app including all projects, expenses, VAT records, PM payments, and reset all settings to zero.
              <br />
              <strong style={{ color: '#dc2626' }}>This action CANNOT be undone!</strong>
            </p>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#718096' }}>
              Use this if you have test data or incorrect entries and want to start completely fresh.
            </p>
            <button
              className="btn btn-danger"
              onClick={handleResetAll}
              style={{ padding: '12px 30px', fontSize: '15px' }}
            >
              🗑️ Reset All Data (Delete Everything)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
