import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function Reports() {
  const [periodType, setPeriodType] = useState('month');
  const [selectedValue, setSelectedValue] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    // Set default selected value based on current date
    const now = new Date();
    if (periodType === 'month') {
      setSelectedValue(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
    } else if (periodType === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      setSelectedValue(`${now.getFullYear()}-Q${quarter}`);
    } else {
      setSelectedValue(now.getFullYear().toString());
    }
  }, [periodType]);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const stats = await ipcRenderer.invoke('get-dashboard-stats');
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      for (let month = 12; month >= 1; month--) {
        months.push({
          value: `${year}-${month.toString().padStart(2, '0')}`,
          label: `${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })} ${year}`
        });
      }
    }
    return months;
  };

  const generateQuarterOptions = () => {
    const quarters = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      for (let q = 4; q >= 1; q--) {
        quarters.push({
          value: `${year}-Q${q}`,
          label: `Q${q} ${year}`
        });
      }
    }
    return quarters;
  };

  const generateYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 10; year--) {
      years.push({
        value: year.toString(),
        label: year.toString()
      });
    }
    return years;
  };

  const handleGenerateReport = async () => {
    if (!selectedValue) {
      alert('Please select a period');
      return;
    }

    setLoading(true);
    try {
      const data = await ipcRenderer.invoke('get-report-data', periodType, selectedValue);
      setReportData(data);
      await loadDashboardStats(); // Refresh dashboard stats for end-of-period balances
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    }
    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const exportToPDF = () => {
    alert('PDF export feature - Coming soon! Will use jspdf library');
    // TODO: Implement with jspdf
  };

  const exportToExcel = () => {
    alert('Excel export feature - Coming soon! Will use xlsx library');
    // TODO: Implement with xlsx
  };

  let options = [];
  if (periodType === 'month') options = generateMonthOptions();
  else if (periodType === 'quarter') options = generateQuarterOptions();
  else options = generateYearOptions();

  return (
    <div className="reports">
      <div className="page-header">
        <h1>Financial Reports</h1>
        <p>Generate comprehensive financial reports by month, quarter, or year</p>
      </div>

      {/* Report Controls */}
      <div className="table-container" style={{ marginBottom: '30px' }}>
        <div className="table-header">
          <h2>Generate Report</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Report Period</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                style={{ fontSize: '15px' }}
              >
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Annual</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Select {periodType === 'month' ? 'Month' : periodType === 'quarter' ? 'Quarter' : 'Year'}</label>
              <select
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                style={{ fontSize: '15px' }}
              >
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={loading}
              style={{ padding: '12px 30px', fontSize: '15px' }}
            >
              {loading ? '⏳ Generating...' : '📊 Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      {reportData && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className="btn btn-success" onClick={exportToExcel}>
              📊 Export to Excel
            </button>
            <button className="btn btn-secondary" onClick={exportToPDF}>
              📄 Export to PDF
            </button>
          </div>

          {/* Summary Stats */}
          <div className="stats-grid" style={{ marginBottom: '30px' }}>
            <div className="stat-card info">
              <div className="stat-label">Total Turnover</div>
              <h2 className="stat-value">
                {formatCurrency(reportData.turnover.total)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
              </h2>
              <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
                {reportData.projectCounts.total} projects
              </p>
            </div>

            <div className="stat-card danger">
              <div className="stat-label">Total Expenses</div>
              <h2 className="stat-value">
                {formatCurrency(reportData.expenses.total)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
              </h2>
              <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
                Project + Company
              </p>
            </div>

            <div className="stat-card success">
              <div className="stat-label">Company Profit</div>
              <h2 className="stat-value">
                {formatCurrency(reportData.profit.total)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
              </h2>
              <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
                Net profit for period
              </p>
            </div>

            <div className="stat-card warning">
              <div className="stat-label">VAT Collected</div>
              <h2 className="stat-value">
                {formatCurrency(reportData.vat.collected_total)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
              </h2>
              <p style={{fontSize: '12px', color: '#718096', marginTop: '8px'}}>
                Paid: {formatCurrency(reportData.vat.paid)} AED
              </p>
            </div>
          </div>

          {/* Turnover Breakdown */}
          <div className="table-container" style={{ marginBottom: '30px' }}>
            <div className="table-header">
              <h2>Turnover Breakdown</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Project Type</th>
                  <th style={{ textAlign: 'center' }}>Count</th>
                  <th style={{ textAlign: 'right' }}>Turnover (AED)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Regular Projects</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-info">{reportData.projectCounts.regular}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: '#4299e1', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.turnover.regular)}
                  </td>
                </tr>
                <tr>
                  <td><strong>Contractor Projects</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">{reportData.projectCounts.contractor}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.turnover.contractor)}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
                  <td><strong>TOTAL</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    <strong>{reportData.projectCounts.total}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '16px' }}>{formatCurrency(reportData.turnover.total)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expenses Breakdown */}
          <div className="table-container" style={{ marginBottom: '30px' }}>
            <div className="table-header">
              <h2>Expenses Breakdown</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Expense Type</th>
                  <th style={{ textAlign: 'right' }}>Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Project Expenses</strong></td>
                  <td style={{ textAlign: 'right', color: '#fc8181', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.expenses.project)}
                  </td>
                </tr>
                <tr>
                  <td><strong>Company Expenses</strong></td>
                  <td style={{ textAlign: 'right', color: '#fc8181', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.expenses.company)}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
                  <td><strong>TOTAL EXPENSES</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '16px', color: '#fc8181' }}>
                      {formatCurrency(reportData.expenses.total)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* VAT Breakdown */}
          <div className="table-container" style={{ marginBottom: '30px' }}>
            <div className="table-header">
              <h2>VAT Summary</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: '#fff7ed' }}>
                  <td><strong>VAT COLLECTED</strong></td>
                  <td></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '30px' }}>From Regular Projects</td>
                  <td style={{ textAlign: 'right', color: '#f6ad55', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.vat.collected_regular)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '30px' }}>From Contractor Projects</td>
                  <td style={{ textAlign: 'right', color: '#f6ad55', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.vat.collected_contractor)}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td><strong>Total VAT Collected</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#f6ad55' }}>
                      {formatCurrency(reportData.vat.collected_total)}
                    </strong>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f0fdf4' }}>
                  <td><strong>VAT Paid to Government</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#48bb78' }}>
                      {formatCurrency(reportData.vat.paid)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PM Payments & Profit Summary */}
          <div className="table-container" style={{ marginBottom: '30px' }}>
            <div className="table-header">
              <h2>Profit & PM Payments Summary</h2>
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
                  <td><strong>PROFIT BREAKDOWN</strong></td>
                  <td></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '30px' }}>Regular Projects Profit</td>
                  <td style={{ textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.profit.regular)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '30px' }}>Contractor Projects Profit</td>
                  <td style={{ textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                    {formatCurrency(reportData.profit.contractor)}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td><strong>Total Company Profit</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '16px', color: '#48bb78' }}>
                      {formatCurrency(reportData.profit.total)}
                    </strong>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#fff7ed' }}>
                  <td><strong>PM Payments (Paid)</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#f6ad55' }}>
                      {formatCurrency(reportData.pmPayments)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* End of Period Bank Balance */}
          {dashboardStats && (
            <div className="table-container">
              <div className="table-header">
                <h2>Current Account Status</h2>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th style={{ textAlign: 'right' }}>Balance (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total Bank Balance</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                      {formatCurrency(dashboardStats.bankBalance)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '30px', color: '#718096' }}>Less: Client Deposits</td>
                    <td style={{ textAlign: 'right', color: '#fc8181' }}>
                      - {formatCurrency(dashboardStats.clientDeposits)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '30px', color: '#718096' }}>Less: VAT Owed</td>
                    <td style={{ textAlign: 'right', color: '#fc8181' }}>
                      - {formatCurrency(dashboardStats.vatOwed)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #2d3748', backgroundColor: '#f0fdf4' }}>
                    <td><strong style={{ fontSize: '16px' }}>Owner's Available Balance</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <strong style={{
                        fontSize: '18px',
                        color: dashboardStats.ownerBalance >= 0 ? '#48bb78' : '#fc8181'
                      }}>
                        {formatCurrency(dashboardStats.ownerBalance)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!reportData && !loading && (
        <div className="empty-state">
          <h3>No Report Generated Yet</h3>
          <p>Select a period and click "Generate Report" to view financial data</p>
        </div>
      )}
    </div>
  );
}

export default Reports;
