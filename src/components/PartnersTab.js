import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function PartnersTab() {
  const [pmPayments, setPmPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    pm1_name: 'Project Manager 1',
    pm2_name: 'Project Manager 2'
  });

  useEffect(() => {
    loadPMPayments();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await ipcRenderer.invoke('get-settings');
      console.log('Loaded PM settings:', data); // Debug log
      if (data) {
        setSettings({
          pm1_name: data.pm1_name || 'Project Manager 1',
          pm2_name: data.pm2_name || 'Project Manager 2'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadPMPayments = async () => {
    try {
      const data = await ipcRenderer.invoke('get-all-pm-payments');
      setPmPayments(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PM payments:', error);
      setLoading(false);
    }
  };

  const handleTogglePaid = async (id, currentStatus) => {
    try {
      await ipcRenderer.invoke('update-pm-payment', id, !currentStatus);
      loadPMPayments();
    } catch (error) {
      console.error('Error updating PM payment status:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTotalPending = () => {
    return pmPayments
      .filter(payment => !payment.is_paid)
      .reduce((sum, payment) => sum + payment.pm1_payment + payment.pm2_payment, 0);
  };

  const getTotalPaid = () => {
    return pmPayments
      .filter(payment => payment.is_paid)
      .reduce((sum, payment) => sum + payment.pm1_payment + payment.pm2_payment, 0);
  };

  if (loading) {
    return <div className="loading">Loading PM payments...</div>;
  }

  return (
    <div className="partners-tab">
      <div className="page-header">
        <h1>Partners (PM Payments)</h1>
        <p>Track project manager payment shares - 50% split for completed projects</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card warning">
          <div className="stat-label">Total Pending PM Payments</div>
          <h2 className="stat-value">
            {formatCurrency(getTotalPending())} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Amount to be paid to PMs
          </p>
        </div>

        <div className="stat-card success">
          <div className="stat-label">Total Paid PM Payments</div>
          <h2 className="stat-value">
            {formatCurrency(getTotalPaid())} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Already disbursed
          </p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>PM Payment Records</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Client Name</th>
              <th>Project Profit</th>
              <th># of PMs</th>
              <th>{settings.pm1_name || 'PM1'} Payment (50% or 25%)</th>
              <th>{settings.pm2_name || 'PM2'} Payment (25%)</th>
              <th>Total Due</th>
              <th>Status</th>
              <th>Date Paid</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pmPayments.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                  No PM payments yet. Complete projects to generate PM payment records.
                </td>
              </tr>
            ) : (
              <>
                {pmPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td><strong>Project #{payment.project_id}</strong></td>
                    <td>{payment.client_name}</td>
                    <td style={{ color: '#48bb78', fontWeight: 'bold' }}>
                      {formatCurrency(payment.project_profit)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-info">{payment.num_pms}</span>
                    </td>
                    <td style={{ color: '#4299e1', fontWeight: 'bold' }}>
                      {formatCurrency(payment.pm1_payment)}
                    </td>
                    <td style={{ color: payment.pm2_payment > 0 ? '#4299e1' : '#cbd5e0', fontWeight: 'bold' }}>
                      {payment.pm2_payment > 0 ? formatCurrency(payment.pm2_payment) : '-'}
                    </td>
                    <td style={{ fontWeight: 'bold', fontSize: '15px' }}>
                      {formatCurrency(payment.pm1_payment + payment.pm2_payment)}
                    </td>
                    <td>
                      <span className={`badge ${payment.is_paid ? 'badge-success' : 'badge-warning'}`}>
                        {payment.is_paid ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td>
                      {payment.date_paid ? new Date(payment.date_paid).toLocaleDateString('en-AE') : '-'}
                    </td>
                    <td>
                      <button
                        className={`btn btn-small ${payment.is_paid ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => handleTogglePaid(payment.id, payment.is_paid)}
                      >
                        {payment.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
                  <td colSpan="6"><strong>TOTALS</strong></td>
                  <td colSpan="4">
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                      <span style={{ color: '#fc8181', fontWeight: 'bold' }}>
                        Pending: {formatCurrency(getTotalPending())}
                      </span>
                      <span style={{ color: '#48bb78', fontWeight: 'bold' }}>
                        Paid: {formatCurrency(getTotalPaid())}
                      </span>
                    </div>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-container" style={{ marginTop: '30px' }}>
        <div className="table-header">
          <h2>How PM Payments Work</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <ul style={{ lineHeight: '2', color: '#4a5568' }}>
            <li>
              <strong>1 Project Manager:</strong> Gets 50% of the project profit, Company gets 50%
            </li>
            <li>
              <strong>2 Project Managers:</strong> Each gets 25% of the project profit, Company gets 50%
            </li>
            <li>
              <strong>No Project Managers:</strong> Company gets 100% of the project profit
            </li>
            <li style={{ marginTop: '10px', color: '#718096' }}>
              Note: PM payments are only generated when you mark a project as "Completed" in the Regular Projects tab
            </li>
            <li style={{ color: '#718096' }}>
              Note: Contractor projects do NOT have PM share - Company keeps 100% of the profit
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PartnersTab;
