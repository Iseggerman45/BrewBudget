const { app, BrowserWindow, shell, Menu } = require("electron");

const APP_URL = "https://brewbudget.vercel.app/login";
const ALLOWED_HOSTS = new Set([
  "brewbudget.vercel.app",
  "swmdcdlgnfluuylgpuve.supabase.co",
  "accounts.google.com",
  "appleid.apple.com"
]);

function isTrustedNavigation(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function openExternalSafely(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "https:" || url.protocol === "mailto:") {
      void shell.openExternal(url.toString());
    }
  } catch {
    // Ignore malformed or unsupported navigation targets.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    title: "BrewBudget",
    backgroundColor: "#11131b",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false
    }
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedNavigation(url)) return { action: "allow" };
    openExternalSafely(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedNavigation(url)) {
      event.preventDefault();
      openExternalSafely(url);
    }
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
