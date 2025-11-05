# Financial Management Platform

A desktop application for managing home maintenance and renovation business finances in Dubai. This white-label solution helps track VAT (5%), expenses, project values, bank balance, and more - all running locally on your machine.

## Features

### 📊 Main Dashboard
- **Bank Balance**: Total funds in your account
- **Owner's Available Balance**: Money you can actually use (after VAT and deposits)
- **VAT to Pay**: Current quarter VAT owed to government
- **Client Deposits**: Advance payments held

### 📁 Regular Projects
- Track client projects with automatic calculations
- Project details: Client name, address, project info
- Automatic VAT calculation (5% extracted from total)
- Expense tracking per project
- Balance due and profit calculations
- Project manager payment calculation (50% split)
- Complete projects and generate PM payments

### 🏗️ Contractor Projects
- Manage projects delegated to contractors
- Track contractor pricing and profit margins
- No PM share - Company keeps 100% profit
- Same VAT tracking as regular projects

### 💰 Company Expenses
- Track all business expenses:
  - Car Rental
  - Accounting Fees
  - Meals & Entertainment
  - Owner Withdrawals
  - Phone Bills
  - Labour Visas
  - Renewal Fees
  - Miscellaneous
- Real-time impact on bank balance

### 📋 VAT Tracking
- Quarterly VAT reports (Q1, Q2, Q3, Q4)
- Track VAT by payment received date
- Mark VAT as paid/pending
- Current quarter highlighted
- Separate tracking for regular and contractor projects

### 🤝 Partners (PM Payments)
- Track project manager payment shares
- **1 PM**: Gets 50% of profit, Company gets 50%
- **2 PMs**: Each gets 25% of profit, Company gets 50%
- Mark payments as paid/pending
- Automatic deduction from owner's balance when paid

### 📈 Financial Summary
- Total turnover across all projects
- Total expenses (project + company)
- Net profit and profit margins
- Project breakdown (regular vs contractor)
- Profit & Loss statement
- Key Performance Indicators

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   cd One-Step-fix-it-Platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

   This will:
   - Start the React development server
   - Launch the Electron desktop app
   - Create a local database file

## Usage

### First Time Setup
1. The app will open in a desktop window
2. A database file will be created automatically in your user data folder
3. Start by adding your first project or expense

### Daily Operations

#### Adding a Project
1. Go to **Regular Projects** or **Contractor Projects**
2. Click **Add New Project**
3. Enter:
   - Client name and address
   - Project details
   - Total value (including VAT)
   - Advance payment (if any)
4. VAT and profit calculations happen automatically

#### Adding Expenses
- **Project Expenses**: Click the "+" button next to any project
- **Company Expenses**: Go to Company Expenses tab and add entries

#### Completing a Project
1. In Regular Projects, click **Complete** on an active project
2. Enter number of project managers (0, 1, or 2)
3. PM payments will be generated automatically in Partners tab

#### Managing VAT
1. Go to **VAT Tracking**
2. View quarterly reports
3. Mark VAT as paid when you pay the government
4. Current quarter VAT shows on Dashboard

#### Paying Project Managers
1. Go to **Partners** tab
2. View all pending PM payments
3. Click **Mark Paid** when you pay them
4. Amount is deducted from Owner's Balance

### Understanding Your Balance

```
Bank Balance: 100,000 AED
├─ Less: VAT to Pay (20,000 AED)
├─ Less: Client Deposits (40,000 AED)
└─ = Owner's Available Balance: 40,000 AED ✓
```

The Owner's Available Balance is what you can safely use for business or personal needs.

## Building for Production

### Create Installer

1. **Build the React app**
   ```bash
   npm run build
   ```

2. **Create desktop installer**
   ```bash
   npm run build:electron
   ```

This will create installers in the `dist` folder:
- Windows: `.exe` file
- macOS: `.dmg` file
- Linux: `.AppImage` file

### Install on Your Machine
1. Run the installer
2. An icon will appear on your desktop
3. Double-click to launch the app
4. All data is stored locally

## Data Storage

- Database location: `{User Data Folder}/financial_data.db`
  - Windows: `C:\Users\{Username}\AppData\Roaming\financial-management-platform\`
  - macOS: `~/Library/Application Support/financial-management-platform/`
  - Linux: `~/.config/financial-management-platform/`

- **Backup**: Copy the `financial_data.db` file regularly to backup your data

## VAT Calculations

### How VAT is Extracted
When you enter a total value of 105,000 AED:
- VAT Amount: 5,000 AED (5% of total)
- Project Value: 100,000 AED (excluding VAT)

Formula: `VAT = Total × (5/105)`

### Quarterly VAT Tracking
- VAT is tracked by the date payment is received
- Q1: January - March
- Q2: April - June
- Q3: July - September
- Q4: October - December

## Project Manager Payment Logic

### 1 Project Manager
- PM gets: 50% of profit
- Company gets: 50% of profit

Example: Profit = 70,000 AED
- PM1: 35,000 AED
- Company: 35,000 AED

### 2 Project Managers
- PM1 gets: 25% of profit
- PM2 gets: 25% of profit
- Company gets: 50% of profit

Example: Profit = 70,000 AED
- PM1: 17,500 AED
- PM2: 17,500 AED
- Company: 35,000 AED

### Contractor Projects
- NO PM share
- Company gets 100% of profit

## Troubleshooting

### App won't start
- Ensure Node.js is installed
- Run `npm install` again
- Check if port 3000 is available

### Database errors
- Delete the database file and restart (will lose data)
- Or restore from backup

### Calculations seem wrong
- Ensure you're entering total value WITH VAT
- Check that expenses are added correctly
- Verify advances are entered

## Technology Stack

- **Frontend**: React 18
- **Desktop**: Electron
- **Database**: SQLite (better-sqlite3)
- **Styling**: Custom CSS
- **Charts**: Recharts (future enhancement)
- **Reports**: jsPDF, xlsx (future enhancement)

## Roadmap

- [ ] PDF report generation
- [ ] Excel export functionality
- [ ] Charts and visualizations
- [ ] Backup/restore functionality
- [ ] Multi-currency support
- [ ] Invoice generation
- [ ] Client management
- [ ] Recurring expenses

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the usage instructions
3. Check database permissions

## License

Private use only - Built for home maintenance business

---

**Made with ❤️ for Dubai Home Maintenance Business**
