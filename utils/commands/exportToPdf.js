import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import hey from "#utils/core/logger";
import launchPuppeteer from "#utils/helpers/puppeteerLauncher"; // your Puppeteer launcher
import config from "#config";
import { prepareBookContentFlexible } from "#utils/prepareBookContent";

export async function exportToPdf({
  language = "en",
  exportType = "full",
  emojiMode = "replace",
} = {}) {
  try {
    const { metadata, content, parts } = await prepareBookContentFlexible({
      language,
      exportType,
      emojiMode,
    });

    // Determine cover image based on exportType
    let coverPath;
    if (exportType === config.EXPORT_TYPES.EXERCISES_ONLY) {
      coverPath = config.COVER_EXERCISES;
    } else if (exportType === config.EXPORT_TYPES.COURSE_ONLY) {
      coverPath = config.COVER_COURSE_ONLY;
    } else {
      coverPath = config.COVER;
    }

    // Convert cover image to data URI
    const coverBuffer = await fs.readFile(coverPath);
    const coverBase64 = coverBuffer.toString("base64");
    const coverDataUri = `data:image/png;base64,${coverBase64}`;

    // Generate table of contents HTML
    const tocHtml = content
      .filter((item) => !item.excludeFromToc)
      .map((item, index) => {
        const indent = item.title.startsWith("  ")
          ? "&nbsp;&nbsp;&nbsp;&nbsp;"
          : "";
        return `<div style="margin: 8px 0;"><a href="#${
          item.filename || `chapter-${index}`
        }" style="text-decoration: none; color: #333;">${indent}${
          item.title
        }</a></div>`;
      })
      .join("");

    // Combine all content pieces into one HTML body string
    // Wrap in <html><head><style> for minimal styling if needed
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${metadata.title || "Document"}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
                Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
              margin: 2rem;
              line-height: 1.6;
              color: #333;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            p, li, td, th, div, a {
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
            }
            a {
              word-break: break-all;
            }
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              page-break-inside: avoid;
              color: #2c3e50;
            }
            .lesson-row {
              page-break-before: always;
              overflow: hidden;
              padding: 0 0 0.7rem 0;
            }
            .lesson-badge {
              position: relative;
              float: left;
              width: 3.2rem;
              height: 3.2rem;
              line-height: 2.6rem;
              border-radius: 2.12rem;
              border: 0.26rem solid #ccc;
              box-sizing: content-box;
              margin-right: 0.8rem;
              text-align: center;
              user-select: none;
              white-space: nowrap;
            }
            .badge-letter {
              display: inline-block;
              font-weight: bold;
              font-size: 2.4rem;
              color: black;
              vertical-align: middle;
              line-height: 1;
            }
            .lesson-header {
              position: relative;
              top: 0.7rem;
            }
            h1 {
              font-size: 2.5em;
              border-bottom: 3px solid #3498db;
              padding-bottom: 10px;
            }
            h2 {
              font-size: 2em;
              border-bottom: 2px solid #ecf0f1;
              padding-bottom: 8px;
            }
            hr {
              page-break-after: always;
              border: none;
              margin: 3rem 0;
              height: 2px;
              background: linear-gradient(to right, #3498db, #e74c3c);
            }
            .toc {
              page-break-after: always;
              margin-bottom: 2rem;
            }
            .toc h2 {
              border-bottom: 3px solid #3498db;
              margin-bottom: 1rem;
            }
            .chapter {
              page-break-before: always;
            }
            .chapter:first-child {
              page-break-before: avoid;
            }
            pre {
              overflow: hidden;
              background: #f8f9fa;
              padding: 1rem;
              border-radius: 0.5rem;
              overflow-x: visible;
              overflow-wrap: break-word;
              word-wrap: break-word;
              word-break: break-word;
              white-space: pre-wrap;
              page-break-inside: avoid;
              font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            }
            code {
              background: inherit;
              color: inherit;
              padding: 0;
              margin: 0;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
              white-space: pre-wrap;
              font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            }
            code:not(pre code) {
              background: #eee;
              margin: 0 0.1em;
              padding: 0.1em 0.3em;
              border-radius: 0.25em;
              white-space: nowrap;
            }
            .token-line {
              display: block;
              margin: 0;
              padding: 0;
            }
            .gatsby-highlight-code-line {
              display: block;
              background-color: #e8e8e8;
              padding: 0.2rem 0;
              margin: 0.05rem 0;
              border-radius: 0.25rem;
              line-height: 1.2;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
              white-space: pre-wrap;
            }
            .code-highlight-group {
              display: block;
              background-color: #e8e8e8;
              padding: 0.2rem 0;
              margin: 0.05rem 0;
              border-radius: 0.25rem;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
              white-space: pre-wrap;
            }
            .code-highlight-group .gatsby-highlight-code-line {
              background: transparent;
              border: none;
              margin: 0;
              padding: 0;
              border-radius: 0;
            }
            .cover-page {
              page-break-after: always;
              width: 100%;
              min-height: calc(100vh - 40mm);
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #fff;
            }
            .cover-page img {
              max-width: calc(100% - 30mm);
              max-height: calc(100vh - 40mm);
              width: auto;
              height: auto;
              object-fit: contain;
            }
            .cover-title-page {
              page-break-before: always;
              page-break-after: always;
              min-height: calc(100vh - 40mm);
              margin: 0;
              padding: 0;
            }
            .cover-image-page {
              page-break-before: always;
              page-break-after: always;
              min-height: calc(100vh - 40mm);
              margin: 0;
              padding: 1rem;
              background: #f2f2f2;
              border-radius: 1rem;
              display: flex;
              justify-content: center;
              align-items: center;
              flex-direction: column;
            }
            .cover-image-page img {
              max-width: 300px;
              max-height: 300px;
              object-fit: contain;
              margin: 0 auto 1rem auto;
            }
            .cover-description-page {
              page-break-before: always;
              page-break-after: always;
              min-height: calc(100vh - 40mm);
              margin: 0;
              padding: 1rem;
              background: #f2f2f2;
              border-radius: 1rem;
              display: block;
            }
            .cover-description-page > :first-child {
              margin-top: 0;
            }
            .cover-description-page > :last-child {
              margin-bottom: 0;
            }
            .exercise {
              page-break-before: always;
              page-break-after: always;
              min-height: calc(100vh - 40mm);
              margin: 1rem 0;
              overflow: hidden;
              background: #f2f2f2;
              border: 1px solid #e4e4e4;
              border-radius: 1rem;
              padding: 1rem;
              page-break-inside: avoid;
            }
            .exercise > :first-child {
              margin-top: 0;
            }
            .exercise > :last-child {
              margin-bottom: 0;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              object-fit: contain;
              border-radius: 0.25rem;
              margin: 1rem auto;
            }
            .table-wrapper {
              overflow: hidden;
              margin: 1rem 0;
              width: 100%;
              border: 1px solid #ccc;
              border-radius: 0.5rem;
              page-break-inside: avoid;
            }
            table {
              width: 100%;
              border: none;
              border-collapse: collapse;
              page-break-inside: avoid;
            }
            th, td {
              border-bottom: 1px solid #ccc;
              padding: 0.5em 1em;
              text-align: left;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
            }
            thead th {
              font-weight: bold;
              background: #f2f2f2;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            blockquote {
              overflow: hidden;
              background: #f2f2f2;
              border: 1px solid #ccc;
              border-left: 6px solid #ccc;
              border-radius: 0.5rem;
              margin: 1rem 0;
              padding: 1rem;
              page-break-inside: avoid;
            }
            blockquote > :first-child {
              margin-top: 0;
            }
            blockquote > :last-child {
              margin-bottom: 0;
            }
            /* Add more styles if needed */
          </style>
        </head>
        <body>
          <div class="cover-page">
            <img src="${coverDataUri}" alt="Cover" />
          </div>
          <div class="toc">
            <h2>Table of Contents</h2>
            ${tocHtml}
          </div>
          ${content
            .map(
              (c, index) => `
            <div class="chapter" id="${c.filename || `chapter-${index}`}">
              <h${c.title.startsWith("  ") ? "2" : "1"}>${c.title}</h${
                c.title.startsWith("  ") ? "2" : "1"
              }>
              ${c.content}
            </div>
          `
            )
            .join("")}
        </body>
      </html>
    `;

    // Write HTML to temporary file so Puppeteer can load file:// image URLs
    const tempHtmlPath = path.resolve(
      config.OUTPUT.root,
      "temp-pdf-export.html"
    );
    await fs.writeFile(tempHtmlPath, fullHtml, "utf-8");

    const browser = await launchPuppeteer();
    const page = await browser.newPage();

    // Use file:// URL instead of setContent so images can load
    const htmlFileUrl = pathToFileURL(tempHtmlPath).href;
    await page.goto(htmlFileUrl, {
      waitUntil: "networkidle0",
    });

    const filename =
      [
        "FullStackOpen",
        parts,
        language,
        exportType === config.EXPORT_TYPES.FULL ? null : exportType,
        new Date().toISOString().slice(0, 10),
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() + ".pdf";
    const outputPath = path.join(config.OUTPUT.root, filename);
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    await browser.close();

    // Clean up temporary file
    try {
      await fs.unlink(tempHtmlPath);
    } catch (err) {
      // Ignore cleanup errors
    }

    hey.success("✅ PDF export complete!");
  } catch (error) {
    hey.error("❌ PDF export failed:", error);
    throw error;
  }
}
