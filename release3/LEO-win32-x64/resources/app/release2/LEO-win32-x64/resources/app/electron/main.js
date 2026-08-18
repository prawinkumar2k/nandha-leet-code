const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === 'development';
const PORT = 3001;
const VITE_PORT = 5174; // May shift if 5173 is taken

function startBackend() {
    const appPath = app.getAppPath();
    const serverPath = path.join(appPath, 'backend', 'server.js');

    const dbDir = path.join(app.getPath('userData'), 'LeetCodeData');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'leetcode_tracking.db');

    backendProcess = fork(serverPath, [], {
        env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: String(PORT),
            DB_PATH: dbPath
        },
        silent: false
    });

    backendProcess.on('error', (err) => {
        console.error('Backend process error:', err);
    });

    backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });

    // Poll until the backend is actually ready (max 15s)
    return new Promise((resolve, reject) => {
        const http = require('http');
        let attempts = 0;
        const check = () => {
            attempts++;
            const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
                resolve();
            });
            req.on('error', () => {
                if (attempts < 30) setTimeout(check, 500);
                else reject(new Error('Backend did not start in time'));
            });
            req.end();
        };
        setTimeout(check, 500);
    });
}

async function createWindow() {
    // Always start backend (in prod it's a child, in dev it runs separately)
    if (!isDev) {
        await startBackend();
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'LEO',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
        backgroundColor: '#0f172a',
        show: false
    });

    // Load the app
    if (isDev) {
        // Try 5173 first, then 5174
        const devUrl = 'http://localhost:5173';
        mainWindow.loadURL(devUrl).catch(() => {
            mainWindow.loadURL('http://localhost:5174');
        });
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(app.getAppPath(), 'frontend', 'dist', 'index.html');
        mainWindow.loadFile(indexPath);
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Register IPC handlers AFTER app is ready
    ipcMain.handle('open-external', async (event, url) => {
        await shell.openExternal(url);
    });

    ipcMain.handle('select-file', async (event, options) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
            properties: ['openFile'],
            ...options
        });
        return result;
    });

    ipcMain.handle('select-save-path', async (event, options) => {
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('get-db-path', () => {
        return process.env.DB_PATH || 'dev-mode';
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});
