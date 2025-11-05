const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'financial_data.db');
let db = null;

// Initialize database with tables
async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
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
      vat_collected INTEGER DEFAULT 0,
      profit_loss TEXT DEFAULT 'Profit',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS company_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
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
      vat_collected INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pm_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      project_profit REAL NOT NULL,
      num_pms INTEGER NOT NULL,
      pm1_payment REAL NOT NULL,
      pm2_payment REAL DEFAULT 0,
      is_paid INTEGER DEFAULT 0,
      date_paid TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vat_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      project_type TEXT NOT NULL,
      client_name TEXT NOT NULL,
      payment_amount REAL NOT NULL,
      vat_amount REAL NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL,
      is_paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDatabase();
  console.log('Database initialized successfully at:', dbPath);
}

// Save database to disk
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// ========== PROJECTS ==========

function getAllProjects() {
  const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
  const projects = [];

  while (stmt.step()) {
    const project = stmt.getAsObject();

    // Get expenses for each project
    const expStmt = db.prepare('SELECT * FROM project_expenses WHERE project_id = ?');
    expStmt.bind([project.id]);
    const expenses = [];
    let total_expenses = 0;

    while (expStmt.step()) {
      const expense = expStmt.getAsObject();
      expenses.push(expense);
      total_expenses += expense.amount;
    }
    expStmt.free();

    project.expenses = expenses;
    project.total_expenses = total_expenses;
    projects.push(project);
  }
  stmt.free();

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

  stmt.bind([
    client_name, address, project_details, total_value_with_vat,
    vat_amount, project_value, advance_paid, balance_due,
    project_value, num_project_managers, 0
  ]);
  stmt.step();
  stmt.free();

  // Get the last insert ID
  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const result = idStmt.getAsObject();
  const projectId = result.id;
  idStmt.free();

  // If advance is paid, create VAT record
  if (advance_paid > 0) {
    const advanceVAT = advance_paid * (5 / 105);
    const { quarter, year } = getQuarterFromDate(new Date());

    const vatStmt = db.prepare(`
      INSERT INTO vat_records (project_id, project_type, client_name, payment_amount, vat_amount, quarter, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    vatStmt.bind([projectId, 'regular', client_name, advance_paid, advanceVAT, quarter, year]);
    vatStmt.step();
    vatStmt.free();
  }

  saveDatabase();
  return projectId;
}

function updateProject(id, updates) {
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return false;
  }

  const project = stmt.getAsObject();
  stmt.free();

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
  const expStmt = db.prepare('SELECT SUM(amount) as total FROM project_expenses WHERE project_id = ?');
  expStmt.bind([id]);
  expStmt.step();
  const expenses = expStmt.getAsObject();
  expStmt.free();

  const total_expenses = expenses.total || 0;
  const company_profit = project_value - total_expenses;

  // Calculate PM payment
  let pm_payment_due = 0;
  if (status === 'completed' && num_project_managers > 0) {
    pm_payment_due = (company_profit * 0.5) / num_project_managers;
  }

  const updateStmt = db.prepare(`
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

  updateStmt.bind([
    total_value_with_vat, vat_amount, project_value, advance_paid,
    balance_due, company_profit, num_project_managers, pm_payment_due,
    status, completed_at, id
  ]);
  updateStmt.step();
  updateStmt.free();

  // Update VAT records if advance changes
  if (updates.advance_paid !== undefined && updates.advance_paid !== project.advance_paid) {
    const advanceVAT = advance_paid * (5 / 105);
    const { quarter, year } = getQuarterFromDate(new Date());

    // Delete old VAT record for advance
    const delStmt = db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?');
    delStmt.bind([id, 'regular']);
    delStmt.step();
    delStmt.free();

    // Create new one if advance > 0
    if (advance_paid > 0) {
      const vatStmt = db.prepare(`
        INSERT INTO vat_records (project_id, project_type, client_name, payment_amount, vat_amount, quarter, year)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      vatStmt.bind([id, 'regular', project.client_name, advance_paid, advanceVAT, quarter, year]);
      vatStmt.step();
      vatStmt.free();
    }
  }

  // Create PM payment record if project completed
  if (status === 'completed' && project.status !== 'completed' && num_project_managers > 0) {
    const pm1_payment = num_project_managers === 1 ? company_profit * 0.5 : company_profit * 0.25;
    const pm2_payment = num_project_managers === 2 ? company_profit * 0.25 : 0;

    const pmStmt = db.prepare(`
      INSERT INTO pm_payments (project_id, client_name, project_profit, num_pms, pm1_payment, pm2_payment)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    pmStmt.bind([id, project.client_name, company_profit, num_project_managers, pm1_payment, pm2_payment]);
    pmStmt.step();
    pmStmt.free();
  }

  saveDatabase();
  return true;
}

function deleteProject(id) {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();

  const vatStmt = db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?');
  vatStmt.bind([id, 'regular']);
  vatStmt.step();
  vatStmt.free();

  saveDatabase();
  return true;
}

function addProjectExpense(projectId, amount, description) {
  const stmt = db.prepare(`
    INSERT INTO project_expenses (project_id, amount, description)
    VALUES (?, ?, ?)
  `);
  stmt.bind([projectId, amount, description]);
  stmt.step();
  stmt.free();

  // Get last insert ID
  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const result = idStmt.getAsObject();
  const expenseId = result.id;
  idStmt.free();

  // Recalculate project profit
  const projStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  projStmt.bind([projectId]);
  projStmt.step();
  const project = projStmt.getAsObject();
  projStmt.free();

  const expStmt = db.prepare('SELECT SUM(amount) as total FROM project_expenses WHERE project_id = ?');
  expStmt.bind([projectId]);
  expStmt.step();
  const expenses = expStmt.getAsObject();
  expStmt.free();

  const total_expenses = expenses.total || 0;
  const company_profit = project.project_value - total_expenses;

  const updateStmt = db.prepare('UPDATE projects SET company_profit = ? WHERE id = ?');
  updateStmt.bind([company_profit, projectId]);
  updateStmt.step();
  updateStmt.free();

  saveDatabase();
  return expenseId;
}

// ========== COMPANY EXPENSES ==========

function getAllCompanyExpenses() {
  const stmt = db.prepare('SELECT * FROM company_expenses ORDER BY date DESC');
  const expenses = [];

  while (stmt.step()) {
    expenses.push(stmt.getAsObject());
  }
  stmt.free();

  return expenses;
}

function addCompanyExpense(expense) {
  const { date, category, description, amount } = expense;
  const stmt = db.prepare(`
    INSERT INTO company_expenses (date, category, description, amount)
    VALUES (?, ?, ?, ?)
  `);
  stmt.bind([date, category, description, amount]);
  stmt.step();
  stmt.free();

  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const result = idStmt.getAsObject();
  idStmt.free();

  saveDatabase();
  return result.id;
}

function updateCompanyExpense(id, expense) {
  const { date, category, description, amount } = expense;
  const stmt = db.prepare(`
    UPDATE company_expenses SET date = ?, category = ?, description = ?, amount = ?
    WHERE id = ?
  `);
  stmt.bind([date, category, description, amount, id]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

function deleteCompanyExpense(id) {
  const stmt = db.prepare('DELETE FROM company_expenses WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

// ========== CONTRACTOR PROJECTS ==========

function getAllContractorProjects() {
  const stmt = db.prepare('SELECT * FROM contractor_projects ORDER BY created_at DESC');
  const projects = [];

  while (stmt.step()) {
    projects.push(stmt.getAsObject());
  }
  stmt.free();

  return projects;
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

  stmt.bind([
    client_name, address, project_details, total_charged_with_vat,
    vat_amount, value_excl_vat, contractor_name, contractor_price,
    advance_paid, balance_due, company_profit
  ]);
  stmt.step();
  stmt.free();

  const idStmt = db.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const result = idStmt.getAsObject();
  const projectId = result.id;
  idStmt.free();

  // If advance is paid, create VAT record
  if (advance_paid > 0) {
    const advanceVAT = advance_paid * (5 / 105);
    const { quarter, year } = getQuarterFromDate(new Date());

    const vatStmt = db.prepare(`
      INSERT INTO vat_records (project_id, project_type, client_name, payment_amount, vat_amount, quarter, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    vatStmt.bind([projectId, 'contractor', client_name, advance_paid, advanceVAT, quarter, year]);
    vatStmt.step();
    vatStmt.free();
  }

  saveDatabase();
  return projectId;
}

function updateContractorProject(id, updates) {
  const stmt = db.prepare('SELECT * FROM contractor_projects WHERE id = ?');
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return false;
  }

  const project = stmt.getAsObject();
  stmt.free();

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

  const updateStmt = db.prepare(`
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

  updateStmt.bind([
    total_charged_with_vat, vat_amount, value_excl_vat, contractor_price,
    advance_paid, balance_due, company_profit, status, completed_at, id
  ]);
  updateStmt.step();
  updateStmt.free();

  saveDatabase();
  return true;
}

function deleteContractorProject(id) {
  const stmt = db.prepare('DELETE FROM contractor_projects WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();

  const vatStmt = db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?');
  vatStmt.bind([id, 'contractor']);
  vatStmt.step();
  vatStmt.free();

  saveDatabase();
  return true;
}

// ========== PM PAYMENTS ==========

function getAllPMPayments() {
  const stmt = db.prepare('SELECT * FROM pm_payments ORDER BY created_at DESC');
  const payments = [];

  while (stmt.step()) {
    payments.push(stmt.getAsObject());
  }
  stmt.free();

  return payments;
}

function updatePMPayment(id, isPaid) {
  const date_paid = isPaid ? new Date().toISOString() : null;
  const stmt = db.prepare('UPDATE pm_payments SET is_paid = ?, date_paid = ? WHERE id = ?');
  stmt.bind([isPaid ? 1 : 0, date_paid, id]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

// ========== VAT ==========

function getVATRecords() {
  const stmt = db.prepare('SELECT * FROM vat_records ORDER BY year DESC, quarter DESC');
  const records = [];

  while (stmt.step()) {
    records.push(stmt.getAsObject());
  }
  stmt.free();

  return records;
}

function updateVATPaid(id, isPaid) {
  const stmt = db.prepare('UPDATE vat_records SET is_paid = ? WHERE id = ?');
  stmt.bind([isPaid ? 1 : 0, id]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

// ========== DASHBOARD STATS ==========

function getDashboardStats() {
  // Get all advances and payments
  const projStmt = db.prepare('SELECT SUM(advance_paid) as total FROM projects');
  projStmt.step();
  const projectPayments = projStmt.getAsObject();
  projStmt.free();

  const contrStmt = db.prepare('SELECT SUM(advance_paid) as total FROM contractor_projects');
  contrStmt.step();
  const contractorPayments = contrStmt.getAsObject();
  contrStmt.free();

  const totalDeposits = (projectPayments.total || 0) + (contractorPayments.total || 0);

  // Get company expenses
  const compExpStmt = db.prepare('SELECT SUM(amount) as total FROM company_expenses');
  compExpStmt.step();
  const companyExpenses = compExpStmt.getAsObject();
  compExpStmt.free();

  // Get project expenses
  const projExpStmt = db.prepare('SELECT SUM(amount) as total FROM project_expenses');
  projExpStmt.step();
  const projectExpenses = projExpStmt.getAsObject();
  projExpStmt.free();

  const totalExpenses = (companyExpenses.total || 0) + (projectExpenses.total || 0);

  // Get PM payments made
  const pmStmt = db.prepare('SELECT SUM(pm1_payment + pm2_payment) as total FROM pm_payments WHERE is_paid = 1');
  pmStmt.step();
  const pmPaymentsMade = pmStmt.getAsObject();
  pmStmt.free();

  // Get VAT paid
  const vatPaidStmt = db.prepare('SELECT SUM(vat_amount) as total FROM vat_records WHERE is_paid = 1');
  vatPaidStmt.step();
  const vatPaid = vatPaidStmt.getAsObject();
  vatPaidStmt.free();

  // Get current quarter VAT owed (not paid)
  const { quarter, year } = getQuarterFromDate(new Date());
  const currentVATStmt = db.prepare(`
    SELECT SUM(vat_amount) as total FROM vat_records
    WHERE is_paid = 0 AND quarter = ? AND year = ?
  `);
  currentVATStmt.bind([quarter, year]);
  currentVATStmt.step();
  const currentQuarterVAT = currentVATStmt.getAsObject();
  currentVATStmt.free();

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
  const projStmt = db.prepare('SELECT SUM(total_value_with_vat) as total FROM projects');
  projStmt.step();
  const projects = projStmt.getAsObject();
  projStmt.free();

  const contrStmt = db.prepare('SELECT SUM(total_charged_with_vat) as total FROM contractor_projects');
  contrStmt.step();
  const contractors = contrStmt.getAsObject();
  contrStmt.free();

  const totalTurnover = (projects.total || 0) + (contractors.total || 0);

  const projExpStmt = db.prepare('SELECT SUM(amount) as total FROM project_expenses');
  projExpStmt.step();
  const projectExpenses = projExpStmt.getAsObject();
  projExpStmt.free();

  const compExpStmt = db.prepare('SELECT SUM(amount) as total FROM company_expenses');
  compExpStmt.step();
  const companyExpenses = compExpStmt.getAsObject();
  compExpStmt.free();

  const totalExpenses = (projectExpenses.total || 0) + (companyExpenses.total || 0);

  const projProfitStmt = db.prepare('SELECT SUM(company_profit) as total FROM projects');
  projProfitStmt.step();
  const projectProfit = projProfitStmt.getAsObject();
  projProfitStmt.free();

  const contrProfitStmt = db.prepare('SELECT SUM(company_profit) as total FROM contractor_projects');
  contrProfitStmt.step();
  const contractorProfit = contrProfitStmt.getAsObject();
  contrProfitStmt.free();

  const totalProfit = (projectProfit.total || 0) + (contractorProfit.total || 0);

  const projCountStmt = db.prepare('SELECT COUNT(*) as count FROM projects');
  projCountStmt.step();
  const projectCount = projCountStmt.getAsObject();
  projCountStmt.free();

  const contrCountStmt = db.prepare('SELECT COUNT(*) as count FROM contractor_projects');
  contrCountStmt.step();
  const contractorCount = contrCountStmt.getAsObject();
  contrCountStmt.free();

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
