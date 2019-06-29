const c = (global.jQuery = require("../lib/jquery-3.4.0.min.js")),
  fs = require("fs"),
  settings = require("../lib/settings.json");

c(() => {
  let theme = c(
    '<link href="' + settings.themes[settings.theme] + '" rel="stylesheet" />'
  );
  document.getElementById(settings.theme).setAttribute("selected", true);
  theme.appendTo("head");
  c("#themeSelect").click(() => {
    const themeURL = settings.themes[c("#themeSelect").val()];
    theme.attr("href", themeURL);

    settings.theme = c("#themeSelect").val();
    fs.writeFile("./lib/settings.json", JSON.stringify(settings), function(
      err
    ) {
      if (err) return console.log(err);
      console.log("update theme setting");
    });
  });
});

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("useSentry").addEventListener(
    "click",
    async function() {
      console.log("toggle sentry");
      settings.useSentry = document.getElementById("useSentry").checked;
      fs.writeFile("./lib/settings.json", JSON.stringify(settings), function(
        err
      ) {
        if (err) return console.log(err);
        console.log("update sentry");
      });
    },
    false
  );
  if (settings.useSentry) {
    document.getElementById("useSentry").checked = true;
  }
});
