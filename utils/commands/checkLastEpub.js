import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import hey from "#utils/core/logger";
import config from "#config";

const execAsync = promisify(exec);

/**
 * Find the most recently created EPUB file in the output directory
 * @returns {Promise<string|null>} Path to the most recent EPUB file or null if none found
 */
async function findLastEpubFile() {
  try {
    const outputDir = config.OUTPUT.root;
    const files = await fs.readdir(outputDir);

    const epubFiles = files.filter((file) => file.endsWith(".epub"));

    if (epubFiles.length === 0) {
      return null;
    }

    // Get file stats to find the most recently modified
    const filesWithStats = await Promise.all(
      epubFiles.map(async (file) => {
        const filePath = path.join(outputDir, file);
        const stats = await fs.stat(filePath);
        return {
          path: filePath,
          mtime: stats.mtime,
        };
      })
    );

    // Sort by modification time (most recent first)
    filesWithStats.sort((a, b) => b.mtime - a.mtime);

    return filesWithStats[0].path;
  } catch (error) {
    hey.error(`Failed to find EPUB files: ${error.message}`);
    throw error;
  }
}

/**
 * Check the last generated EPUB file using epubcheck
 */
export async function checkLastEpub() {
  try {
    const epubPath = await findLastEpubFile();

    if (!epubPath) {
      hey.warn("No EPUB files found in output directory.");
      return;
    }

    hey.info(`Checking EPUB file: ${path.basename(epubPath)}`);

    try {
      const { stdout, stderr } = await execAsync(`epubcheck "${epubPath}"`);

      if (stderr) {
        hey.warn(stderr);
      }

      if (stdout) {
        console.log(stdout);
      }

      hey.success("✅ EPUB validation complete!");
    } catch (error) {
      // epubcheck exits with non-zero code if there are errors
      // but we still want to show the output
      if (error.stdout) {
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.error(error.stderr);
      }
      hey.error("❌ EPUB validation found issues (see output above)");
      throw error;
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      hey.error("epubcheck command not found. Please install epubcheck:");
      hey.info("  npm install -g epubcheck");
      hey.info("  or");
      hey.info("  brew install epubcheck");
    } else {
      hey.error(`Failed to check EPUB: ${error.message}`);
    }
    throw error;
  }
}
