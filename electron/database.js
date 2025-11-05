const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'financial_data.db');
const db = new Database(dbPath);

// Initialize database with tables
function initializeDatabase() {
  // Regular Projects Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      address TEXT,
      project_details TEXT,
      total_value_with_vat REAL NOT NULL,
      vat_amount REAL NOT NULL,
      project_value REAL NOT NULL,
      advance_paid REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      company_profit REAL NOT NULL,
      num_project_managers INTEGER DEFAULT 0,
      pm_payment_due REAL DEFAULT 0,
      vat_collected BOOLEAN DEFAULT 0,
      profit_loss TEXT DEFAULT 'Profit',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  // Project Expenses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Company Expenses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Contractor Projects Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contractor_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      address TEXT,
      project_details TEXT,
      total_charged_with_vat REAL NOT NULL,
      vat_amount REAL NOT NULL,
      value_excl_vat REAL NOT NULL,
      contractor_name TEXT NOT NULL,
      contractor_price REAL NOT NULL,
      advance_paid REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      company_profit REAL NOT NULL,
      vat_collected BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  // PM Payments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pm_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      project_profit REAL NOT NULL,
      num_pms INTEGER NOT NULL,
      pm1_payment REAL NOT NULL,
      pm2_payment REAL DEFAULT 0,
      is_paid BOOLEAN DEFAULT 0,
      date_paid TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // VAT Records Table (tracks VAT by payment)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vat_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      project_type TEXT NOT NULL,
      client_name TEXT NOT NULL,
      payment_amount REAL NOT NULL,
      vat_amount REAL NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL,
      is_paid BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully at:', dbPath);
}

// ========== PROJECTS ==========

function getAllProjects() {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();

  // Get expenses for each project
  projects.forEach(project => {
    const expenses = db.prepare('SELECT * FROM project_expenses WHERE project_id = ?').all(project.id);
    project.expenses = expenses;
    project.total_expenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  });

  return projects;
}

function addProject(project) {
  const {
    client_name,
    address,
    project_details,
    total_value_with_vat,
    advance_paid = 0,
    num_project_managers = 0
  } = project;

  // Calculate VAT (extract 5% from total)
  const vat_amount = total_value_with_vat * (5 / 105);
  const project_value = total_value_with_vat - vat_amount;
  const balance_due = total_value_with_vat - advance_paid;

  const stmt = db.prepare(`
    INSERT INTO projects (
      client_name, address, project_details, total_value_with_vat,
      vat_amount, project_value, advance_paid, balance_due,
      company_profit, num_project_managers, pm_payment_due
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    client_name, address, project_details, total_value_with_vat,
    vat_amount, project_value, advance_paid, balance_due,
    project_value, num_project_managers, 0
  );

  // If advance is paid, create VAT record
  if (advance_paid > 0) {
    const advanceVAT = advance_paid * (5 / 105);
    const { quarter, year } = getQuarterFromDate(new Date());

    db.prepare(`
      INSERT INTO vat_records (project_id, project_type, client_name, payment_amount, vat_amount, quarter, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, 'regular', client_name, advance_paid, advanceVAT, quarter, year);
  }

  return result.lastInsertRowid;
}

function updateProject(id, updates) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return false;

  const {
    total_value_with_vat,
    advance_paid,
    num_project_managers,
    status,
    completed_at
  } = { ...project, ...updates };

  const vat_amount = total_value_with_vat * (5 / 105);
  const project_value = total_value_with_vat - vat_amount;
  const balance_due = total_value_with_vat - advance_paid;

  // Get total expenses
  const expenses = db.prepare('SELECT SUM(amount) as total FROM project_expenses WHERE project_id = ?').get(id);
  const total_expenses = expenses.total || 0;
  const company_profit = project_value - total_expenses;

  // Calculate PM payment
  let pm_payment_due = 0;
  if (status === 'completed' && num_project_managers > 0) {
    pm_payment_due = (company_profit * 0.5) / num_project_managers;
  }

  const stmt = db.prepare(`
    UPDATE projects SET
      total_value_with_vat = ?,
      vat_amount = ?,
      project_value = ?,
      advance_paid = ?,
      balance_due = ?,
      company_profit = ?,
      num_project_managers = ?,
      pm_payment_due = ?,
      status = ?,
      completed_at = ?
    WHERE id = ?
  `);

  stmt.run(
    total_value_with_vat, vat_amount, project_value, advance_paid,
    balance_due, company_profit, num_project_managers, pm_payment_due,
    status, completed_at, id
  );

  // Update VAT records if advance changes
  if (updates.advance_paid !== undefined && updates.advance_paid !== project.advance_paid) {
    const advanceVAT = advance_paid * (5 / 105);
    const { quarter, year } = getQuarterFromDate(new Date());

    // Delete old VAT record for advance
    db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?').run(id, 'regular');

    // Create new one if advance > 0
    if (advance_paid > 0) {
      db.prepare(`
        INSERT INTO vat_records (project_id, project_type, client_name, payment_amount, vat_amount, quarter, year)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, 'regular', project.client_name, advance_paid, advanceVAT, quarter, year);
    }
  }

  // Create PM payment record if project completed
  if (status === 'completed' && project.status !== 'completed' && num_project_managers > 0) {
    const pm1_payment = num_project_managers === 1 ? company_profit * 0.5 : company_profit * 0.25;
    const pm2_payment = num_project_managers === 2 ? company_profit * 0.25 : 0;

    db.prepare(`
      INSERT INTO pm_payments (project_id, client_name, project_profit, num_pms, pm1_payment, pm2_payment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, project.client_name, company_profit, num_project_managers, pm1_payment, pm2_payment);
  }

  return true;
}

function deleteProject(id) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?').run(id, 'regular');
  return true;
}

