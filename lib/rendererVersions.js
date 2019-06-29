const xmlParser = require("xml-js"),
  settings = require("../lib/settings.json"),
  b = (global.jQuery = require("../lib/jquery-3.4.0.min.js")),
  https = require("https"),
  package = require("../package.json");

b(() => {
  let theme = b(
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

document.addEventListener("DOMContentLoaded", function() {
  // On page load
  https
    .get(
      "https://hub.spigotmc.org/nexus/service/local/repositories/snapshots/content/org/spigotmc/spigot-api/maven-metadata.xml",
      res => {
        let xmlData = "";
        res.on("data", chunk => {
          xmlData += chunk;
        });
        res.on("end", () => {
          let formattedJSON = JSON.parse(
            xmlParser.xml2json(xmlData, {
              compact: true,
              spaces: 4
            })
          );
          b("#latestVersion").html(
            `${
              formattedJSON.metadata.versioning.latest._text
            }<br> <hr style='border-color: black;' />`
          );
          formattedJSON.metadata.versioning.versions.version
            .reverse()
            .forEach(i => {
              b("#versionsWrapper").append(`${i._text}<br>`);
            });
        });
      }
    )
    .on("error", err => {
      console.log(`Error: ${err}`);
    });
});
