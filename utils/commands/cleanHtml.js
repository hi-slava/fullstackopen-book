import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import sanitizeHtml from "sanitize-html";
import config from "#config";
import { ensureDirExists } from "#utils/helpers/fsHelpers";
import hey from "#utils/core/logger";
import * as emoji from "node-emoji";
import { HTMLProcessor } from "#utils/processors/HTMLProcessor";
import { FileProcessor } from "#utils/core/AsyncProcessor";
import { ProgressTracker } from "#utils/core/ProgressTracker";

// Helper: Build a map of URL paths to lesson files
function buildUrlToLessonMap(parts) {
  const urlToLessonMap = new Map();
  for (const part of parts) {
    const partPath = new URL(part.partUrl).pathname;
    const partFile = `${part.partID}-cover.html`;
    urlToLessonMap.set(partPath, partFile);
    for (const lesson of part.lessons) {
      const urlPath = new URL(lesson.url).pathname;
      const lessonFile = `${lesson.lessonID}.html`;
      urlToLessonMap.set(urlPath, lessonFile);
    }
  }
  return urlToLessonMap;
}

// Helper: Normalize URL paths and remove trailing slashes
function normalizePath(urlPath) {
  if (urlPath.includes("fullstackopen.com")) {
    urlPath = new URL(urlPath).pathname;
  }
  if (urlPath.length > 1 && urlPath.endsWith("/")) {
    return urlPath.slice(0, -1);
  }
  return urlPath;
}

// Helper: Get all IDs in a document for fragment checking
function collectIds(document) {
  return new Set(
    [...document.querySelectorAll("[id]")].map(
      (el) => el.id
    )
  );
}

// Utility: Replace emojis in a string with their text equivalents
export function replaceEmojis(input, mode = "replace") {
  switch (mode) {
    case "replace":
      // Replace emoji with their markdown name (e.g., :heart:)
      return emoji.unemojify(input);
    case "remove":
      // Remove all emojis
      return emoji.strip(input);
    case "keep":
    default:
      // Do nothing
      return input;
  }
}

export async function cleanHtml() {
  const data = await fs.readFile(
    config.OUTPUT.dataJSON,
    "utf-8"
  );
  const parts = JSON.parse(data);

  const allImageURLs = [];
  const files = await fs.readdir(config.OUTPUT.raw);
  await ensureDirExists(config.OUTPUT.clean);

  const processor = new FileProcessor({ maxConcurrency: 3 });
  const progressTracker = new ProgressTracker(files.length, "Cleaning HTML files");

  // Filter HTML files
  const htmlFiles = files.filter(file => /^[\w\-\.]+\.html$/.test(file));

  // Build index of all lesson files & their IDs (for fragment validation)
  const lessonIdIndex = {};
  for (const file of htmlFiles) {
    const html = await fs.readFile(
      path.resolve(config.OUTPUT.raw, file),
      "utf-8"
    );
    const dom = new JSDOM(html);
    lessonIdIndex[file] = collectIds(dom.window.document);
  }

  const urlToLessonFile = buildUrlToLessonMap(parts);

  // Process files with concurrency and progress tracking
  const { results, errors } = await processor.processWithProgress(
    htmlFiles,
    async (file) => {
      const rawPath = path.resolve(config.OUTPUT.raw, file);
      const cleanPath = path.resolve(config.OUTPUT.clean, file);
      const filePartID = Number(file.split("-")[0]);
      const part = parts.find((p) => p.partID === filePartID);
      const lesson = part?.lessons.find(
        (l) => l.lessonID === file.replace(".html", "")
      );

      const html = await fs.readFile(rawPath, "utf-8");
      
      // Use the new HTMLProcessor
      const htmlProcessor = new HTMLProcessor({
        emojiMode: config.CONTENT_OPTIONS.emojiHandling,
        accentColor: part?.accentColor || "#ccc",
        lessonIdIndex,
        urlToLessonFile,
        collectImageUrls: true
      });

      const result = await htmlProcessor.processHTML(html, {
        lessonID: lesson?.lessonID,
        lessonLetter: lesson?.lessonLetter,
        lessonTitle: lesson?.lessonTitle
      });

      await fs.writeFile(cleanPath, result.html, "utf-8");
      
      // Collect image URLs
      allImageURLs.push(...result.imageUrls);
      
      return { success: true, file };
    },
    progressTracker
  );

  // Report results
  if (errors.length > 0) {
    hey.warn(`⚠️ ${errors.length} files failed to clean:`);
    errors.forEach(({ item, error }) => {
      hey.warn(`  - ${item}: ${error.message}`);
    });
  }

  progressTracker.complete(`${results.length} files cleaned successfully`);

  // Save image URLs for later processing
  const uniqueUrls = [...new Set(allImageURLs)];
  await fs.writeFile(
    config.OUTPUT.imgsJSON,
    JSON.stringify(uniqueUrls, null, 2),
    "utf-8"
  );
  hey.success(`✅ Saved ${uniqueUrls.length} unique image URLs`);
}
