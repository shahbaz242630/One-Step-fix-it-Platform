import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

function ContractorProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [formData, setFormData] = useState({
    client_name: '',
    address: '',
    project_details: '',
    total_charged_with_vat: '',
    contractor_name: '',
    contractor_price: '',
    advance_paid: '',
    status: 'active'
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await ipcRenderer.invoke('get-all-contractor-projects');
      setProjects(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contractor projects:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await ipcRenderer.invoke('update-contractor-project', editingProject.id, formData);
      } else {
        await ipcRenderer.invoke('add-contractor-project', formData);
      }
      setShowModal(false);
      resetForm();
      loadProjects();
    } catch (error) {
      console.error('Error saving contractor project:', error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      client_name: project.client_name,
      address: project.address,
      project_details: project.project_details,
      total_charged_with_vat: project.total_charged_with_vat,
      contractor_name: project.contractor_name,
      contractor_price: project.contractor_price,
      advance_paid: project.advance_paid,
      status: project.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contractor project?')) {
      try {
        await ipcRenderer.invoke('delete-contractor-project', id);
        loadProjects();
      } catch (error) {
        console.error('Error deleting contractor project:', error);
      }
    }
  };

  const handleCompleteProject = async (project) => {
    if (window.confirm('Mark this project as completed?')) {
      try {
        await ipcRenderer.invoke('update-contractor-project', project.id, {
          ...project,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
        loadProjects();
      } catch (error) {
        console.error('Error completing project:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      address: '',
      project_details: '',
      total_charged_with_vat: '',
      contractor_name: '',
      contractor_price: '',
      advance_paid: '',
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

  if (loading) {
    return <div className="loading">Loading contractor projects...</div>;
  }

  return (
    <div className="contractor-projects">
      <div className="page-header">
        <h1>Contractor Projects</h1>
        <p>Projects delegated to contracting companies (No PM share)</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Add New Contractor Project
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
                <th>Total Charged (with VAT)</th>
                <th>VAT (5%)</th>
                <th>Value (excl VAT)</th>
                <th>Contractor Name</th>
                <th>Contractor Price</th>
                <th>Advance Paid</th>
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
                  <td colSpan="14" style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                    No contractor projects yet. Add your first one!
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
                    <td>{formatCurrency(project.total_charged_with_vat)}</td>
                    <td style={{ color: '#f6ad55' }}>{formatCurrency(project.vat_amount)}</td>
                    <td>{formatCurrency(project.value_excl_vat)}</td>
                    <td><strong>{project.contractor_name}</strong></td>
                    <td style={{ color: '#fc8181' }}>{formatCurrency(project.contractor_price)}</td>
                    <td style={{ color: '#4299e1' }}>{formatCurrency(project.advance_paid)}</td>
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
              <h2>{editingProject ? 'Edit Contractor Project' : 'Add New Contractor Project'}</h2>
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
              <div className="form-grid">
                <div className="form-group">
                  <label>Total Charged to Client (with VAT) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_charged_with_vat}
                    onChange={(e) => setFormData({ ...formData, total_charged_with_vat: e.target.value })}
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
              <div className="form-grid">
                <div className="form-group">
                  <label>Contractor Name *</label>
                  <input
                    type="text"
                    value={formData.contractor_name}
                    onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contractor Price (agreed) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.contractor_price}
                    onChange={(e) => setFormData({ ...formData, contractor_price: e.target.value })}
                    required
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
    </div>
  );
}

export default ContractorProjects;