function addProjectExpense(projectId, amount, description) {
  const stmt = db.prepare(`
    INSERT INTO project_expenses (project_id, amount, description)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(projectId, amount, description);

  // Recalculate project profit
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const expenses = db.prepare('SELECT SUM(amount) as total FROM project_expenses WHERE project_id = ?').get(projectId);
  const total_expenses = expenses.total || 0;
  const company_profit = project.project_value - total_expenses;

  db.prepare('UPDATE projects SET company_profit = ? WHERE id = ?').run(company_profit, projectId);

  return result.lastInsertRowid;
}

// ========== COMPANY EXPENSES ==========

function getAllCompanyExpenses() {
  return db.prepare('SELECT * FROM company_expenses ORDER BY date DESC').all();
}

function addCompanyExpense(expense) {
  const { date, category, description, amount } = expense;
  const stmt = db.prepare(`
    INSERT INTO company_expenses (date, category, description, amount)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(date, category, description, amount).lastInsertRowid;
}

function updateCompanyExpense(id, expense) {
  const { date, category, description, amount } = expense;
  const stmt = db.prepare(`
    UPDATE company_expenses SET date = ?, category = ?, description = ?, amount = ?
    WHERE id = ?
  `);
  stmt.run(date, category, description, amount, id);
  return true;
}

function deleteCompanyExpense(id) {
  db.prepare('DELETE FROM company_expenses WHERE id = ?').run(id);
  return true;
}

// ========== CONTRACTOR PROJECTS ==========

function getAllContractorProjects() {
  return db.prepare('SELECT * FROM contractor_projects ORDER BY created_at DESC').all();
}

function addContractorProject(project) {
  const {
    client_name,
    address,
    project_details,
    total_charged_with_vat,
    contractor_name,
    contractor_price,
    advance_paid = 0
  } = project;

  const vat_amount = total_charged_with_vat * (5 / 105);
  const value_excl_vat = total_charged_with_vat - vat_amount;
  const balance_due = total_charged_with_vat - advance_paid;
  const company_profit = value_excl_vat - contractor_price;

  const stmt = db.prepare(`
    INSERT INTO contractor_projects (
      client_name, address, project_details, total_charged_with_vat,
      vat_amount, value_excl_vat, contractor_name, contractor_price,
      advance_paid, balance_due, company_profit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    client_name, address, project_details, total_charged_with_vat,
    vat_amount, value_excl_vat, contractor_name, contractor_price,
    advance_paid, balance_due, company_profit
  );

  // If advance is paid, create VAT record
  if (advance_paid > 0) {
    const advanceVAT = advance_paid * (5 / 105);
    const { quarter, year } = getQuarterFromDate(new Date());

    db.prepare(`
      INSERT INTO vat_records (project_id, project_type, client_name, payment_amount, vat_amount, quarter, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, 'contractor', client_name, advance_paid, advanceVAT, quarter, year);
  }

  return result.lastInsertRowid;
}

function updateContractorProject(id, updates) {
  const project = db.prepare('SELECT * FROM contractor_projects WHERE id = ?').get(id);
  if (!project) return false;

  const {
    total_charged_with_vat,
    contractor_price,
    advance_paid,
    status,
    completed_at
  } = { ...project, ...updates };

  const vat_amount = total_charged_with_vat * (5 / 105);
  const value_excl_vat = total_charged_with_vat - vat_amount;
  const balance_due = total_charged_with_vat - advance_paid;
  const company_profit = value_excl_vat - contractor_price;

  const stmt = db.prepare(`
    UPDATE contractor_projects SET
      total_charged_with_vat = ?,
      vat_amount = ?,
      value_excl_vat = ?,
      contractor_price = ?,
      advance_paid = ?,
      balance_due = ?,
      company_profit = ?,
      status = ?,
      completed_at = ?
    WHERE id = ?
  `);

  stmt.run(
    total_charged_with_vat, vat_amount, value_excl_vat, contractor_price,
    advance_paid, balance_due, company_profit, status, completed_at, id
  );

  return true;
}

function deleteContractorProject(id) {
  db.prepare('DELETE FROM contractor_projects WHERE id = ?').run(id);
  db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?').run(id, 'contractor');
  return true;
}

// ========== PM PAYMENTS ==========

function getAllPMPayments() {
  return db.prepare('SELECT * FROM pm_payments ORDER BY created_at DESC').all();
}

function updatePMPayment(id, isPaid) {
  const date_paid = isPaid ? new Date().toISOString() : null;
  const stmt = db.prepare('UPDATE pm_payments SET is_paid = ?, date_paid = ? WHERE id = ?');
  stmt.run(isPaid ? 1 : 0, date_paid, id);
  return true;
}

// ========== VAT ==========

function getVATRecords() {
  return db.prepare('SELECT * FROM vat_records ORDER BY year DESC, quarter DESC').all();
}

function updateVATPaid(id, isPaid) {
  const stmt = db.prepare('UPDATE vat_records SET is_paid = ? WHERE id = ?');
  stmt.run(isPaid ? 1 : 0, id);
  return true;
}

// ========== DASHBOARD STATS ==========

function getDashboardStats() {
  // Total bank balance calculation
  // Bank balance = All advances + balance payments - all expenses - PM payments made - VAT paid

  // Get all advances and payments
  const projectPayments = db.prepare(`
    SELECT SUM(advance_paid) as total FROM projects
  `).get();

  const contractorPayments = db.prepare(`
    SELECT SUM(advance_paid) as total FROM contractor_projects
  `).get();

  const totalDeposits = (projectPayments.total || 0) + (contractorPayments.total || 0);

  // Get company expenses
  const companyExpenses = db.prepare(`
    SELECT SUM(amount) as total FROM company_expenses
  `).get();

  // Get project expenses
  const projectExpenses = db.prepare(`
    SELECT SUM(amount) as total FROM project_expenses
  `).get();

  const totalExpenses = (companyExpenses.total || 0) + (projectExpenses.total || 0);

  // Get PM payments made
  const pmPaymentsMade = db.prepare(`
    SELECT SUM(pm1_payment + pm2_payment) as total FROM pm_payments WHERE is_paid = 1
  `).get();

  // Get VAT paid
  const vatPaid = db.prepare(`
    SELECT SUM(vat_amount) as total FROM vat_records WHERE is_paid = 1
  `).get();

  // Get current quarter VAT owed (not paid)
  const { quarter, year } = getQuarterFromDate(new Date());
  const currentQuarterVAT = db.prepare(`
    SELECT SUM(vat_amount) as total FROM vat_records
    WHERE is_paid = 0 AND quarter = ? AND year = ?
  `).get(quarter, year);

  const bankBalance = totalDeposits - totalExpenses - (pmPaymentsMade.total || 0) - (vatPaid.total || 0);
  const vatOwed = currentQuarterVAT.total || 0;
  const ownerBalance = bankBalance - vatOwed - totalDeposits;

  return {
    bankBalance: bankBalance,
    ownerBalance: ownerBalance,
    vatOwed: vatOwed,
    clientDeposits: totalDeposits
  };
}

function getFinancialSummary() {
  const projects = db.prepare('SELECT SUM(total_value_with_vat) as total FROM projects').get();
  const contractors = db.prepare('SELECT SUM(total_charged_with_vat) as total FROM contractor_projects').get();

  const totalTurnover = (projects.total || 0) + (contractors.total || 0);

  const projectExpenses = db.prepare('SELECT SUM(amount) as total FROM project_expenses').get();
  const companyExpenses = db.prepare('SELECT SUM(amount) as total FROM company_expenses').get();

  const totalExpenses = (projectExpenses.total || 0) + (companyExpenses.total || 0);

  const projectProfit = db.prepare('SELECT SUM(company_profit) as total FROM projects').get();
  const contractorProfit = db.prepare('SELECT SUM(company_profit) as total FROM contractor_projects').get();

  const totalProfit = (projectProfit.total || 0) + (contractorProfit.total || 0);

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  const contractorCount = db.prepare('SELECT COUNT(*) as count FROM contractor_projects').get();

  return {
    totalTurnover,
    totalExpenses,
    totalProfit,
    regularProjects: projectCount.count,
    contractorProjects: contractorCount.count,
    projectProfit: projectProfit.total || 0,
    contractorProjectProfit: contractorProfit.total || 0
  };
}

// ========== UTILITY FUNCTIONS ==========

function getQuarterFromDate(date) {
  const month = date.getMonth();
  let quarter;

  if (month < 3) quarter = 'Q1';
  else if (month < 6) quarter = 'Q2';
  else if (month < 9) quarter = 'Q3';
  else quarter = 'Q4';

  return { quarter, year: date.getFullYear() };
}

module.exports = {
  initializeDatabase,
  getAllProjects,
  addProject,
  updateProject,
  deleteProject,
  addProjectExpense,
  getAllCompanyExpenses,
  addCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  getAllContractorProjects,
  addContractorProject,
  updateContractorProject,
  deleteContractorProject,
  getAllPMPayments,
  updatePMPayment,
  getVATRecords,
  updateVATPaid,
  getDashboardStats,
  getFinancialSummary
};
