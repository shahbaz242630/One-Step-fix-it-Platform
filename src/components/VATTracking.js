import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function VATTracking() {
  const [vatRecords, setVatRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVATRecords();
  }, []);

  const loadVATRecords = async () => {
    try {
      const data = await ipcRenderer.invoke('get-vat-records');
      setVatRecords(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading VAT records:', error);
      setLoading(false);
    }
  };

  const handleTogglePaid = async (id, currentStatus) => {
    try {
      await ipcRenderer.invoke('update-vat-paid', id, !currentStatus);
      loadVATRecords();
    } catch (error) {
      console.error('Error updating VAT status:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Group VAT records by quarter and year
  const groupByQuarter = () => {
    const grouped = {};

    vatRecords.forEach((record) => {
      const key = `${record.year}-${record.quarter}`;
      if (!grouped[key]) {
        grouped[key] = {
          year: record.year,
          quarter: record.quarter,
          records: [],
          totalVAT: 0,
          totalPaid: 0,
          totalPending: 0
        };
      }

      grouped[key].records.push(record);
      grouped[key].totalVAT += record.vat_amount;

      if (record.is_paid) {
        grouped[key].totalPaid += record.vat_amount;
      } else {
        grouped[key].totalPending += record.vat_amount;
      }
    });

    // Convert to array and sort by year and quarter
    return Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      return quarterOrder[b.quarter] - quarterOrder[a.quarter];
    });
  };

  const getCurrentQuarter = () => {
    const month = new Date().getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  };

  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  const quarterlySummary = groupByQuarter();
  const currentQuarter = getCurrentQuarter();
  const currentYear = getCurrentYear();

  if (loading) {
    return <div className="loading">Loading VAT records...</div>;
  }

  return (
    <div className="vat-tracking">
      <div className="page-header">
        <h1>VAT Tracking</h1>
        <p>Quarterly VAT reports - Track VAT collected and payments to government</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        {quarterlySummary.map((quarter) => {
          const isCurrent = quarter.quarter === currentQuarter && quarter.year === currentYear;
          return (
            <div
              key={`${quarter.year}-${quarter.quarter}`}
              className={`stat-card ${isCurrent ? 'warning' : 'info'}`}
            >
              <div className="stat-label">
                {quarter.quarter} {quarter.year} {isCurrent && '(Current)'}
              </div>
              <h2 className="stat-value">
                {formatCurrency(quarter.totalVAT)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
              </h2>
              <div style={{ marginTop: '10px', fontSize: '13px' }}>
                <div style={{ color: '#48bb78' }}>✓ Paid: {formatCurrency(quarter.totalPaid)} AED</div>
                <div style={{ color: '#fc8181' }}>⏳ Pending: {formatCurrency(quarter.totalPending)} AED</div>
              </div>
            </div>
          );
        })}
      </div>

      {quarterlySummary.map((quarter) => (
        <div key={`${quarter.year}-${quarter.quarter}`} className="table-container" style={{ marginBottom: '30px' }}>
          <div className="table-header">
            <h2>
              {quarter.quarter} {quarter.year}
              {quarter.quarter === currentQuarter && quarter.year === currentYear && (
                <span className="badge badge-warning" style={{ marginLeft: '10px' }}>Current Quarter</span>
              )}
            </h2>
            <div>
              <span style={{ marginRight: '20px' }}>
                Total: <strong>{formatCurrency(quarter.totalVAT)} AED</strong>
              </span>
              <span style={{ color: quarter.totalPending > 0 ? '#fc8181' : '#48bb78' }}>
                {quarter.totalPending > 0 ? '⏳ Pending Payment' : '✓ All Paid'}
              </span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Project Type</th>
                <th>Client Name</th>
                <th>Payment Amount</th>
                <th>VAT Amount (5%)</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {quarter.records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <span className={`badge ${record.project_type === 'regular' ? 'badge-info' : 'badge-success'}`}>
                      {record.project_type === 'regular' ? 'Regular' : 'Contractor'}
                    </span>
                  </td>
                  <td><strong>{record.client_name}</strong></td>
                  <td>{formatCurrency(record.payment_amount)}</td>
                  <td style={{ color: '#f6ad55', fontWeight: 'bold' }}>
                    {formatCurrency(record.vat_amount)}
                  </td>
                  <td>{new Date(record.created_at).toLocaleDateString('en-AE')}</td>
                  <td>
                    <span className={`badge ${record.is_paid ? 'badge-success' : 'badge-warning'}`}>
                      {record.is_paid ? '✓ Paid' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-small ${record.is_paid ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => handleTogglePaid(record.id, record.is_paid)}
                    >
                      {record.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
                <td colSpan="3"><strong>QUARTER TOTAL</strong></td>
                <td style={{ fontWeight: 'bold', color: '#f6ad55' }}>
                  {formatCurrency(quarter.totalVAT)}
                </td>
                <td colSpan="3">
                  <span style={{ color: '#48bb78', marginRight: '15px' }}>
                    Paid: {formatCurrency(quarter.totalPaid)}
                  </span>
                  <span style={{ color: '#fc8181' }}>
                    Pending: {formatCurrency(quarter.totalPending)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {quarterlySummary.length === 0 && (
        <div className="empty-state">
          <h3>No VAT Records Yet</h3>
          <p>VAT records will appear here when you add projects and receive payments</p>
        </div>
      )}
    </div>
  );
}

export default VATTracking;
