import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function FinancialSummary() {
  const [summary, setSummary] = useState({
    totalTurnover: 0,
    totalExpenses: 0,
    totalProfit: 0,
    regularProjects: 0,
    contractorProjects: 0,
    projectProfit: 0,
    contractorProjectProfit: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialSummary();
  }, []);

  const loadFinancialSummary = async () => {
    try {
      const data = await ipcRenderer.invoke('get-financial-summary');
      setSummary(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading financial summary:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const exportToExcel = async () => {
    // This would export data to Excel - placeholder for now
    alert('Excel export feature - To be implemented with xlsx library');
  };

  const generatePDFReport = async () => {
    // This would generate PDF report - placeholder for now
    alert('PDF report generation - To be implemented with jsPDF');
  };

  if (loading) {
    return <div className="loading">Loading financial summary...</div>;
  }

  const profitMargin = summary.totalTurnover > 0
    ? ((summary.totalProfit / summary.totalTurnover) * 100).toFixed(2)
    : 0;

  return (
    <div className="financial-summary">
      <div className="page-header">
        <h1>Financial Summary</h1>
        <p>Complete overview of business performance</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button className="btn btn-primary" onClick={loadFinancialSummary}>
          🔄 Refresh Data
        </button>
        <button className="btn btn-success" onClick={exportToExcel}>
          📊 Export to Excel
        </button>
        <button className="btn btn-secondary" onClick={generatePDFReport}>
          📄 Generate PDF Report
        </button>
      </div>

      {/* Main Financial Stats */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card info">
          <div className="stat-label">Total Turnover</div>
          <h2 className="stat-value">
            {formatCurrency(summary.totalTurnover)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            All projects combined
          </p>
        </div>

        <div className="stat-card danger">
          <div className="stat-label">Total Expenses</div>
          <h2 className="stat-value">
            {formatCurrency(summary.totalExpenses)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Project + Company expenses
          </p>
        </div>

        <div className="stat-card success">
          <div className="stat-label">Total Profit</div>
          <h2 className="stat-value">
            {formatCurrency(summary.totalProfit)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
            Profit margin: {profitMargin}%
          </p>
        </div>
      </div>

      {/* Project Breakdown */}
      <div className="table-container" style={{ marginBottom: '30px' }}>
        <div className="table-header">
          <h2>Project Breakdown</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th style={{ textAlign: 'center' }}>Count</th>
              <th style={{ textAlign: 'right' }}>Profit (AED)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Regular Projects</strong></td>
              <td style={{ textAlign: 'center' }}>
                <span className="badge badge-info">{summary.regularProjects}</span>
              </td>
              <td style={{ textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                {formatCurrency(summary.projectProfit)}
              </td>
            </tr>
            <tr>
              <td><strong>Contractor Projects</strong></td>
              <td style={{ textAlign: 'center' }}>
                <span className="badge badge-success">{summary.contractorProjects}</span>
              </td>
              <td style={{ textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                {formatCurrency(summary.contractorProjectProfit)}
              </td>
            </tr>
            <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
              <td><strong>TOTAL</strong></td>
              <td style={{ textAlign: 'center' }}>
                <strong>{summary.regularProjects + summary.contractorProjects}</strong>
              </td>
              <td style={{ textAlign: 'right' }}>
                <strong style={{ color: '#48bb78', fontSize: '16px' }}>
                  {formatCurrency(summary.projectProfit + summary.contractorProjectProfit)}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Profit & Loss Statement */}
      <div className="table-container">
        <div className="table-header">
          <h2>Profit & Loss Statement</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount (AED)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f0fdf4' }}>
              <td><strong>REVENUE</strong></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '30px' }}>Regular Projects</td>
              <td style={{ textAlign: 'right', color: '#48bb78' }}>
                {formatCurrency(summary.projectProfit)}
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '30px' }}>Contractor Projects</td>
              <td style={{ textAlign: 'right', color: '#48bb78' }}>
                {formatCurrency(summary.contractorProjectProfit)}
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #e2e8f0' }}>
              <td><strong>Total Revenue</strong></td>
              <td style={{ textAlign: 'right' }}>
                <strong>{formatCurrency(summary.projectProfit + summary.contractorProjectProfit)}</strong>
              </td>
            </tr>

            <tr style={{ backgroundColor: '#fef2f2', marginTop: '20px' }}>
              <td><strong>EXPENSES</strong></td>
              <td></td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '30px' }}>Total Expenses</td>
              <td style={{ textAlign: 'right', color: '#fc8181' }}>
                - {formatCurrency(summary.totalExpenses)}
              </td>
            </tr>

            <tr style={{ borderTop: '2px solid #2d3748', backgroundColor: '#f7fafc' }}>
              <td><strong style={{ fontSize: '16px' }}>NET PROFIT</strong></td>
              <td style={{ textAlign: 'right' }}>
                <strong style={{
                  fontSize: '18px',
                  color: summary.totalProfit >= 0 ? '#48bb78' : '#fc8181'
                }}>
                  {formatCurrency(summary.totalProfit)}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key Metrics */}
      <div className="table-container" style={{ marginTop: '30px' }}>
        <div className="table-header">
          <h2>Key Performance Indicators</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                Average Project Value
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>
                {formatCurrency(
                  (summary.regularProjects + summary.contractorProjects) > 0
                    ? summary.totalTurnover / (summary.regularProjects + summary.contractorProjects)
                    : 0
                )} AED
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                Profit Margin
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
                {profitMargin}%
              </div>
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                Average Profit per Project
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>
                {formatCurrency(
                  (summary.regularProjects + summary.contractorProjects) > 0
                    ? summary.totalProfit / (summary.regularProjects + summary.contractorProjects)
                    : 0
                )} AED
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialSummary;
