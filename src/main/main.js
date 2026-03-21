const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const isDev = process.env.NODE_ENV === 'development';

const { initDatabase } = require('./database/db');
const { setupIPC } = require('./ipc/handlers');

let mainWindow;

async function findVitePort() {
  // Wait for Vite to fully start
  await new Promise(r => setTimeout(r, 2000));
  
  for (let port = 5176; port <= 5200; port++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 800 }, (res) => {
          if (res.statusCode < 500) resolve();
          else reject();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(); });
      });
      console.log(`[PORT] Found Vite on ${port}`);
      return port;
    } catch (e) {}
  }
  console.log('[PORT] Fallback to 5173');
  return 5173;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, '../../public/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../public/images/icon.ico'),
  });

  if (isDev) {
    findVitePort().then(port => {
      const url = `http://127.0.0.1:${port}`;
      console.log(`[APP] Loading: ${url}`);
      mainWindow.loadURL(url);
    });
  } else {
    mainWindow.loadURL('file://' + path.join(__dirname, '../../dist/index.html'));
  }

  if (isDev) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
  initDatabase();
  setupIPC();
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
