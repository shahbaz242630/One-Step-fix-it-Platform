const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const db = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Initialize database
  db.initializeDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for database operations

// Projects
ipcMain.handle('get-all-projects', () => db.getAllProjects());
ipcMain.handle('add-project', (event, project) => db.addProject(project));
ipcMain.handle('update-project', (event, id, project) => db.updateProject(id, project));
ipcMain.handle('delete-project', (event, id) => db.deleteProject(id));
ipcMain.handle('add-project-expense', (event, projectId, amount, description) =>
  db.addProjectExpense(projectId, amount, description));

// Company Expenses
ipcMain.handle('get-all-company-expenses', () => db.getAllCompanyExpenses());
ipcMain.handle('add-company-expense', (event, expense) => db.addCompanyExpense(expense));
ipcMain.handle('update-company-expense', (event, id, expense) => db.updateCompanyExpense(id, expense));
ipcMain.handle('delete-company-expense', (event, id) => db.deleteCompanyExpense(id));

// Contractor Projects
ipcMain.handle('get-all-contractor-projects', () => db.getAllContractorProjects());
ipcMain.handle('add-contractor-project', (event, project) => db.addContractorProject(project));
ipcMain.handle('update-contractor-project', (event, id, project) => db.updateContractorProject(id, project));
ipcMain.handle('delete-contractor-project', (event, id) => db.deleteContractorProject(id));

// PM Payments
ipcMain.handle('get-all-pm-payments', () => db.getAllPMPayments());
ipcMain.handle('update-pm-payment', (event, id, isPaid) => db.updatePMPayment(id, isPaid));

// VAT Records
ipcMain.handle('get-vat-records', () => db.getVATRecords());
ipcMain.handle('update-vat-paid', (event, id, isPaid) => db.updateVATPaid(id, isPaid));

// Dashboard Stats
ipcMain.handle('get-dashboard-stats', () => db.getDashboardStats());
ipcMain.handle('get-financial-summary', () => db.getFinancialSummary());
