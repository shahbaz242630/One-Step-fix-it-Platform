import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function RegularProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingProject, setCompletingProject] = useState(null);
  const [numPMs, setNumPMs] = useState(0);

  const [formData, setFormData] = useState({
    client_name: '',
    address: '',
    project_details: '',
    start_date: new Date().toISOString().split('T')[0], // Default to today
    total_value_with_vat: '',
    advance_paid: '',
    num_project_managers: 0,
    status: 'active'
  });

  const [expenseData, setExpenseData] = useState({
    amount: '',
    description: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await ipcRenderer.invoke('get-all-projects');
      setProjects(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading projects:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.client_name || !formData.total_value_with_vat) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      console.log('Submitting project data:', formData);

      if (editingProject) {
        await ipcRenderer.invoke('update-project', editingProject.id, formData);
      } else {
        await ipcRenderer.invoke('add-project', formData);
      }

      setShowModal(false);
      resetForm();
      loadProjects();
      alert('Project added successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project: ' + error.message);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await ipcRenderer.invoke('add-project-expense', selectedProjectId, parseFloat(expenseData.amount), expenseData.description);
      setShowExpenseModal(false);
      setExpenseData({ amount: '', description: '' });
      loadProjects();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      client_name: project.client_name,
      address: project.address,
      project_details: project.project_details,
      start_date: project.start_date || new Date().toISOString().split('T')[0],
      total_value_with_vat: project.total_value_with_vat,
      advance_paid: project.advance_paid,
      num_project_managers: project.num_project_managers,
      status: project.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await ipcRenderer.invoke('delete-project', id);
        loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleCompleteProject = (project) => {
    setCompletingProject(project);
    setNumPMs(0);
    setShowCompleteModal(true);
  };

  const confirmCompleteProject = async () => {
    try {
      await ipcRenderer.invoke('update-project', completingProject.id, {
        ...completingProject,
        status: 'completed',
        completed_at: new Date().toISOString(),
        num_project_managers: numPMs
      });
      setShowCompleteModal(false);
      setCompletingProject(null);
      loadProjects();
      alert('Project completed! PM payments will appear in Partners tab if applicable.');
    } catch (error) {
      console.error('Error completing project:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      address: '',
      project_details: '',
      start_date: new Date().toISOString().split('T')[0],
      total_value_with_vat: '',
      advance_paid: '',
      num_project_managers: 0,
      status: 'active'
    });
    setEditingProject(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const openExpenseModal = (projectId) => {
    setSelectedProjectId(projectId);
    setShowExpenseModal(true);
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div className="regular-projects">
      <div className="page-header">
        <h1>Regular Projects</h1>
        <p>Manage your client projects with automatic VAT and profit calculations</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Add New Project
        </button>
      </div>

      <div className="table-container">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Address</th>
                <th>Project Details</th>
                <th>Total Value (with VAT)</th>
                <th>VAT (5%)</th>
                <th>Project Value</th>
                <th>Advance Paid</th>
                <th>Expenses</th>
                <th>Balance Due</th>
                <th>Company Profit</th>
                <th>Status</th>
                <th>VAT Collected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                    No projects yet. Add your first project!
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id}>
                    <td><strong>{project.client_name}</strong></td>
                    <td>{project.address}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project.project_details}
                    </td>
                    <td>{formatCurrency(project.total_value_with_vat)}</td>
                    <td style={{ color: '#f6ad55' }}>{formatCurrency(project.vat_amount)}</td>
                    <td>{formatCurrency(project.project_value)}</td>
                    <td style={{ color: '#4299e1' }}>{formatCurrency(project.advance_paid)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{formatCurrency(project.total_expenses)}</span>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => openExpenseModal(project.id)}
                          title="Add Expense"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>{formatCurrency(project.balance_due)}</td>
                    <td style={{ color: project.company_profit >= 0 ? '#48bb78' : '#fc8181', fontWeight: 'bold' }}>
                      {formatCurrency(project.company_profit)}
                    </td>
                    <td>
                      <span className={`badge ${project.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
                        {project.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${project.vat_collected ? 'badge-success' : 'badge-warning'}`}>
                        {project.vat_collected ? 'Yes' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(project)}
                        >
                          Edit
                        </button>
                        {project.status === 'active' && (
                          <button
                            className="btn btn-success btn-small"
                            onClick={() => handleCompleteProject(project)}
                          >
                            Complete
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(project.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Project Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingProject ? 'Edit Project' : 'Add New Project'}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Project Details</label>
                <textarea
                  value={formData.project_details}
                  onChange={(e) => setFormData({ ...formData, project_details: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
                <p style={{ fontSize: '13px', color: '#718096', marginTop: '5px' }}>
                  The date when this project started
                </p>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Total Value (with VAT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_value_with_vat}
                    onChange={(e) => setFormData({ ...formData, total_value_with_vat: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Advance Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.advance_paid}
                    onChange={(e) => setFormData({ ...formData, advance_paid: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? 'Update Project' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Add Expense</h2>
              <button className="modal-close" onClick={() => { setShowExpenseModal(false); setExpenseData({ amount: '', description: '' }); }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  rows="2"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowExpenseModal(false); setExpenseData({ amount: '', description: '' }); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Project Modal */}
      {showCompleteModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Complete Project</h2>
              <button className="modal-close" onClick={() => { setShowCompleteModal(false); setCompletingProject(null); }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ marginBottom: '20px', color: '#4a5568' }}>
                How many project managers worked on this project?
              </p>
              <div className="form-group">
                <label>Number of Project Managers</label>
                <select
                  value={numPMs}
                  onChange={(e) => setNumPMs(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                >
                  <option value={0}>0 - No Project Managers (Company gets 100%)</option>
                  <option value={1}>1 - Project Manager (50% to PM, 50% to Company)</option>
                  <option value={2}>2 - Project Managers (25% each PM, 50% to Company)</option>
                </select>
              </div>
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f7fafc', borderRadius: '6px' }}>
                <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
                  <strong>Note:</strong> PM payments will be generated automatically and appear in the Partners tab.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCompleteModal(false); setCompletingProject(null); }}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={confirmCompleteProject}>
                ✓ Complete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegularProjects;
