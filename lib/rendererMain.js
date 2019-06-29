/**IPC */
const { ipcRenderer } = require("electron"),
  a = (global.jQuery = require("../lib/jquery-3.4.0.min.js")),
  package = require("../package.json");

a(() => {
  let theme = a(
    '<link href="' + settings.themes[settings.theme] + '" rel="stylesheet" />'
  );
  theme.appendTo("head");
});

if (settings.mode === "prod") {
  if (settings.useSentry) {
    console.log("Sentry enabled");
    //Sentry - only when not in debug mode and sentry is enabled.
    const Sentry = require("@sentry/electron");

    Sentry.init({
      dsn: "https://59dacebbe4ac43328d7f9b8c7eee9562@sentry.io/1445781",
      enableNative: false,
      release: `SpigotServerBuilder@${package.version}`
    });
  }
}

ipcRenderer.on("sendNotify", (event, args) => {
  new Noty(args).show();
});

ipcRenderer.on("changelogData", (event, args) => {
  if ((document.getElementById("changelog-modal").style.display = "block")) {
    let i = args.join(" ");
    a("#changelog-data").append(i);
  } else {
    document.getElementById("changelog-modal").style.display = "block";
    args.forEach(i => {
      a("#changelog-data").append(i);
    });
  }
});

ipcRenderer.on("showChangelog", (event, args) => {
  document.getElementById("changelog-modal").style.display = "block";
});
