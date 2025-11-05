import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function CompanyExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: ''
  });

  const categories = [
    'Car Rental',
    'Accounting',
    'Meals',
    'Owner Withdrawal',
    'Phone Bill',
    'Labour Visa',
    'Renewal Fees',
    'Miscellaneous'
  ];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await ipcRenderer.invoke('get-all-company-expenses');
      setExpenses(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await ipcRenderer.invoke('update-company-expense', editingExpense.id, formData);
      } else {
        await ipcRenderer.invoke('add-company-expense', formData);
      }
      setShowModal(false);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await ipcRenderer.invoke('delete-company-expense', id);
        loadExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: ''
    });
    setEditingExpense(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  };

  if (loading) {
    return <div className="loading">Loading expenses...</div>;
  }

  return (
    <div className="company-expenses">
      <div className="page-header">
        <h1>Company Expenses</h1>
        <p>Track all company-related expenses including car rental, accounting, meals, etc.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card danger">
          <div className="stat-label">Total Company Expenses</div>
          <h2 className="stat-value">
            {formatCurrency(getTotalExpenses())} <span style={{fontSize: '16px', color: '#718096'}}>AED</span>
          </h2>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Add New Expense
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Expense Records</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount (AED)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                  No expenses recorded yet. Add your first expense!
                </td>
              </tr>
            ) : (
              <>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.date).toLocaleDateString('en-AE')}</td>
                    <td>
                      <span className="badge badge-info">{expense.category}</span>
                    </td>
                    <td>{expense.description || '-'}</td>
                    <td style={{ textAlign: 'right', color: '#fc8181', fontWeight: 'bold' }}>
                      {formatCurrency(expense.amount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(expense)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(expense.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
                  <td colSpan="3"><strong>TOTAL</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#fc8181', fontSize: '16px' }}>
                      {formatCurrency(getTotalExpenses())}
                    </strong>
                  </td>
                  <td></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Expense Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  placeholder="Optional notes about this expense"
                />
              </div>
              <div className="form-group">
                <label>Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyExpenses;
