import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import config from "#config";
import { ensureDirExists } from "#utils/helpers/fsHelpers";
import hey from "#utils/core/logger";
import { FileProcessor } from "#utils/core/AsyncProcessor";
import { ProgressTracker } from "#utils/core/ProgressTracker";

export async function downloadImages() {
  hey.basic("📦 Starting image download...");

  // Step 1: Read list of image URLs
  const imgsList = await fs.readFile(
    config.OUTPUT.imgsJSON,
    "utf-8"
  );
  const imgs = JSON.parse(imgsList);

  // Step 2: Ensure image output directory exists
  await ensureDirExists(config.OUTPUT.imgs);

  const processor = new FileProcessor({ maxConcurrency: 5 });
  const progressTracker = new ProgressTracker(imgs.length, "Downloading images");

  // Process images with concurrency and progress tracking
  const { results, errors } = await processor.processWithProgress(
    imgs,
    async (imgUrl) => {
      try {
        const url = new URL(imgUrl);
        const filename = url.pathname.substring(1);
        const outputPath = path.resolve(config.OUTPUT.imgs, filename);

        const res = await fetch(imgUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await ensureDirExists(path.dirname(outputPath));
        await fs.writeFile(outputPath, buffer);

        return { success: true, filename };
      } catch (err) {
        throw new Error(`Failed to download ${imgUrl}: ${err.message}`);
      }
    },
    progressTracker
  );

  // Report results
  if (errors.length > 0) {
    hey.warn(`⚠️ ${errors.length} images failed to download:`);
    errors.forEach(({ item, error }) => {
      hey.warn(`  - ${item}: ${error.message}`);
    });
  }

  progressTracker.complete(`${results.length} images downloaded successfully`);
}
