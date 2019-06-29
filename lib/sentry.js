const { init } = require("@sentry/electron"),
  package = require("../package.json");

//Sentry
init({
  dsn: "https://59dacebbe4ac43328d7f9b8c7eee9562@sentry.io/1445781",
  enableNative: false,
  release: `SpigotServerBuilder@${package.version}`
});
