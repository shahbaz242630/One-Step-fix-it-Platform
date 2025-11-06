import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function VATTracking() {
  const [quarterlySummary, setQuarterlySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuarter, setEditingQuarter] = useState(null);
  const [inputVATForm, setInputVATForm] = useState({
    input_vat: '',
    notes: ''
  });

  useEffect(() => {
    loadQuarterlySummary();
  }, []);

  const loadQuarterlySummary = async () => {
    try {
      const data = await ipcRenderer.invoke('get-quarterly-vat-summary');
      setQuarterlySummary(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quarterly VAT summary:', error);
      setLoading(false);
    }
  };

  const handleEditInputVAT = (quarter) => {
    setEditingQuarter(quarter);
    setInputVATForm({
      input_vat: quarter.input_vat || '',
      notes: quarter.notes || ''
    });
  };

  const handleSaveInputVAT = async () => {
    if (!editingQuarter) return;

    try {
      await ipcRenderer.invoke(
        'update-input-vat',
        editingQuarter.quarter,
        editingQuarter.year,
        parseFloat(inputVATForm.input_vat) || 0,
        inputVATForm.notes
      );
      setEditingQuarter(null);
      setInputVATForm({ input_vat: '', notes: '' });
      loadQuarterlySummary();
    } catch (error) {
      console.error('Error updating input VAT:', error);
      alert('Error updating Input VAT');
    }
  };

  const handleMarkQuarterPaid = async (quarter, year, isPaid) => {
    const action = isPaid ? 'unpaid' : 'paid';
    if (!window.confirm(`Mark ${quarter} ${year} as ${action}?`)) return;

    try {
      await ipcRenderer.invoke('mark-quarter-vat-paid', quarter, year, !isPaid);
      loadQuarterlySummary();
    } catch (error) {
      console.error('Error marking quarter paid:', error);
      alert('Error updating payment status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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

  const currentQuarter = getCurrentQuarter();
  const currentYear = getCurrentYear();

  if (loading) {
    return <div className="loading">Loading VAT records...</div>;
  }

  return (
    <div className="vat-tracking">
      <div className="page-header">
        <h1>VAT Tracking (Output VAT - Input VAT)</h1>
        <p>Quarterly VAT submissions - Track VAT collected, VAT paid on purchases, and net amount payable to government</p>
      </div>

      {/* Info Box */}
      <div style={{
        backgroundColor: '#ebf8ff',
        border: '1px solid #90cdf4',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: '#2c5282' }}>How VAT Calculation Works:</h3>
        <ul style={{ marginBottom: 0, color: '#2d3748' }}>
          <li><strong>Output VAT</strong>: VAT collected from your clients (automatically calculated from projects)</li>
          <li><strong>Input VAT</strong>: VAT you paid on purchases/materials (enter this from your receipts)</li>
          <li><strong>Net Payable to Government</strong>: Output VAT - Input VAT</li>
        </ul>
        <p style={{ marginTop: '15px', marginBottom: 0, fontSize: '14px', color: '#4a5568' }}>
          💡 <strong>Example</strong>: If you collected 5,000 AED VAT from clients, but paid 2,000 AED VAT on materials, you only owe the government 3,000 AED (5,000 - 2,000)
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        {quarterlySummary.slice(0, 4).map((quarter) => {
          const isCurrent = quarter.quarter === currentQuarter && quarter.year === currentYear;
          return (
            <div
              key={`${quarter.year}-${quarter.quarter}`}
              className={`stat-card ${isCurrent ? 'warning' : quarter.is_paid ? 'success' : 'info'}`}
            >
              <div className="stat-label">
                {quarter.quarter} {quarter.year} {isCurrent && '(Current)'}
              </div>
              <h2 className="stat-value">
                {formatCurrency(quarter.net_payable)} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
              </h2>
              <p style={{fontSize: '13px', color: '#718096', marginTop: '8px'}}>
                Net Payable {quarter.is_paid && '(Paid ✓)'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quarterly Tables */}
      {quarterlySummary.map((quarter) => {
        const isCurrent = quarter.quarter === currentQuarter && quarter.year === currentYear;

        return (
          <div key={`${quarter.year}-${quarter.quarter}`} className="table-container" style={{ marginBottom: '30px' }}>
            <div className="table-header">
              <h2>
                {quarter.quarter} {quarter.year}
                {isCurrent && (
                  <span className="badge badge-warning" style={{ marginLeft: '10px' }}>Current Quarter</span>
                )}
                {quarter.is_paid && (
                  <span className="badge badge-success" style={{ marginLeft: '10px' }}>✓ Paid to Government</span>
                )}
              </h2>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Description</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Amount (AED)</th>
                  <th style={{ width: '40%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: '#fff5f5' }}>
                  <td>
                    <strong>Output VAT (Collected from Clients)</strong>
                    <p style={{ fontSize: '13px', color: '#718096', margin: '5px 0 0 0' }}>
                      Automatically calculated from project payments
                    </p>
                  </td>
                  <td style={{ textAlign: 'right', color: '#fc8181', fontWeight: 'bold', fontSize: '16px' }}>
                    {formatCurrency(quarter.output_vat)}
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#718096' }}>Auto-calculated</span>
                  </td>
                </tr>

                <tr style={{ backgroundColor: '#f0fdf4' }}>
                  <td>
                    <strong>Input VAT (Paid on Purchases)</strong>
                    <p style={{ fontSize: '13px', color: '#718096', margin: '5px 0 0 0' }}>
                      VAT you paid on materials, supplies, contractor services, etc.
                    </p>
                  </td>
                  <td style={{ textAlign: 'right', color: '#48bb78', fontWeight: 'bold', fontSize: '16px' }}>
                    - {formatCurrency(quarter.input_vat)}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleEditInputVAT(quarter)}
                      disabled={quarter.is_paid}
                    >
                      {quarter.input_vat > 0 ? '✏️ Edit Input VAT' : '➕ Add Input VAT'}
                    </button>
                  </td>
                </tr>

                <tr style={{ borderTop: '3px solid #2d3748', backgroundColor: '#edf2f7' }}>
                  <td>
                    <strong style={{ fontSize: '16px' }}>NET PAYABLE TO GOVERNMENT</strong>
                    <p style={{ fontSize: '13px', color: '#718096', margin: '5px 0 0 0' }}>
                      This is the amount you actually pay to FTA
                    </p>
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: quarter.net_payable >= 0 ? '#2d3748' : '#48bb78'
                  }}>
                    {formatCurrency(quarter.net_payable)}
                  </td>
                  <td>
                    {!quarter.is_paid ? (
                      <button
                        className="btn btn-success btn-small"
                        onClick={() => handleMarkQuarterPaid(quarter.quarter, quarter.year, quarter.is_paid)}
                      >
                        ✓ Mark as Paid to Gov
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleMarkQuarterPaid(quarter.quarter, quarter.year, quarter.is_paid)}
                      >
                        Mark as Unpaid
                      </button>
                    )}
                  </td>
                </tr>

                {quarter.notes && (
                  <tr style={{ backgroundColor: '#fffaf0' }}>
                    <td colSpan="3">
                      <strong>Notes:</strong> {quarter.notes}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}

      {quarterlySummary.length === 0 && (
        <div className="empty-state">
          <h3>No VAT Records Yet</h3>
          <p>VAT records will automatically appear here when you:</p>
          <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '20px auto', lineHeight: '1.8' }}>
            <li>Add a Regular Project or Contractor Project</li>
            <li>Enter an "Advance Paid" amount (client deposit)</li>
            <li>Save the project</li>
          </ul>
          <p style={{ marginTop: '20px', color: '#4a5568', fontSize: '14px' }}>
            💡 The system will automatically calculate the VAT from the payment amount and organize it by quarter.
            You can then add Input VAT (VAT you paid on purchases) to calculate the net amount payable to the government.
          </p>
        </div>
      )}

      {/* Input VAT Modal */}
      {editingQuarter && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Edit Input VAT - {editingQuarter.quarter} {editingQuarter.year}</h2>
              <button className="modal-close" onClick={() => {
                setEditingQuarter(null);
                setInputVATForm({ input_vat: '', notes: '' });
              }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 0' }}>
              <div style={{
                backgroundColor: '#ebf8ff',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#2c5282' }}>
                  <strong>Output VAT (Collected):</strong> {formatCurrency(editingQuarter.output_vat)} AED
                </p>
              </div>

              <div className="form-group">
                <label>Input VAT Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={inputVATForm.input_vat}
                  onChange={(e) => setInputVATForm({ ...inputVATForm, input_vat: e.target.value })}
                  placeholder="e.g., 2000.00"
                  required
                />
                <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px' }}>
                  Enter the total VAT you paid on purchases this quarter
                </p>
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={inputVATForm.notes}
                  onChange={(e) => setInputVATForm({ ...inputVATForm, notes: e.target.value })}
                  rows="3"
                  placeholder="e.g., Material purchases from ABC Supplier, Equipment rental VAT"
                />
              </div>

              {inputVATForm.input_vat && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '15px',
                  borderRadius: '6px',
                  marginTop: '20px'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#22543d' }}>
                    <strong>Net Payable to Government:</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#22543d' }}>
                    {formatCurrency(editingQuarter.output_vat - (parseFloat(inputVATForm.input_vat) || 0))} AED
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingQuarter(null);
                  setInputVATForm({ input_vat: '', notes: '' });
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveInputVAT}
              >
                Save Input VAT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VATTracking;
