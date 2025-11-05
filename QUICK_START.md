# Quick Start Guide

## Installation (First Time)

1. **Open Terminal/Command Prompt** in this folder

2. **Install Dependencies**
   ```bash
   npm install
   ```
   Wait for all packages to download (this may take a few minutes)

3. **Start the Application**
   ```bash
   npm start
   ```

4. **The App Will Open**
   - A browser window may open (you can close it)
   - The desktop app window will appear
   - First launch may take 30-60 seconds

## Daily Use

After installation, just run:
```bash
npm start
```

## First Steps in the App

1. **Add a Project**
   - Click "Regular Projects" in the sidebar
   - Click "Add New Project"
   - Enter project details
   - Total value should INCLUDE VAT (e.g., 105,000 for a 100k project)

2. **Add Company Expense**
   - Click "Company Expenses"
   - Click "Add New Expense"
   - Select category and enter amount

3. **Check Dashboard**
   - Click "Dashboard" to see your balance breakdown
   - Owner's Available Balance = what you can use

## Important Notes

### VAT Calculation
- Always enter the TOTAL amount (including VAT)
- Example: Client pays 105,000 AED
  - The system extracts: VAT = 5,000 AED
  - Project value = 100,000 AED

### Bank Balance Logic
```
Bank Balance = Money In - Money Out
Owner's Balance = Bank Balance - VAT Owed - Client Deposits
```

### Completing Projects
1. In Regular Projects, click "Complete"
2. Enter number of PMs (0, 1, or 2)
3. PM payments appear in Partners tab
4. Mark as paid when you pay the PMs

### VAT Tracking
- Go to VAT Tracking tab
- See quarterly breakdown
- Current quarter shows on dashboard
- Mark as paid when you pay government

## Keyboard Shortcuts

- No special shortcuts currently
- Navigate using sidebar
- Forms have standard Tab navigation

## Stopping the App

1. Close the app window
2. Press `Ctrl+C` in terminal (if it doesn't stop automatically)

## Creating Desktop Installer

When ready to create a standalone desktop app:

```bash
npm run build
npm run build:electron
```

Look in the `dist` folder for installer files.

## Backup Your Data

Database location:
- Windows: `C:\Users\{YourName}\AppData\Roaming\financial-management-platform\financial_data.db`
- macOS: `~/Library/Application Support/financial-management-platform/financial_data.db`
- Linux: `~/.config/financial-management-platform/financial_data.db`

**Copy this file regularly to backup your data!**

## Need Help?

Check README.md for detailed documentation.

---

**Happy Financial Management! 💰**
