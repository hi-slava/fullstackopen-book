import fs from "fs/promises";
import path from "path";
import hey from "#utils/core/logger";
import config from "#config";
import { makePathsAbsolute } from "#utils/helpers/makePathAbsolute";
import { JSDOM } from "jsdom";
import { replaceEmojis } from "#utils/commands/cleanHtml";

async function createFileFromImageBuffer(imageBuffer, filename) {
  const ext = path.extname(filename).toLowerCase();

  let mimeType;
  if (ext === ".png") {
    mimeType = "image/png";
  } else if (ext === ".jpg" || ext === ".jpeg") {
    mimeType = "image/jpeg";
  } else {
    mimeType = "application/octet-stream"; // fallback or unknown
  }

  const imageBlob = new Blob([imageBuffer], {
    type: mimeType,
  });

  const imageFile = new File([imageBlob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });

  return imageFile;
}

/**
 * Generate table of contents with navigation
 * @param {Array} content - The content array
 * @param {Object} navOptions - Navigation options from config
 */
function generateNavigation(content, navOptions) {
  if (!navOptions.includeTOC) return content;

  const toc = [];
  let chapterNumber = 1;

  content.forEach((item, index) => {
    if (item.excludeFromToc) return;

    const prefix = navOptions.includeChapterNumbers ? `${chapterNumber}. ` : "";
    const title = item.title.startsWith("  ") ? item.title : `  ${item.title}`;
    toc.push({
      title: `${prefix}${title}`,
      filename: item.filename || `chapter-${index}`,
      level: title.startsWith("  ") ? 2 : 1,
    });

    if (!title.startsWith("  ")) chapterNumber++;
  });

  return toc;
}

/**
 * Process content for better navigation
 * @param {Array} content - The content array
 * @param {Object} navOptions - Navigation options from config
 */
function processNavigation(content, navOptions) {
  return content.map((item) => {
    if (navOptions.includeChapterNumbers && !item.excludeFromToc) {
      // Add chapter numbers to titles
      if (!item.title.startsWith("  ")) {
        // This is a part title
        item.title = `${item.title}`;
      }
    }
    return item;
  });
}

/**
 * Flexible content preparation for book export
 * @param {Object} options
 * @param {string} options.exportType - 'full' | 'course_only' | 'exercises_only'
 * @param {string} options.language - language code, e.g. 'en', 'fi', 'es'
 * @param {string} options.emojiMode - 'replace' | 'remove' | 'keep'
 */
export async function prepareBookContentFlexible({
  exportType = config.EXPORT_TYPES.FULL,
  language = "en",
  emojiMode = config.CONTENT_OPTIONS.emojiHandling,
} = {}) {
  try {
    const now = new Date();
    let coverPath;
    if (exportType === config.EXPORT_TYPES.EXERCISES_ONLY) {
      coverPath = config.COVER_EXERCISES;
    } else if (exportType === config.EXPORT_TYPES.COURSE_ONLY) {
      coverPath = config.COVER_COURSE_ONLY || config.COVER;
    } else {
      coverPath = config.COVER;
    }
    const coverBuffer = await fs.readFile(coverPath);
    const coverFileObject = await createFileFromImageBuffer(
      coverBuffer,
      path.basename(coverPath)
    );
    const metadata = {
      title:
        exportType === config.EXPORT_TYPES.EXERCISES_ONLY
          ? `Full Stack Open ${now.getFullYear()} Exercises (${language})`
          : exportType === config.EXPORT_TYPES.COURSE_ONLY
          ? `Full Stack Open ${now.getFullYear()} (Course Only, ${language})`
          : `Full Stack Open ${now.getFullYear()} (${language})`,
      author: "University of Helsinki, Department of Computer Science",
      publisher: "University of Helsinki",
      description:
        "Full Stack Open is a free online course that teaches modern web development with JavaScript. It covers React, Node.js, GraphQL, TypeScript, and more.",
      cover: coverFileObject,
      tocTitle: "Course contents",
      numberChaptersInTOC: false,
      prependChapterTitles: false,
      date: now.toISOString().slice(0, 10),
      lang: language,
      css: await fs.readFile(config.CSS, "utf8"),
    };
    hey.info(
      `Preparing book content for exportType=${exportType}, language=${language}`
    );
    const data = await fs.readFile(config.OUTPUT.dataJSON, "utf-8");
    const parts = JSON.parse(data);
    const content = [];
    content.push({
      title: "Title",
      content: await fs.readFile(config.TITLE, "utf8"),
      excludeFromToc: true,
      beforeToc: true,
    });
    hey.info(parts.length + " parts found.");
    hey.info("Parts: " + parts.map((p) => p.partName).join(", "));
    const start = 0;
    const end = parts.length - 1;
    hey.info(`Preparing content for parts ${start} to ${end}...`);
    for (const part of parts.slice(start, end + 1)) {
      content.push({
        title: `${part.partName}: ${part.partTitle}.`,
        content: await fs.readFile(
          `${config.OUTPUT.covers}/${part.partID}-cover.html`,
          "utf8"
        ),
        filename: `${part.partID}-cover`,
      });
      for (const lesson of part.lessons) {
        const html = await makePathsAbsolute(
          `${config.OUTPUT.clean}/${lesson.lessonID}.html`
        );
        let finalHTML = html;
        if (exportType === config.EXPORT_TYPES.EXERCISES_ONLY) {
          const htmlDocument = new JSDOM(html).window.document;
          const exercise = htmlDocument.querySelector(".exercise");
          if (exercise) {
            finalHTML = exercise.innerHTML;
          } else {
            finalHTML = "No exercises for this lesson";
            hey.warn(`No exercises for ${lesson.lessonID}`);
          }
        } else if (exportType === config.EXPORT_TYPES.COURSE_ONLY) {
          // Remove exercises from the HTML
          const htmlDocument = new JSDOM(html).window.document;
          const exercise = htmlDocument.querySelector(".exercise");
          if (exercise) {
            exercise.remove();
          }
          finalHTML = htmlDocument.body.innerHTML;
        }
        // Emoji handling
        finalHTML = replaceEmojis(finalHTML, emojiMode);
        content.push({
          title: `  ${lesson.lessonLetter}. ${lesson.lessonTitle}`,
          content: finalHTML,
          filename: lesson.lessonID,
        });
      }
    }
    const partsCount = `${start}–${end}${
      exportType === config.EXPORT_TYPES.EXERCISES_ONLY
        ? " (exercises)"
        : exportType === config.EXPORT_TYPES.COURSE_ONLY
        ? " (course only)"
        : ""
    }`;

    // Process navigation
    const processedContent = processNavigation(
      content,
      config.CONTENT_OPTIONS.navigation
    );
    const navigation = generateNavigation(
      processedContent,
      config.CONTENT_OPTIONS.navigation
    );

    return {
      metadata,
      content: processedContent,
      navigation,
      parts: partsCount,
    };
  } catch (error) {
    hey.error("Failed to prepare book content: " + error.message);
    throw error;
  }
}
