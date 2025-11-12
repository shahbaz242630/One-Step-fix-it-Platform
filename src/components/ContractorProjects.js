import React, { useState, useEffect, useRef } from 'react';

const { ipcRenderer } = window.require('electron');

function ContractorProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Payment tracking states
  const [showClientPaymentModal, setShowClientPaymentModal] = useState(false);
  const [showContractorPaymentModal, setShowContractorPaymentModal] = useState(false);
  const [selectedProjectForPayment, setSelectedProjectForPayment] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingProject, setCompletingProject] = useState(null);

  // Refs for input focus
  const clientPaymentInputRef = useRef(null);
  const contractorPaymentInputRef = useRef(null);
  const projectClientNameInputRef = useRef(null);

  const [formData, setFormData] = useState({
    client_name: '',
    address: '',
    project_details: '',
    start_date: new Date().toISOString().split('T')[0], // Default to today
    total_charged_with_vat: '',
    contractor_name: '',
    contractor_price: '',
    advance_paid: '',
    status: 'active'
  });

  const [clientPaymentData, setClientPaymentData] = useState({
    amount: '',
    description: ''
  });

  const [contractorPaymentData, setContractorPaymentData] = useState({
    amount: '',
    description: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  // Focus inputs when modals open (increased delay for first-time modal render)
  useEffect(() => {
    if (showModal && projectClientNameInputRef.current) {
      setTimeout(() => {
        projectClientNameInputRef.current?.focus();
        projectClientNameInputRef.current?.select();
      }, 250);
    }
  }, [showModal]);

  useEffect(() => {
    if (showClientPaymentModal && clientPaymentInputRef.current) {
      setTimeout(() => {
        clientPaymentInputRef.current?.focus();
        clientPaymentInputRef.current?.select();
      }, 250);
    }
  }, [showClientPaymentModal]);

  useEffect(() => {
    if (showContractorPaymentModal && contractorPaymentInputRef.current) {
      setTimeout(() => {
        contractorPaymentInputRef.current?.focus();
        contractorPaymentInputRef.current?.select();
      }, 250);
    }
  }, [showContractorPaymentModal]);

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

    // Validate required fields
    if (!formData.client_name || !formData.total_charged_with_vat || !formData.contractor_name || !formData.contractor_price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingProject) {
        await ipcRenderer.invoke('update-contractor-project', editingProject.id, formData);
      } else {
        await ipcRenderer.invoke('add-contractor-project', formData);
      }

      setShowModal(false);
      resetForm();
      loadProjects();
      alert('Contractor project added successfully!');
    } catch (error) {
      console.error('Error saving contractor project:', error);
      alert('Error saving contractor project: ' + error.message);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      client_name: project.client_name,
      address: project.address,
      project_details: project.project_details,
      start_date: project.start_date || new Date().toISOString().split('T')[0],
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

  const handleOpenClientPayment = (project) => {
    setSelectedProjectForPayment(project);
    setClientPaymentData({ amount: '', description: '' });
    setShowClientPaymentModal(true);
  };

  const handleOpenContractorPayment = (project) => {
    setSelectedProjectForPayment(project);
    setContractorPaymentData({ amount: '', description: '' });
    setShowContractorPaymentModal(true);
  };

  const handleAddClientPayment = async (e) => {
    e.preventDefault();
    try {
      await ipcRenderer.invoke('add-client-payment', selectedProjectForPayment.id, parseFloat(clientPaymentData.amount), clientPaymentData.description);
      setShowClientPaymentModal(false);
      setClientPaymentData({ amount: '', description: '' });
      loadProjects();
      alert('Client payment recorded successfully!');
    } catch (error) {
      console.error('Error adding client payment:', error);
      alert('Error recording payment');
    }
  };

  const handleAddContractorPayment = async (e) => {
    e.preventDefault();
    try {
      await ipcRenderer.invoke('add-contractor-payment', selectedProjectForPayment.id, parseFloat(contractorPaymentData.amount), contractorPaymentData.description);
      setShowContractorPaymentModal(false);
      setContractorPaymentData({ amount: '', description: '' });
      loadProjects();
      alert('Contractor payment recorded successfully!');
    } catch (error) {
      console.error('Error adding contractor payment:', error);
      alert('Error recording payment');
    }
  };

  const handleCompleteProject = (project) => {
    setCompletingProject(project);
    setShowCompleteModal(true);
  };

  const confirmCompleteProject = async () => {
    const project = completingProject;

    // Calculate balances
    const clientBalance = project.total_charged_with_vat - (project.client_paid_total || 0);
    const contractorBalance = project.contractor_price - (project.contractor_paid_total || 0);

    // Check if all payments settled
    if (clientBalance > 0.01) {
      alert(`Cannot complete project: Client still owes ${formatCurrency(clientBalance)} AED`);
      return;
    }

    if (contractorBalance > 0.01) {
      alert(`Cannot complete project: Contractor still owed ${formatCurrency(contractorBalance)} AED`);
      return;
    }

    // All checks passed, complete the project
    try {
      await ipcRenderer.invoke('update-contractor-project', project.id, {
        ...project,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      setShowCompleteModal(false);
      setCompletingProject(null);
      loadProjects();
      alert('Project completed successfully!');
    } catch (error) {
      console.error('Error completing project:', error);
      alert('Error completing project');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      address: '',
      project_details: '',
      start_date: new Date().toISOString().split('T')[0],
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
                <th>Total Charged (VAT incl)</th>
                <th>Client Paid</th>
                <th>Client Balance</th>
                <th>Contractor Price</th>
                <th>Paid to Contractor</th>
                <th>Contractor Balance</th>
                <th>Company Profit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                    No contractor projects yet. Add your first one!
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const clientPaid = project.client_paid_total || 0;
                  const contractorPaid = project.contractor_paid_total || 0;
                  const clientBalance = project.total_charged_with_vat - clientPaid;
                  const contractorBalance = project.contractor_price - contractorPaid;

                  return (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.client_name}</strong>
                        <div style={{ fontSize: '12px', color: '#718096' }}>{project.contractor_name}</div>
                      </td>
                      <td>{formatCurrency(project.total_charged_with_vat)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: '#4299e1', fontWeight: 'bold' }}>{formatCurrency(clientPaid)}</span>
                          {project.status === 'active' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '2px 8px', fontSize: '16px' }}
                              onClick={() => handleOpenClientPayment(project)}
                              title="Add client payment"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ color: clientBalance > 0 ? '#fc8181' : '#48bb78', fontWeight: 'bold' }}>
                        {formatCurrency(clientBalance)}
                      </td>
                      <td style={{ color: '#fc8181' }}>{formatCurrency(project.contractor_price)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: '#f6ad55', fontWeight: 'bold' }}>{formatCurrency(contractorPaid)}</span>
                          {project.status === 'active' && (
                            <button
                              className="btn btn-warning"
                              style={{ padding: '2px 8px', fontSize: '16px' }}
                              onClick={() => handleOpenContractorPayment(project)}
                              title="Add contractor payment"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ color: contractorBalance > 0 ? '#fc8181' : '#48bb78', fontWeight: 'bold' }}>
                        {formatCurrency(contractorBalance)}
                      </td>
                      <td style={{ color: project.company_profit >= 0 ? '#48bb78' : '#fc8181', fontWeight: 'bold' }}>
                        {formatCurrency(project.company_profit)}
                      </td>
                      <td>
                        <span className={`badge ${project.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
                          {project.status}
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
                  );
                })
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
                  ref={projectClientNameInputRef}
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  autoComplete="off"
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

      {/* Client Payment Modal */}
      {showClientPaymentModal && selectedProjectForPayment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Add Client Payment</h2>
              <button className="modal-close" onClick={() => { setShowClientPaymentModal(false); setClientPaymentData({ amount: '', description: '' }); }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddClientPayment}>
              <div style={{ padding: '20px 0' }}>
                <div style={{ backgroundColor: '#ebf8ff', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#2c5282' }}>
                    <strong>Project:</strong> {selectedProjectForPayment.client_name}
                  </p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#2c5282' }}>
                    <strong>Total Charged:</strong> {formatCurrency(selectedProjectForPayment.total_charged_with_vat)} AED
                  </p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#2c5282' }}>
                    <strong>Paid So Far:</strong> {formatCurrency(selectedProjectForPayment.client_paid_total || 0)} AED
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#c53030' }}>
                    <strong>Balance Remaining:</strong> {formatCurrency(selectedProjectForPayment.total_charged_with_vat - (selectedProjectForPayment.client_paid_total || 0))} AED
                  </p>
                </div>

                <div className="form-group">
                  <label>Payment Amount (AED) *</label>
                  <input
                    ref={clientPaymentInputRef}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={clientPaymentData.amount}
                    onChange={(e) => setClientPaymentData({ ...clientPaymentData, amount: e.target.value })}
                    placeholder="e.g., 50000"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={clientPaymentData.description}
                    onChange={(e) => setClientPaymentData({ ...clientPaymentData, description: e.target.value })}
                    rows="2"
                    placeholder="e.g., Second installment payment"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowClientPaymentModal(false); setClientPaymentData({ amount: '', description: '' }); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contractor Payment Modal */}
      {showContractorPaymentModal && selectedProjectForPayment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Add Contractor Payment</h2>
              <button className="modal-close" onClick={() => { setShowContractorPaymentModal(false); setContractorPaymentData({ amount: '', description: '' }); }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddContractorPayment}>
              <div style={{ padding: '20px 0' }}>
                <div style={{ backgroundColor: '#fffaf0', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#744210' }}>
                    <strong>Contractor:</strong> {selectedProjectForPayment.contractor_name}
                  </p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#744210' }}>
                    <strong>Agreed Price:</strong> {formatCurrency(selectedProjectForPayment.contractor_price)} AED
                  </p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#744210' }}>
                    <strong>Paid So Far:</strong> {formatCurrency(selectedProjectForPayment.contractor_paid_total || 0)} AED
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#c53030' }}>
                    <strong>Balance Owed:</strong> {formatCurrency(selectedProjectForPayment.contractor_price - (selectedProjectForPayment.contractor_paid_total || 0))} AED
                  </p>
                </div>

                <div className="form-group">
                  <label>Payment Amount (AED) *</label>
                  <input
                    ref={contractorPaymentInputRef}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={contractorPaymentData.amount}
                    onChange={(e) => setContractorPaymentData({ ...contractorPaymentData, amount: e.target.value })}
                    placeholder="e.g., 50000"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={contractorPaymentData.description}
                    onChange={(e) => setContractorPaymentData({ ...contractorPaymentData, description: e.target.value })}
                    rows="2"
                    placeholder="e.g., First installment to contractor"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowContractorPaymentModal(false); setContractorPaymentData({ amount: '', description: '' }); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Checklist Modal */}
      {showCompleteModal && completingProject && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Complete Project - Settlement Check</h2>
              <button className="modal-close" onClick={() => { setShowCompleteModal(false); setCompletingProject(null); }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ marginBottom: '20px', color: '#4a5568' }}>
                Before completing this project, verify that all payments have been settled:
              </p>

              {(() => {
                const clientBalance = completingProject.total_charged_with_vat - (completingProject.client_paid_total || 0);
                const contractorBalance = completingProject.contractor_price - (completingProject.contractor_paid_total || 0);
                const clientPaid = clientBalance <= 0.01;
                const contractorPaid = contractorBalance <= 0.01;

                return (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ padding: '15px', backgroundColor: clientPaid ? '#f0fdf4' : '#fff5f5', borderRadius: '6px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontSize: '24px' }}>{clientPaid ? '✅' : '❌'}</div>
                          <div style={{ flex: 1 }}>
                            <strong>Client Payment Status</strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#718096' }}>
                              Total: {formatCurrency(completingProject.total_charged_with_vat)} AED<br />
                              Paid: {formatCurrency(completingProject.client_paid_total || 0)} AED<br />
                              <span style={{ color: clientPaid ? '#48bb78' : '#fc8181', fontWeight: 'bold' }}>
                                Balance: {formatCurrency(clientBalance)} AED
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '15px', backgroundColor: contractorPaid ? '#f0fdf4' : '#fff5f5', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontSize: '24px' }}>{contractorPaid ? '✅' : '❌'}</div>
                          <div style={{ flex: 1 }}>
                            <strong>Contractor Payment Status</strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#718096' }}>
                              Total: {formatCurrency(completingProject.contractor_price)} AED<br />
                              Paid: {formatCurrency(completingProject.contractor_paid_total || 0)} AED<br />
                              <span style={{ color: contractorPaid ? '#48bb78' : '#fc8181', fontWeight: 'bold' }}>
                                Balance: {formatCurrency(contractorBalance)} AED
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(!clientPaid || !contractorPaid) && (
                      <div style={{ padding: '15px', backgroundColor: '#fff5f5', border: '1px solid #fc8181', borderRadius: '6px', marginTop: '20px' }}>
                        <strong style={{ color: '#c53030' }}>⚠️ Cannot Complete Project</strong>
                        <p style={{ margin: '10px 0 0 0', color: '#4a5568', fontSize: '14px' }}>
                          All payments must be fully settled before completing the project. Use the "+" buttons in the table to record remaining payments.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCompleteModal(false); setCompletingProject(null); }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={confirmCompleteProject}
              >
                ✓ Complete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractorProjects;
