const log = require("electron-log"),
  { autoUpdater } = require("electron-updater"),
  {
    app,
    BrowserWindow,
    globalShortcut,
    ipcMain,
    webContents
  } = require("electron"),
  debug = require("electron-debug"),
  package = require("./package.json"),
  path = require("path"),
  fs = require("fs"),
  settings = require("./lib/settings.json"),
  releaseNotes = require("./lib/releaseNotes.json");

//Debug
if (settings.mode === "debug") {
  debug();
} else {
  if (settings.useSentry) {
    log.debug("Sentry enabled");
    //Sentry - only when not in debug mode and sentry is enabled.
    const Sentry = require("@sentry/electron");

    Sentry.init({
      dsn: "https://59dacebbe4ac43328d7f9b8c7eee9562@sentry.io/1445781",
      enableNative: false,
      release: `SpigotServerBuilder@${package.version}`
    });
  }
}

//Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

let win;

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "./lib/sentry.js")
    }
  });
  win.maximize();
  win.setMenu(null);
  win.setTitle(`SpigotServerBuilder V${package.version}`);

  win.loadFile("./pages/index.html");

  // Open the DevTools.
  //win.webContents.openDevTools();

  win.on("closed", () => {
    win = null;
  });
}

//Updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
//Disable this until i can get click callbacks working
/* autoUpdater.on("update-available", info => {
  win.webContents.send("sendNotify", {
    theme: "metroui",
    type: "alert",
    closeWith: ["click"],
    text: `Update Available! Click to download v${info.version}.`,
    callbacks: {
      onClick: function() {
        const { ipcRenderer } = require("electron");

        console.log("download update: true");
        ipcRenderer.send("downloadUpdate", true);
      }
    }
  });
  log.info("Update available.");
}); */
autoUpdater.on("update-not-available", info => {
  win.webContents.send("sendNotify", {
    theme: "metroui",
    type: "alert",
    closeWith: ["click"],
    timeout: 5000,
    progressBar: true,
    text: `No updates available. Latest: ${info.version}; Running: ${
      package.version
    }`
  });
  log.info(
    `No updates available. Running version: ${package.version}; Latest: ${
      info.version
    }.`
  );
});
autoUpdater.on("error", err => {
  win.webContents.send("sendNotify", {
    theme: "metroui",
    type: "error",
    closeWith: ["click"],
    text: `Error occured with the updater: ${err.message}. Click to dismiss.`
  });
  log.info(`Error updating: ${err}`);
});

//Disable until fix spam
/* autoUpdater.on("download-progress", progressObj => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + " - Downloaded " + progressObj.percent + "%";
  log_message =
    log_message +
    " (" +
    progressObj.transferred +
    "/" +
    progressObj.total +
    ")";
  win.webContents.send("sendNotify", {
    theme: "metroui",
    type: "info",
    closeWith: ["click"],
    text: log_message
  });
  log.info(log_message);
}); */
autoUpdater.on("update-downloaded", info => {
  win.webContents.send("sendNotify", {
    theme: "metroui",
    type: "info",
    closeWith: ["click"],
    text:
      "Update Ready! It will be installed when you close the application. Click to dismiss."
  });
  log.info("Update downloaded.");

  settings.hasSeenChangelog = false;
  fs.writeFile("./lib/settings.json", JSON.stringify(settings), function(err) {
    if (err) return console.log(err);
    console.log("Reset changelog");
  });
});

//new way
(async () => {
  await app.whenReady();
  await createWindow();
  await autoUpdater.checkForUpdates();
  if (!settings.hasSeenChangelog) {
    win.webContents.send("showChangelog", true);
    win.webContents.send("changelogData", releaseNotes.latest);
  }
  globalShortcut.register("F5", () => {
    BrowserWindow.getFocusedWindow().webContents.reload();
  });
  globalShortcut.register("F11", () => {
    BrowserWindow.getFocusedWindow().webContents.toggleDevTools();
  });
})();

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

ipcMain.on("downloadUpdate", (event, args) => {
  autoUpdater.downloadUpdate();
});
