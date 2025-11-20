import launchPuppeteer from "#utils/helpers/puppeteerLauncher";
import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import config from "#config";
import { ensureDirExists } from "#utils/helpers/fsHelpers";
import hey from "#utils/core/logger";
import { WebScraper } from "#utils/core/AsyncProcessor";
import { ProgressTracker } from "#utils/core/ProgressTracker";

export async function downloadLessons() {
  const scraper = new WebScraper({ maxConcurrency: 2, rateLimit: 1500 });

  const raw = await fs.readFile(
    config.OUTPUT.dataJSON,
    "utf-8"
  );
  const parts = JSON.parse(raw);

  await ensureDirExists(config.OUTPUT.raw);

  // Collect all lessons for batch processing
  const allLessons = [];
  for (const part of parts) {
    for (const lesson of part.lessons) {
      allLessons.push({ ...lesson, part });
    }
  }

  const progressTracker = new ProgressTracker(allLessons.length, "Downloading lessons");

  // Process lessons with concurrency and progress tracking
  const { results, errors } = await scraper.processWithProgress(
    allLessons,
    async (lesson) => {
      const filename = `${lesson.lessonID}.html`;
      const filePath = path.resolve(config.OUTPUT.raw, filename);

      const browser = await launchPuppeteer();
      const page = await browser.newPage();

      try {
        await page.goto(lesson.url, {
          waitUntil: "networkidle2",
        });

        const content = await page.evaluate(() => {
          const el = document.querySelector(
            ".course-content-container"
          );
          return el ? el.outerHTML : "";
        });

        const dom = new JSDOM(content, {
          url: config.BASE_URL,
        });
        const { document } = dom.window;

        const images = document.querySelectorAll("img");
        images.forEach((img) => {
          img.setAttribute("src", img.src);
        });

        const html = `<!DOCTYPE html>
          <html><head><meta charset="UTF-8"><title>${lesson.lessonTitle}</title></head><body>
          ${document.body.innerHTML}
          </body></html>`;

        await fs.writeFile(filePath, html, "utf-8");

        const timeStamp = new Date();
        await fs.writeFile(
          config.OUTPUT.lessonsDate,
          timeStamp.toISOString().slice(0, 10),
          "utf-8"
        );

        await browser.close();
        return { success: true, lesson: lesson.lessonID };
      } catch (err) {
        await browser.close();
        throw new Error(`Failed to download ${lesson.lessonID}: ${err.message}`);
      }
    },
    progressTracker
  );

  // Report results
  if (errors.length > 0) {
    hey.warn(`⚠️ ${errors.length} lessons failed to download:`);
    errors.forEach(({ item, error }) => {
      hey.warn(`  - ${item.lessonID}: ${error.message}`);
    });
  }

  progressTracker.complete(`${results.length} lessons downloaded successfully`);
}
