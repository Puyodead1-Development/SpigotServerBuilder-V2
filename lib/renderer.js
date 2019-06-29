const { dialog } = require("electron").remote,
  moment = require("moment-timezone"),
  { spawn } = require("child_process"),
  https = require("https"),
  fs = require("fs"),
  settings = require("../lib/settings.json"),
  package = require("../package.json");

const $ = (global.jQuery = require("../lib/jquery-3.4.0.min.js"));

$(() => {
  let theme = $(
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

let directory = null;
let timezone = "America/New_York";
let options = {
  downloadBT: true,
  compileSpigot: false,
  acceptEULA: false,
  createLauncher: false,
  startAfter: false,
  directory: "",
  version: "latest"
};
function getDirectory() {
  dialog.showOpenDialog(
    {
      title: "Select Location to Create Server",
      promptToCreate: true,
      properties: ["openFile", "openDirectory"]
    },
    function callback(filePath, bookmarks) {
      directory = filePath[0];
      console.log(`Set directory path to: ${directory}`);
      $("#directoryLocation").val(directory);
      options.directory = directory;
      appendToConsole(1, `Set directory to: ${directory}`);
    }
  );
}

/** Vanilla JS/Non-Electron JS */
function getTime() {
  const options = {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric"
    },
    formatter = new Intl.DateTimeFormat([], options);

  let currentTime = formatter.format(new Date());
  return currentTime;
}
function appendToConsole(level, text) {
  let logLevel = "white";
  switch (level) {
    case 1:
      logLevel = "white;";
      break;
    case 2:
      logLevel = "red";
      break;
    case 3:
      logLevel = "green";
      break;
    default:
      logLevel = "white";
      break;
  }

  const time = getTime();

  let log = `<p style="color: ${logLevel}; font-size: 12px; padding:0; margin:0; width:100%">[${time}] ${text}</p>`;
  const consoleElem = $("#console");
  consoleElem.append(log);

  //File logging
  const logger = require("electron-log");
  logger.transports.file.level = true;
  logger.transports.console.level = false;
  switch (level) {
    case 1:
      logger.info(text);
      break;
    case 2:
      logger.error(text);
      break;
    case 3:
      logger.debug(text);
      break;
    default:
      logger.info(text);
      break;
  }
  //
  document.getElementById("console").scrollTop = document.getElementById(
    "console"
  ).scrollHeight;
}

function debug(text) {
  if (settings.mode === "debug") {
    appendToConsole(3, `(DEBUG) ${text}`);
  }
}

//Events when page is ready and loaded
$(async () => {
  console.log("page ready");
  timezone = moment.tz.guess();
  appendToConsole(1, `Auto-Detected Timezone as ${timezone}`);
  console.log(`Auto-Detected and set Timezone to ${timezone}`);
  document.getElementById("compileSpigotCheck").addEventListener(
    "click",
    function() {
      options.compileSpigot = $("#compileSpigotCheck").prop("checked");
      debug(`Updated compileSpigotCheck to ${options.compileSpigot}`);
    },
    false
  );
  document.getElementById("acceptEULACheck").addEventListener(
    "click",
    function() {
      options.acceptEULA = $("#acceptEULACheck").prop("checked");
      debug(`Updated acceptEULACheck to ${options.acceptEULA}`);
    },
    false
  );
  document.getElementById("createLauncherCheck").addEventListener(
    "click",
    function() {
      options.createLauncher = $("#createLauncherCheck").prop("checked");
      debug(`Updated createLauncherCheck to ${options.createLauncher}`);
    },
    false
  );
  document.getElementById("startAfterCheck").addEventListener(
    "click",
    function() {
      options.startAfter = $("#startAfterCheck").prop("checked");
      debug(`Updated startAfterCheck to ${options.startAfter}`);
    },
    false
  );
  document.getElementById("version").addEventListener(
    "change",
    function() {
      options.version = $("#version").val();
      debug(`Updated version to ${options.version}`);
    },
    false
  );
  document.getElementById("start").addEventListener(
    "click",
    async function() {
      appendToConsole(1, `Started at ${getTime()}`);
      await downloadBT();
    },
    false
  );

  //Beta system for populating the version dropdown selection menu
  /* //populate version selection dropdown
  https
    .get(
      "https://hub.spigotmc.org/nexus/service/local/repositories/snapshots/content/org/spigotmc/spigot-api/maven-metadata.xml",
      res => {
        let xmlData = "";
        res.on("data", chunk => {
          xmlData += chunk;
        });
        res.on("end", () => {
          console.log(xmlData);
          let formattedJSON = JSON.parse(
            xmlParser.xml2json(xmlData, {
              compact: true,
              spaces: 4
            })
          );
          formattedJSON.metadata.versioning.versions.version
            .reverse()
            .forEach(i => {
              if (i._text.indexOf("-pre") > -1) {
                //is a pre
                return;
              } else {
                $("#version").append(
                  `<option>${i._text
                    .replace("-R0.1-SNAPSHOT", " ")
                    .replace("-SNAPSHOT", " ")}</option>`
                );
              }
            });
        });
      }
    )
    .on("error", err => {
      console.log(`Error: ${err}`);
    }); */
});

async function downloadBT() {
  if (
    !fs.existsSync(`${options.directory}\\build\\spigot-${options.version}.jar`)
  ) {
    if (!fs.existsSync(`${options.directory}\\Build\\BuildTools.jar`)) {
      appendToConsole(1, `----Downloading BuildTools----`);
      //Download latest buildtools
      const outputFile = options.directory + "\\Build\\BuildTools.jar";
      const BTURL =
        "https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar";

      const download = async function(url, dest, cb) {
        if (!fs.existsSync(`${options.directory}\\Build`)) {
          await fs.mkdirSync(`${options.directory}\\Build`);
        }
        let file = await fs.createWriteStream(dest);
        let response = await https.get(url, async function(response) {
          await response.pipe(file);
          file.on("finish", async () => {
            await file.close(cb);
          });
          file.on("error", async error => {
            appendToConsole(2, `Download Error: ${error}`);
            console.log(`Download Error: ${error}`);
            await file.close(cb);
          });
        });
        response.on("error", error => {
          console.log(`Download Error: ${error}`);
          appendToConsole(2, `Download Error: ${error}`);
        });
      };
      async function callback() {
        console.log("BuildTools Download Complete");
        appendToConsole(1, "BuildTools Download Complete");
        if (options.compileSpigot) {
          return checkForJava();
        } else {
          appendToConsole(
            2,
            `You didn't select to compile Spigot, not continuing!`
          );
          debug(`You didn't select to compile Spigot, not continuing!`);
          return console.log(
            `You didn't select to compile Spigot, not continuing!`
          );
        }
      }

      await download(BTURL, outputFile, callback);
    } else {
      appendToConsole(1, `------BuildTools.jar Found, not downloading----`);
      if (options.compileSpigot) {
        return checkForJava();
      } else {
        appendToConsole(
          2,
          `You didn't select to compile Spigot, not continuing!`
        );
        debug(`You didn't select to compile Spigot, not continuing!`);
        return console.log(
          `You didn't select to compile Spigot, not continuing!`
        );
      }
    }
  } else {
    console.log(
      `Found spigot-${options.version}.jar, not downloading buildtools`
    );
    appendToConsole(
      1,
      `Found spigot-${options.version}.jar, not downloading buildtools`
    );
    debug(`Found spigot-${options.version}.jar, not downloading buildtools`);
    return moveSpigotJAR();
  }
}

function checkForJava() {
  appendToConsole(1, `----Checking for Java Installation----`);
  const javaCheckCMD = spawn("java", ["-version"]);
  javaCheckCMD.on("close", code => {
    if (code !== 1) {
      //Java installed
      debug(`Seems like java is installed`);
      appendToConsole(1, `Looks like Java is installed!`);
      //Compile buildtools
      return compileSpigot();
    } else {
      //Java not installed
      console.log(`Java not installed! Cannot continue!`);
      debug(`Java not installed! Cannot continue!`);
      return appendToConsole(2, `Java not installed! Cannot continue!`);
    }
  });
}
function compileSpigot() {
  appendToConsole(1, `----Compiling Spigot----`);
  if (
    fs.existsSync(`${options.directory}\\Build\\spigot-${options.version}.jar`)
  ) {
    appendToConsole(
      1,
      `spigot-${options.version}.jar found in build directory, not recompiling!`
    );
    return moveSpigotJAR();
  }
  const compileSpigotCMD = spawn("cmd", [
    "/c",
    "cd",
    "/d",
    `${options.directory}\\Build`,
    "&&",
    "java",
    "-jar",
    "BuildTools.jar",
    "--rev",
    options.version
  ]);
  compileSpigotCMD.stdout.on("data", data => {
    appendToConsole(1, `[JAVA OUTPUT]: ${data}`);
  });
  compileSpigotCMD.stderr.on("data", data => {
    appendToConsole(2, `[JAVA OUTPUT]: ${data}`);
  });
  compileSpigotCMD.on("close", code => {
    if (code === 0) {
      appendToConsole(1, `Java returned ${code}. We're okay to continue!`);
      //Move jar
      return moveSpigotJAR();
    } else {
      return appendToConsole(2, `Java returned ${code}. Not continuing!`);
    }
  });
}
async function moveSpigotJAR() {
  appendToConsole(1, `----Moving JAR----`);
  if (!fs.existsSync(`${options.directory}\\Server`)) {
    await fs.mkdirSync(`${options.directory}\\Server`);
  }
  const moveSpigotCMD = spawn("cmd", [
    "/c",
    "move",
    `${options.directory}\\Build\\spigot-${options.version}.jar`,
    `${options.directory}\\Server`
  ]);
  moveSpigotCMD.stdout.on("data", data => {
    appendToConsole(1, `[MOVE OUTPUT]: ${data}`);
  });
  moveSpigotCMD.stderr.on("data", data => {
    appendToConsole(2, `[MOVE OUTPUT]: ${data}`);
  });
  moveSpigotCMD.on("close", code => {
    if (code !== 1) {
      appendToConsole(1, `Moving Spigot existed with code ${code}.`);
      //All good, create eula
      createEULA();
    } else {
      return appendToConsole(
        2,
        `Moving Spigot exited with code ${code}. Not Continuing!`
      );
    }
  });
}

async function createEULA() {
  appendToConsole(1, `----Creating EULA----`);
  if (options.acceptEULA) {
    //They accepted the eula
    await fs.writeFile(
      `${options.directory}\\Server\\eula.txt`,
      "eula=true",
      err => {
        if (err) {
          console.log("Error creating EULA file!");
          appendToConsole(
            2,
            `Error creating EULA file at ${options.directory}\\Server\\eula.txt`
          );
        } else {
          appendToConsole(1, `EULA creation and acceptance succeeded`);
          //Create launcher
          createLauncher();
        }
      }
    );
  } else {
    console.log(`You didn't selected to create and accept the EULA.`);
    appendToConsole(1, `You didn't selected to create and accept the EULA.`);
    debug(`You didn't selected to create and accept the EULA.`);
  }
}

async function createLauncher() {
  appendToConsole(1, `----Creating Launcher----`);
  if (options.createLauncher) {
    //create launcher
    await fs.writeFile(
      `${options.directory}\\Server\\launcher.bat`,
      `java -jar spigot-${options.version}.jar`,
      err => {
        if (err) {
          console.log("Error creating launcher file!");
          return appendToConsole(
            2,
            `Error creating launcher file at ${
              options.directory
            }\\Server\\start.bat`
          );
        } else {
          appendToConsole(1, `Creating launcher succeeded`);
          //Run after
          startAfter();
        }
      }
    );
  } else {
    console.log(`You didn't selected to create the launcher.`);
    appendToConsole(1, `You didn't selected to create the launcher.`);
    debug(`You didn't selected to create the launcher.`);
  }
}

function startAfter() {
  appendToConsole(1, "-------Start Server After Creation---------");
  if (options.startAfter) {
    //Start after
    const startAfterCMD = spawn("cmd", [
      "/c",
      "start",
      "/D",
      `${options.directory}\\Server`,
      "launcher.bat",
      "&&",
      "exit"
    ]);
    startAfterCMD.stdout.on("data", data => {
      appendToConsole(1, `[START AFTER OUTPUT]: ${data}`);
    });
    startAfterCMD.stderr.on("data", data => {
      appendToConsole(2, `[START AFTER OUTPUT]: ${data}`);
    });
    startAfterCMD.on("close", code => {
      if (code !== 1) {
        appendToConsole(1, `Start Server existed with code ${code}.`);
        //END OF THE LINE!
        return appendToConsole(1, `-----WE'RE ALL DONE!------`);
      } else {
        appendToConsole(
          2,
          `Start server exited with code ${code}. Not Continuing!`
        );
        return appendToConsole(1, `-----WE'RE ALL DONE!------`);
      }
    });
  } else {
    //dont start after
    console.log(`You didn't selected to start the server after creation.`);
    appendToConsole(
      1,
      `You didn't selected to start the server after creation.`
    );
    debug(`You didn't selected to start the server after creation.`);
  }
}

function cleanUp() {
  //cleans up build directory and removes leftover crap
  const rimraf = require("rimraf");
  rimraf(`${options.directory}\\Build`, () => {
    //success
  });
}
