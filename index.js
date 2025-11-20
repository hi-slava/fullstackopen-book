import hey from "#utils/core/logger";
import { fetchUrls } from "#utils/commands/fetchUrls";
import { createCovers } from "#utils/commands/createCovers";
import { downloadLessons } from "#utils/commands/downloadLessons";
import { downloadImages } from "#utils/commands/downloadImages";
import { cleanHtml } from "#utils/commands/cleanHtml";
import { exportToEpub } from "#utils/commands/exportToEpub";
import { exportToPdf } from "#utils/commands/exportToPdf";
import { checkLastEpub } from "#utils/commands/checkLastEpub";
import { ConfigValidator } from "#utils/validators/ConfigValidator";

const args = process.argv.slice(2);
const command = args[0];

// Parse options
function parseOptions(args) {
  const opts = { lang: "en", type: "full", emoji: "replace" };
  args.forEach((arg) => {
    if (arg.startsWith("--lang=")) opts.lang = arg.split("=")[1];
    if (arg.startsWith("--type=")) opts.type = arg.split("=")[1];
    if (arg.startsWith("--emoji=")) opts.emoji = arg.split("=")[1];
  });
  return opts;
}

const cliOpts = parseOptions(args);

async function run() {
  try {
    // Validate configuration and CLI arguments
    const validator = new ConfigValidator();
    await validator.validate();
    validator.validateCLIArgs(cliOpts);

    const commands = {
      parts: () => fetchUrls(cliOpts.lang),
      lessons: () => downloadLessons(),
      images: () => downloadImages(),
      clean: () => cleanHtml(),
      covers: () => createCovers(),
      epub: () =>
        exportToEpub({
          language: cliOpts.lang,
          exportType: cliOpts.type,
          emojiMode: cliOpts.emoji,
        }),
      pdf: () =>
        exportToPdf({
          language: cliOpts.lang,
          exportType: cliOpts.type,
          emojiMode: cliOpts.emoji,
        }),
      check: () => checkLastEpub(),
    };

    if (commands[command]) {
      hey.info(`🔍 Running: ${command}`);
      await commands[command]();
    } else {
      hey.warn("Unknown command.");
      console.log(
        "Usage: node index.js [parts|lessons|images|clean|covers|epub|pdf|check] [--lang=en|fi|zh|es|fr|ptbr] [--type=full|course_only|exercises_only] [--emoji=replace|remove|keep]"
      );
    }
  } catch (err) {
    hey.error(err.message || err);
  }
}

run();
