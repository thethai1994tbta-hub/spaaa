const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// License system
const { getMachineId, loadLicense, activateLicense } = require('./license');

// Firebase setup
const { initDatabase: initFirebase } = require('./database/firebaseDb');
const { setupFirebaseIPC } = require('./ipc/firebaseHandlers');

// SQLite fallback
const { initDatabase: initSQLite } = require('./database/db');
const { setupIPC: setupSQLiteIPC } = require('./ipc/handlers');

let mainWindow;
let useFirebase = false;

function createWindow() {
  // Resolve preload path - handle both dev and prod
  let preloadPath;
  if (isDev) {
    // In development: src/main/main.js -> ../../public/preload.js
    preloadPath = path.resolve(__dirname, '../../public/preload.js');
  } else {
    // In production: app in dist folder
    preloadPath = path.resolve(__dirname, '../../public/preload.js');
  }

  console.log('[APP] Preload path:', preloadPath);
  console.log('[APP] File exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../../public/images/icon.ico'),
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:"
        ]
      }
    });
  });

  const url = isDev ? 'http://127.0.0.1:5173' : 'file://' + path.join(__dirname, '../../dist/index.html');
  console.log(`[APP] Loading: ${url}`);
  mainWindow.loadURL(url);

  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ==================== LICENSE IPC ====================
ipcMain.handle('license:check', async () => {
  if (isDev) return { valid: true, dev: true };
  return loadLicense();
});

ipcMain.handle('license:getMachineId', async () => {
  return getMachineId();
});

ipcMain.handle('license:activate', async (event, licenseKey, expiryDate) => {
  return activateLicense(licenseKey, expiryDate);
});

app.on('ready', async () => {
  try {
    // Try to initialize Firebase
    const firebaseConfigPath = path.join(__dirname, '../config/firebase-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
      console.log('[APP] Firebase config found, initializing...');
      await initFirebase();
      setupFirebaseIPC();
      useFirebase = true;
      console.log('[APP] Using Firebase as database');
    } else {
      console.log('[APP] Firebase config not found, using SQLite');
      initSQLite();
      setupSQLiteIPC();
      useFirebase = false;
    }
  } catch (error) {
    console.error('[APP] Firebase initialization failed:', error.message);
    console.log('[APP] Falling back to SQLite');
    initSQLite();
    setupSQLiteIPC();
    useFirebase = false;
  }

  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

function createMenu() {
  const template = [
    { label: 'File', submenu: [{ label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
