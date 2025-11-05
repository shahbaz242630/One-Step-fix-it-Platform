import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function Dashboard() {
  const [stats, setStats] = useState({
    bankBalance: 0,
    ownerBalance: 0,
    vatOwed: 0,
    clientDeposits: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await ipcRenderer.invoke('get-dashboard-stats');
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your financial status</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-label">Total Bank Balance</div>
          <h2 className="stat-value">
            {formatCurrency(stats.bankBalance)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
        </div>

        <div className="stat-card success">
          <div className="stat-label">Owner's Available Balance</div>
          <h2 className="stat-value">
            {formatCurrency(stats.ownerBalance)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Money you can use
          </p>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">VAT to Pay (Current Quarter)</div>
          <h2 className="stat-value">
            {formatCurrency(stats.vatOwed)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Amount owed to government
          </p>
        </div>

        <div className="stat-card danger">
          <div className="stat-label">Client Deposits</div>
          <h2 className="stat-value">
            {formatCurrency(stats.clientDeposits)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Advance payments held
          </p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Balance Breakdown</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{textAlign: 'right'}}>Amount (AED)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total Bank Balance</strong></td>
              <td style={{textAlign: 'right'}}><strong>{formatCurrency(stats.bankBalance)}</strong></td>
            </tr>
            <tr>
              <td style={{paddingLeft: '30px'}}>Less: VAT to Pay</td>
              <td style={{textAlign: 'right', color: '#fc8181'}}>- {formatCurrency(stats.vatOwed)}</td>
            </tr>
            <tr>
              <td style={{paddingLeft: '30px'}}>Less: Client Deposits</td>
              <td style={{textAlign: 'right', color: '#fc8181'}}>- {formatCurrency(stats.clientDeposits)}</td>
            </tr>
            <tr style={{borderTop: '2px solid #e2e8f0'}}>
              <td><strong>Owner's Available Balance</strong></td>
              <td style={{textAlign: 'right'}}><strong style={{color: '#48bb78'}}>{formatCurrency(stats.ownerBalance)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{textAlign: 'center', marginTop: '20px'}}>
        <button className="btn btn-primary" onClick={loadDashboardStats}>
          🔄 Refresh Dashboard
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
