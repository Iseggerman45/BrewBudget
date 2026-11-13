const { app, BrowserWindow, shell, Menu } = require("electron");

const APP_URL = "https://brewbudget.vercel.app/login";
const APP_HOST = "brewbudget.vercel.app";

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
      sandbox: true
    }
  });

  win.once("ready-to-show", () => win.show());

  // Keep BrewBudget and its Supabase authentication flow inside the app.
  // Open unrelated links in the user's default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === APP_HOST || parsed.hostname.endsWith(".supabase.co") ||
          parsed.hostname.endsWith(".google.com") || parsed.hostname === "appleid.apple.com") {
        return { action: "allow" };
      }
    } catch (_) {}
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      const allowed = parsed.hostname === APP_HOST ||
        parsed.hostname.endsWith(".supabase.co") ||
        parsed.hostname.endsWith(".google.com") ||
        parsed.hostname === "appleid.apple.com";
      if (!allowed) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (_) {
      event.preventDefault();
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
