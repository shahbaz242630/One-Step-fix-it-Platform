import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Import components
import Dashboard from './components/Dashboard';
import RegularProjects from './components/RegularProjects';
import CompanyExpenses from './components/CompanyExpenses';
import ContractorProjects from './components/ContractorProjects';
import VATTracking from './components/VATTracking';
import PartnersTab from './components/PartnersTab';
import FinancialSummary from './components/FinancialSummary';
import Settings from './components/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <h2>Financial Manager</h2>
          </div>
          <ul className="nav-links">
            <li className={activeTab === 'dashboard' ? 'active' : ''}>
              <Link to="/" onClick={() => setActiveTab('dashboard')}>
                📊 Dashboard
              </Link>
            </li>
            <li className={activeTab === 'projects' ? 'active' : ''}>
              <Link to="/projects" onClick={() => setActiveTab('projects')}>
                📁 Regular Projects
              </Link>
            </li>
            <li className={activeTab === 'contractors' ? 'active' : ''}>
              <Link to="/contractors" onClick={() => setActiveTab('contractors')}>
                🏗️ Contractor Projects
              </Link>
            </li>
            <li className={activeTab === 'expenses' ? 'active' : ''}>
              <Link to="/expenses" onClick={() => setActiveTab('expenses')}>
                💰 Company Expenses
              </Link>
            </li>
            <li className={activeTab === 'vat' ? 'active' : ''}>
              <Link to="/vat" onClick={() => setActiveTab('vat')}>
                📋 VAT Tracking
              </Link>
            </li>
            <li className={activeTab === 'partners' ? 'active' : ''}>
              <Link to="/partners" onClick={() => setActiveTab('partners')}>
                🤝 Partners (PM Payments)
              </Link>
            </li>
            <li className={activeTab === 'summary' ? 'active' : ''}>
              <Link to="/summary" onClick={() => setActiveTab('summary')}>
                📈 Financial Summary
              </Link>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''}>
              <Link to="/settings" onClick={() => setActiveTab('settings')}>
                ⚙️ Settings
              </Link>
            </li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<RegularProjects />} />
            <Route path="/contractors" element={<ContractorProjects />} />
            <Route path="/expenses" element={<CompanyExpenses />} />
            <Route path="/vat" element={<VATTracking />} />
            <Route path="/partners" element={<PartnersTab />} />
            <Route path="/summary" element={<FinancialSummary />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
