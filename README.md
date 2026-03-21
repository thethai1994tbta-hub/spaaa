# SPA VIP Management System

Professional SPA Management Desktop Application built with Electron, React, and SQLite.

## Features

- **100% Offline** - Works completely offline with local SQLite database
- **7 Main Modules**:
  - Dashboard - Revenue and booking overview
  - Booking Management - Schedule appointments
  - Payment POS - Process transactions
  - Inventory Management - Track products and supplies
  - Customer Management - Maintain customer database
  - Staff Management - Manage staff and commissions
  - Reports - Generate and export reports
- **Export Capabilities** - Export to PDF and Excel
- **Dark/Light Theme** - Customizable UI theme
- **Auto-Backup** - Manual backup of database
- **Responsive Design** - Works on different screen sizes

## Tech Stack

- **Frontend**: React 18 + Ant Design 5
- **Desktop**: Electron 27
- **Database**: SQLite with better-sqlite3
- **Build**: Vite + Electron Builder
- **Styling**: Ant Design + Custom CSS

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Start development server:
```bash
npm start
```

This will start both Vite (port 5173) and Electron simultaneously.

## Development

```bash
# Start development mode with hot reload
npm start

# Dev mode with React DevTools
npm run dev:react

# Run Electron only
npm run dev:electron
```

## Building

### Build for production:
```bash
npm run build
```

This will:
1. Build React bundle with Vite
2. Package with Electron Builder
3. Create Windows installer (.exe) in `dist/` folder

### Build output:
- `SpaApp-Setup-1.0.0.exe` - NSIS Installer
- `SpaApp-Portable-1.0.0.exe` - Portable executable

## File Structure

```
spa_vip/
├── public/                    # Static assets & HTML entry
│   ├── index.html            # Main HTML file
│   └── preload.js            # Electron security
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js          # App initialization
│   │   ├── database/        # SQLite database
│   │   ├── api/             # API handlers
│   │   └── ipc/             # IPC communication
│   └── renderer/            # React frontend
│       ├── pages/           # Page components
│       ├── components/      # Reusable components
│       ├── hooks/           # Custom hooks
│       ├── context/         # React context
│       ├── utils/           # Utility functions
│       └── styles/          # CSS styling
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies
└── electron-builder.json    # Build configuration
```

## Database

SQLite database location:
```
%APPDATA%\SpaApp\spa.db
```

Backup location:
```
%APPDATA%\SpaApp\backups\
```

## Configuration

App configuration is stored in:
```
%APPDATA%\SpaApp\config.json
```

## Troubleshooting

### App won't start
1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install --legacy-peer-deps`
3. Try `npm start` again

### Database errors
1. Check database file at `%APPDATA%\SpaApp\spa.db`
2. Ensure write permissions to `%APPDATA%\SpaApp\`
3. Delete corrupted `.db` file to reset database

### Build issues
- Ensure you have Visual C++ Build Tools installed
- Try `npm run build:react` then `npm run build:electron` separately

## Features Roadmap

### Phase 1 (Current):
- Core CRUD operations for all modules
- Basic dashboard with statistics
- Manual backup functionality
- PDF/Excel export

### Phase 2 (Future):
- QR code check-in
- Email/SMS notifications
- SMS integration
- Advanced reporting
- Member loyalty program
- API integration with external services

## Support

For issues and feature requests, please refer to the documentation or contact support.

---

**Version**: 1.0.0  
**License**: Proprietary  
**Developer**: SPA VIP Management
