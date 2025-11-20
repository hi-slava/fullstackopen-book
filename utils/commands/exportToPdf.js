import fs from "fs/promises";
import path from "path";
import hey from "#utils/core/logger";
import launchPuppeteer from "#utils/helpers/puppeteerLauncher"; // your Puppeteer launcher
import config from "#config";
import { prepareBookContentFlexible } from "#utils/prepareBookContent";

export async function exportToPdf({ language = "en", exportType = "full", emojiMode = "replace" } = {}) {
  try {
    const { metadata, content } =
      await prepareBookContentFlexible({ language, exportType, emojiMode });

    // Generate table of contents HTML
    const tocHtml = content
      .filter(item => !item.excludeFromToc)
      .map((item, index) => {
        const indent = item.title.startsWith("  ") ? "&nbsp;&nbsp;&nbsp;&nbsp;" : "";
        return `<div style="margin: 8px 0;"><a href="#${item.filename || `chapter-${index}`}" style="text-decoration: none; color: #333;">${indent}${item.title}</a></div>`;
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
            }
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              color: #2c3e50;
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
              background: #f8f9fa;
              padding: 1rem;
              border-radius: 4px;
              overflow-x: auto;
              page-break-inside: avoid;
            }
            code {
              background: #f1f3f4;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 1rem auto;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1rem 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            /* Add more styles if needed */
          </style>
        </head>
        <body>
          <div class="toc">
            <h2>Table of Contents</h2>
            ${tocHtml}
          </div>
          ${content.map((c, index) => `
            <div class="chapter" id="${c.filename || `chapter-${index}`}">
              <h${c.title.startsWith("  ") ? "2" : "1"}>${c.title}</h${c.title.startsWith("  ") ? "2" : "1"}>
              ${c.content}
            </div>
          `).join("")}
        </body>
      </html>
    `;

    const browser = await launchPuppeteer();
    const page = await browser.newPage();

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
    });

    const pdfPath = path.resolve(
      config.OUTPUT.root,
      "FullStackOpen.pdf"
    );
    await page.pdf({
      path: pdfPath,
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
    hey.success("✅ PDF export complete!");
  } catch (error) {
    hey.error("❌ PDF export failed:", error);
    throw error;
  }
}
