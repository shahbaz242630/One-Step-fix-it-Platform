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

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

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
      start_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      duration_days INTEGER DEFAULT 0
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
      start_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      duration_days INTEGER DEFAULT 0
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

  db.run(`
    CREATE TABLE IF NOT EXISTS vat_quarters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL,
      input_vat REAL DEFAULT 0,
      is_paid INTEGER DEFAULT 0,
      date_paid TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(quarter, year)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      starting_balance REAL DEFAULT 0,
      initial_deposits REAL DEFAULT 0,
      initial_vat REAL DEFAULT 0,
      pm1_name TEXT DEFAULT 'Project Manager 1',
      pm2_name TEXT DEFAULT 'Project Manager 2',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings if not exists
  const settingsStmt = db.prepare('SELECT COUNT(*) as count FROM settings');
  settingsStmt.step();
  const result = settingsStmt.getAsObject();
  settingsStmt.free();

  if (result.count === 0) {
    const insertStmt = db.prepare('INSERT INTO settings (id, starting_balance, initial_deposits, initial_vat, pm1_name, pm2_name) VALUES (1, 0, 0, 0, "Project Manager 1", "Project Manager 2")');
    insertStmt.step();
    insertStmt.free();
  }

  // ========== DATABASE MIGRATIONS ==========
  // Add missing columns to existing tables (for users who created DB before these features were added)

  try {
    // Check if start_date column exists in projects table
    const checkProjectsStmt = db.prepare("SELECT start_date FROM projects LIMIT 1");
    checkProjectsStmt.step();
    checkProjectsStmt.free();
  } catch (error) {
    // Column doesn't exist, add it
    console.log('Adding start_date column to projects table...');
    db.run('ALTER TABLE projects ADD COLUMN start_date TEXT');
    console.log('Added start_date to projects');
  }

  try {
    // Check if duration_days column exists in projects table
    const checkDurationStmt = db.prepare("SELECT duration_days FROM projects LIMIT 1");
    checkDurationStmt.step();
    checkDurationStmt.free();
  } catch (error) {
    // Column doesn't exist, add it
    console.log('Adding duration_days column to projects table...');
    db.run('ALTER TABLE projects ADD COLUMN duration_days INTEGER DEFAULT 0');
    console.log('Added duration_days to projects');
  }

  try {
    // Check if start_date column exists in contractor_projects table
    const checkContractorStmt = db.prepare("SELECT start_date FROM contractor_projects LIMIT 1");
    checkContractorStmt.step();
    checkContractorStmt.free();
  } catch (error) {
    // Column doesn't exist, add it
    console.log('Adding start_date column to contractor_projects table...');
    db.run('ALTER TABLE contractor_projects ADD COLUMN start_date TEXT');
    console.log('Added start_date to contractor_projects');
  }

  try {
    // Check if duration_days column exists in contractor_projects table
    const checkContractorDurationStmt = db.prepare("SELECT duration_days FROM contractor_projects LIMIT 1");
    checkContractorDurationStmt.step();
    checkContractorDurationStmt.free();
  } catch (error) {
    // Column doesn't exist, add it
    console.log('Adding duration_days column to contractor_projects table...');
    db.run('ALTER TABLE contractor_projects ADD COLUMN duration_days INTEGER DEFAULT 0');
    console.log('Added duration_days to contractor_projects');
  }

  try {
    // Check if pm1_name column exists in settings table
    const checkPM1Stmt = db.prepare("SELECT pm1_name FROM settings LIMIT 1");
    checkPM1Stmt.step();
    checkPM1Stmt.free();
  } catch (error) {
    // Column doesn't exist, add it
    console.log('Adding pm1_name column to settings table...');
    db.run('ALTER TABLE settings ADD COLUMN pm1_name TEXT DEFAULT "Project Manager 1"');
    console.log('Added pm1_name to settings');
  }

  try {
    // Check if pm2_name column exists in settings table
    const checkPM2Stmt = db.prepare("SELECT pm2_name FROM settings LIMIT 1");
    checkPM2Stmt.step();
    checkPM2Stmt.free();
  } catch (error) {
    // Column doesn't exist, add it
    console.log('Adding pm2_name column to settings table...');
    db.run('ALTER TABLE settings ADD COLUMN pm2_name TEXT DEFAULT "Project Manager 2"');
    console.log('Added pm2_name to settings');
  }

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
    num_project_managers = 0,
    start_date = new Date().toISOString().split('T')[0] // Default to today
  } = project;

  // Calculate VAT (extract 5% from total)
  const vat_amount = total_value_with_vat * (5 / 105);
  const project_value = total_value_with_vat - vat_amount;
  const balance_due = total_value_with_vat - advance_paid;

  const stmt = db.prepare(`
    INSERT INTO projects (
      client_name, address, project_details, total_value_with_vat,
      vat_amount, project_value, advance_paid, balance_due,
      company_profit, num_project_managers, pm_payment_due, start_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.bind([
    client_name, address, project_details, total_value_with_vat,
    vat_amount, project_value, advance_paid, balance_due,
    project_value, num_project_managers, 0, start_date
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
    completed_at,
    start_date
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

  // Calculate duration if project is being completed
  let duration_days = project.duration_days || 0;
  if (status === 'completed' && project.status !== 'completed' && start_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(completed_at);
    duration_days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
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
      start_date = ?,
      completed_at = ?,
      duration_days = ?
    WHERE id = ?
  `);

  updateStmt.bind([
    total_value_with_vat, vat_amount, project_value, advance_paid,
    balance_due, company_profit, num_project_managers, pm_payment_due,
    status, start_date, completed_at, duration_days, id
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
    let pm1_payment = 0;
    let pm2_payment = 0;

    // Handle PM selection: 'pm1', 'pm2', or 'both'
    const pmSelection = updates.pm_selection || 'pm1'; // Default to pm1 for backwards compatibility

    if (num_project_managers === 1) {
      // Single PM gets 50%
      if (pmSelection === 'pm1') {
        pm1_payment = company_profit * 0.5;
        pm2_payment = 0;
      } else if (pmSelection === 'pm2') {
        pm1_payment = 0;
        pm2_payment = company_profit * 0.5;
      }
    } else if (num_project_managers === 2) {
      // Both PMs get 25% each
      pm1_payment = company_profit * 0.25;
      pm2_payment = company_profit * 0.25;
    }

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
  // Delete project expenses first
  const expStmt = db.prepare('DELETE FROM project_expenses WHERE project_id = ?');
  expStmt.bind([id]);
  expStmt.step();
  expStmt.free();

  // Delete PM payments
  const pmStmt = db.prepare('DELETE FROM pm_payments WHERE project_id = ?');
  pmStmt.bind([id]);
  pmStmt.step();
  pmStmt.free();

  // Delete VAT records
  const vatStmt = db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?');
  vatStmt.bind([id, 'regular']);
  vatStmt.step();
  vatStmt.free();

  // Delete the project itself
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();

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
    advance_paid = 0,
    start_date = new Date().toISOString().split('T')[0] // Default to today
  } = project;

  const vat_amount = total_charged_with_vat * (5 / 105);
  const value_excl_vat = total_charged_with_vat - vat_amount;
  const balance_due = total_charged_with_vat - advance_paid;
  const company_profit = value_excl_vat - contractor_price;

  const stmt = db.prepare(`
    INSERT INTO contractor_projects (
      client_name, address, project_details, total_charged_with_vat,
      vat_amount, value_excl_vat, contractor_name, contractor_price,
      advance_paid, balance_due, company_profit, start_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.bind([
    client_name, address, project_details, total_charged_with_vat,
    vat_amount, value_excl_vat, contractor_name, contractor_price,
    advance_paid, balance_due, company_profit, start_date
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
    completed_at,
    start_date
  } = { ...project, ...updates };

  const vat_amount = total_charged_with_vat * (5 / 105);
  const value_excl_vat = total_charged_with_vat - vat_amount;
  const balance_due = total_charged_with_vat - advance_paid;
  const company_profit = value_excl_vat - contractor_price;

  // Calculate duration if project is being completed
  let duration_days = project.duration_days || 0;
  if (status === 'completed' && project.status !== 'completed' && start_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(completed_at);
    duration_days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  }

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
      start_date = ?,
      completed_at = ?,
      duration_days = ?
    WHERE id = ?
  `);

  updateStmt.bind([
    total_charged_with_vat, vat_amount, value_excl_vat, contractor_price,
    advance_paid, balance_due, company_profit, status, start_date, completed_at, duration_days, id
  ]);
  updateStmt.step();
  updateStmt.free();

  saveDatabase();
  return true;
}

function deleteContractorProject(id) {
  // Delete VAT records first
  const vatStmt = db.prepare('DELETE FROM vat_records WHERE project_id = ? AND project_type = ?');
  vatStmt.bind([id, 'contractor']);
  vatStmt.step();
  vatStmt.free();

  // Delete the contractor project
  const stmt = db.prepare('DELETE FROM contractor_projects WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();

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

// ========== QUARTERLY VAT SUMMARY ==========

function getQuarterlyVATSummary() {
  // Get all unique quarter/year combinations from vat_records
  const quartersStmt = db.prepare(`
    SELECT DISTINCT quarter, year
    FROM vat_records
    ORDER BY year DESC,
      CASE quarter
        WHEN 'Q1' THEN 1
        WHEN 'Q2' THEN 2
        WHEN 'Q3' THEN 3
        WHEN 'Q4' THEN 4
      END DESC
  `);

  const summaries = [];

  while (quartersStmt.step()) {
    const row = quartersStmt.getAsObject();
    const quarter = row.quarter;
    const year = row.year;

    // Get output VAT (collected from clients)
    const outputStmt = db.prepare(`
      SELECT SUM(vat_amount) as total
      FROM vat_records
      WHERE quarter = ? AND year = ?
    `);
    outputStmt.bind([quarter, year]);
    outputStmt.step();
    const outputVAT = outputStmt.getAsObject().total || 0;
    outputStmt.free();

    // Get or create quarterly record for input VAT
    let quarterRecord = getOrCreateQuarterRecord(quarter, year);

    const inputVAT = quarterRecord.input_vat || 0;
    const netPayable = outputVAT - inputVAT;
    const isPaid = quarterRecord.is_paid === 1;

    summaries.push({
      quarter,
      year,
      output_vat: outputVAT,
      input_vat: inputVAT,
      net_payable: netPayable,
      is_paid: isPaid,
      date_paid: quarterRecord.date_paid,
      notes: quarterRecord.notes,
      quarter_id: quarterRecord.id
    });
  }
  quartersStmt.free();

  return summaries;
}

function getOrCreateQuarterRecord(quarter, year) {
  // Try to get existing record
  const stmt = db.prepare('SELECT * FROM vat_quarters WHERE quarter = ? AND year = ?');
  stmt.bind([quarter, year]);

  if (stmt.step()) {
    const record = stmt.getAsObject();
    stmt.free();
    return record;
  }
  stmt.free();

  // Create new record if doesn't exist
  const insertStmt = db.prepare(`
    INSERT INTO vat_quarters (quarter, year, input_vat, is_paid)
    VALUES (?, ?, 0, 0)
  `);
  insertStmt.bind([quarter, year]);
  insertStmt.step();
  insertStmt.free();

  // Get the newly created record
  const getStmt = db.prepare('SELECT * FROM vat_quarters WHERE quarter = ? AND year = ?');
  getStmt.bind([quarter, year]);
  getStmt.step();
  const record = getStmt.getAsObject();
  getStmt.free();

  saveDatabase();
  return record;
}

function updateInputVAT(quarter, year, inputVAT, notes) {
  const record = getOrCreateQuarterRecord(quarter, year);

  const stmt = db.prepare(`
    UPDATE vat_quarters
    SET input_vat = ?, notes = ?
    WHERE quarter = ? AND year = ?
  `);
  stmt.bind([inputVAT, notes || '', quarter, year]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

function markQuarterVATPaid(quarter, year, isPaid) {
  const record = getOrCreateQuarterRecord(quarter, year);
  const datePaid = isPaid ? new Date().toISOString() : null;

  const stmt = db.prepare(`
    UPDATE vat_quarters
    SET is_paid = ?, date_paid = ?
    WHERE quarter = ? AND year = ?
  `);
  stmt.bind([isPaid ? 1 : 0, datePaid, quarter, year]);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

// ========== DASHBOARD STATS ==========

function getDashboardStats() {
  // Get settings for initial values
  const settings = getSettings();
  const starting_balance = settings.starting_balance || 0;
  const initial_deposits = settings.initial_deposits || 0;
  const initial_vat = settings.initial_vat || 0;

  // Get all advances and payments
  const projStmt = db.prepare('SELECT SUM(advance_paid) as total FROM projects');
  projStmt.step();
  const projectPayments = projStmt.getAsObject();
  projStmt.free();

  const contrStmt = db.prepare('SELECT SUM(advance_paid) as total FROM contractor_projects');
  contrStmt.step();
  const contractorPayments = contrStmt.getAsObject();
  contrStmt.free();

  const totalDeposits = (projectPayments.total || 0) + (contractorPayments.total || 0) + initial_deposits;

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

  // Calculate NET VAT paid (for paid quarters only)
  let totalNetVATPaid = 0;
  const paidQuartersStmt = db.prepare('SELECT quarter, year FROM vat_quarters WHERE is_paid = 1');
  while (paidQuartersStmt.step()) {
    const paidQuarter = paidQuartersStmt.getAsObject();

    // Get output VAT for this quarter
    const outputStmt = db.prepare('SELECT SUM(vat_amount) as total FROM vat_records WHERE quarter = ? AND year = ?');
    outputStmt.bind([paidQuarter.quarter, paidQuarter.year]);
    outputStmt.step();
    const outputVAT = outputStmt.getAsObject().total || 0;
    outputStmt.free();

    // Get input VAT for this quarter
    const inputStmt = db.prepare('SELECT input_vat FROM vat_quarters WHERE quarter = ? AND year = ?');
    inputStmt.bind([paidQuarter.quarter, paidQuarter.year]);
    inputStmt.step();
    const inputVAT = inputStmt.getAsObject().input_vat || 0;
    inputStmt.free();

    totalNetVATPaid += (outputVAT - inputVAT);
  }
  paidQuartersStmt.free();

  // Calculate NET VAT owed (for unpaid quarters)
  let totalNetVATOwed = initial_vat;

  // Get all unique quarters that have VAT records
  const allQuartersStmt = db.prepare('SELECT DISTINCT quarter, year FROM vat_records ORDER BY year DESC, quarter DESC');
  while (allQuartersStmt.step()) {
    const quarterData = allQuartersStmt.getAsObject();

    // Check if this quarter is paid
    const paidCheckStmt = db.prepare('SELECT is_paid FROM vat_quarters WHERE quarter = ? AND year = ?');
    paidCheckStmt.bind([quarterData.quarter, quarterData.year]);

    let isPaid = 0;
    if (paidCheckStmt.step()) {
      isPaid = paidCheckStmt.getAsObject().is_paid || 0;
    }
    paidCheckStmt.free();

    // If not paid, add to owed
    if (isPaid === 0) {
      // Get output VAT
      const outputStmt = db.prepare('SELECT SUM(vat_amount) as total FROM vat_records WHERE quarter = ? AND year = ?');
      outputStmt.bind([quarterData.quarter, quarterData.year]);
      outputStmt.step();
      const outputVAT = outputStmt.getAsObject().total || 0;
      outputStmt.free();

      // Get input VAT (create record if doesn't exist)
      const quarterRecord = getOrCreateQuarterRecord(quarterData.quarter, quarterData.year);
      const inputVAT = quarterRecord.input_vat || 0;

      totalNetVATOwed += (outputVAT - inputVAT);
    }
  }
  allQuartersStmt.free();

  const bankBalance = starting_balance + (projectPayments.total || 0) + (contractorPayments.total || 0) - totalExpenses - (pmPaymentsMade.total || 0) - totalNetVATPaid;
  const vatOwed = totalNetVATOwed;
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

// ========== SETTINGS ==========

function getSettings() {
  const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
  stmt.step();
  const settings = stmt.getAsObject();
  stmt.free();
  return settings;
}

function saveSettings(settings) {
  const { starting_balance, initial_deposits, initial_vat, pm1_name, pm2_name } = settings;
  const stmt = db.prepare(`
    UPDATE settings SET
      starting_balance = ?,
      initial_deposits = ?,
      initial_vat = ?,
      pm1_name = ?,
      pm2_name = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);
  stmt.bind([starting_balance, initial_deposits, initial_vat, pm1_name || 'Project Manager 1', pm2_name || 'Project Manager 2']);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

function resetAllData() {
  // Delete all data from all tables
  db.run('DELETE FROM project_expenses');
  db.run('DELETE FROM pm_payments');
  db.run('DELETE FROM vat_records');
  db.run('DELETE FROM projects');
  db.run('DELETE FROM company_expenses');
  db.run('DELETE FROM contractor_projects');

  // Reset settings to zero
  const stmt = db.prepare(`
    UPDATE settings SET
      starting_balance = 0,
      initial_deposits = 0,
      initial_vat = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);
  stmt.step();
  stmt.free();

  saveDatabase();
  return true;
}

// ========== REPORTS ==========

function getReportData(period, value) {
  // period can be: 'month', 'quarter', 'year'
  // value depends on period:
  //   month: 'YYYY-MM' (e.g., '2025-01')
  //   quarter: 'YYYY-Q#' (e.g., '2025-Q1')
  //   year: 'YYYY' (e.g., '2025')

  let dateFilter = '';
  let params = [];

  if (period === 'month') {
    dateFilter = "strftime('%Y-%m', start_date) = ?";
    params = [value];
  } else if (period === 'quarter') {
    const [year, quarter] = value.split('-');
    const quarterNum = parseInt(quarter.replace('Q', ''));
    const startMonth = (quarterNum - 1) * 3 + 1;
    const endMonth = quarterNum * 3;
    dateFilter = `cast(strftime('%Y', start_date) as integer) = ? AND cast(strftime('%m', start_date) as integer) BETWEEN ? AND ?`;
    params = [parseInt(year), startMonth, endMonth];
  } else if (period === 'year') {
    dateFilter = "strftime('%Y', start_date) = ?";
    params = [value];
  }

  // Get regular projects data
  const regProjStmt = db.prepare(`
    SELECT
      SUM(total_value_with_vat) as turnover,
      SUM(vat_amount) as vat_collected,
      SUM(company_profit) as profit,
      COUNT(*) as count
    FROM projects
    WHERE ${dateFilter}
  `);
  regProjStmt.bind(params);
  regProjStmt.step();
  const regularProjects = regProjStmt.getAsObject();
  regProjStmt.free();

  // Get contractor projects data
  const contrProjStmt = db.prepare(`
    SELECT
      SUM(total_charged_with_vat) as turnover,
      SUM(vat_amount) as vat_collected,
      SUM(company_profit) as profit,
      COUNT(*) as count
    FROM contractor_projects
    WHERE ${dateFilter}
  `);
  contrProjStmt.bind(params);
  contrProjStmt.step();
  const contractorProjects = contrProjStmt.getAsObject();
  contrProjStmt.free();

  // Get project expenses for this period
  const projExpStmt = db.prepare(`
    SELECT SUM(pe.amount) as total
    FROM project_expenses pe
    JOIN projects p ON pe.project_id = p.id
    WHERE ${dateFilter}
  `);
  projExpStmt.bind(params);
  projExpStmt.step();
  const projectExpenses = projExpStmt.getAsObject();
  projExpStmt.free();

  // Get company expenses for this period
  const compExpStmt = db.prepare(`
    SELECT SUM(amount) as total
    FROM company_expenses
    WHERE strftime('%Y-%m', date) ${period === 'year' ? "LIKE ?" : "= ?"}
  `);
  if (period === 'year') {
    compExpStmt.bind([value + '%']);
  } else if (period === 'month') {
    compExpStmt.bind([value]);
  } else { // quarter
    const [year, quarter] = value.split('-');
    const quarterNum = parseInt(quarter.replace('Q', ''));
    const months = [];
    for (let i = (quarterNum - 1) * 3 + 1; i <= quarterNum * 3; i++) {
      months.push(`${year}-${i.toString().padStart(2, '0')}`);
    }
    // For quarters, we need to sum across multiple months
    const compExpStmt2 = db.prepare(`
      SELECT SUM(amount) as total
      FROM company_expenses
      WHERE strftime('%Y-%m', date) IN (?, ?, ?)
    `);
    compExpStmt2.bind(months);
    compExpStmt2.step();
    const companyExpenses2 = compExpStmt2.getAsObject();
    compExpStmt2.free();

    // Get VAT paid for this period
    const { quarter: q, year: y } = value.includes('Q')
      ? { quarter: value.split('-')[1], year: parseInt(value.split('-')[0]) }
      : { quarter: null, year: null };

    const vatPaidStmt = db.prepare(`
      SELECT SUM(vat_amount) as total
      FROM vat_records
      WHERE is_paid = 1 AND quarter = ? AND year = ?
    `);
    vatPaidStmt.bind([q, y]);
    vatPaidStmt.step();
    const vatPaid = vatPaidStmt.getAsObject();
    vatPaidStmt.free();

    // Get PM payments for this period
    const pmStmt = db.prepare(`
      SELECT SUM(pm1_payment + pm2_payment) as total
      FROM pm_payments pm
      JOIN projects p ON pm.project_id = p.id
      WHERE pm.is_paid = 1 AND ${dateFilter}
    `);
    pmStmt.bind(params);
    pmStmt.step();
    const pmPayments = pmStmt.getAsObject();
    pmStmt.free();

    return {
      period,
      value,
      turnover: {
        regular: regularProjects.turnover || 0,
        contractor: contractorProjects.turnover || 0,
        total: (regularProjects.turnover || 0) + (contractorProjects.turnover || 0)
      },
      expenses: {
        project: projectExpenses.total || 0,
        company: companyExpenses2.total || 0,
        total: (projectExpenses.total || 0) + (companyExpenses2.total || 0)
      },
      vat: {
        collected_regular: regularProjects.vat_collected || 0,
        collected_contractor: contractorProjects.vat_collected || 0,
        collected_total: (regularProjects.vat_collected || 0) + (contractorProjects.vat_collected || 0),
        paid: vatPaid.total || 0
      },
      pmPayments: pmPayments.total || 0,
      profit: {
        regular: regularProjects.profit || 0,
        contractor: contractorProjects.profit || 0,
        total: (regularProjects.profit || 0) + (contractorProjects.profit || 0)
      },
      projectCounts: {
        regular: regularProjects.count || 0,
        contractor: contractorProjects.count || 0,
        total: (regularProjects.count || 0) + (contractorProjects.count || 0)
      }
    };
  }

  compExpStmt.step();
  const companyExpenses = compExpStmt.getAsObject();
  compExpStmt.free();

  // Get VAT paid for this period
  let vatPaid = { total: 0 };
  if (period === 'quarter') {
    const [year, quarter] = value.split('-');
    const vatPaidStmt = db.prepare(`
      SELECT SUM(vat_amount) as total
      FROM vat_records
      WHERE is_paid = 1 AND quarter = ? AND year = ?
    `);
    vatPaidStmt.bind([quarter, parseInt(year)]);
    vatPaidStmt.step();
    vatPaid = vatPaidStmt.getAsObject();
    vatPaidStmt.free();
  }

  // Get PM payments for this period
  const pmStmt = db.prepare(`
    SELECT SUM(pm1_payment + pm2_payment) as total
    FROM pm_payments pm
    JOIN projects p ON pm.project_id = p.id
    WHERE pm.is_paid = 1 AND ${dateFilter}
  `);
  pmStmt.bind(params);
  pmStmt.step();
  const pmPayments = pmStmt.getAsObject();
  pmStmt.free();

  return {
    period,
    value,
    turnover: {
      regular: regularProjects.turnover || 0,
      contractor: contractorProjects.turnover || 0,
      total: (regularProjects.turnover || 0) + (contractorProjects.turnover || 0)
    },
    expenses: {
      project: projectExpenses.total || 0,
      company: companyExpenses.total || 0,
      total: (projectExpenses.total || 0) + (companyExpenses.total || 0)
    },
    vat: {
      collected_regular: regularProjects.vat_collected || 0,
      collected_contractor: contractorProjects.vat_collected || 0,
      collected_total: (regularProjects.vat_collected || 0) + (contractorProjects.vat_collected || 0),
      paid: vatPaid.total || 0
    },
    pmPayments: pmPayments.total || 0,
    profit: {
      regular: regularProjects.profit || 0,
      contractor: contractorProjects.profit || 0,
      total: (regularProjects.profit || 0) + (contractorProjects.profit || 0)
    },
    projectCounts: {
      regular: regularProjects.count || 0,
      contractor: contractorProjects.count || 0,
      total: (regularProjects.count || 0) + (contractorProjects.count || 0)
    }
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
  getQuarterlyVATSummary,
  updateInputVAT,
  markQuarterVATPaid,
  getDashboardStats,
  getFinancialSummary,
  getSettings,
  saveSettings,
  resetAllData,
  getReportData
};
