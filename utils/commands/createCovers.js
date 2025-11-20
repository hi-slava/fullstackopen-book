import fs from "fs/promises";
import path from "path";
import hey from "#utils/core/logger";
import config from "#config";
import { ensureDirExists } from "#utils/helpers/fsHelpers";
import { ProgressTracker } from "#utils/core/ProgressTracker";

export async function createCovers() {
  const raw = await fs.readFile(
    config.OUTPUT.dataJSON,
    "utf-8"
  );
  const parts = JSON.parse(raw);

  await ensureDirExists(config.OUTPUT.covers);

  const progressTracker = new ProgressTracker(parts.length, "Creating cover pages");

  for (const part of parts) {
    const {
      partID,
      partName,
      partTitle,
      banner,
      accentColor,
      partDescription,
    } = part;

    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${partName}</title>
      </head>
      <body>
        <div class="cover-title-page">
          <h1>
            ${partName}
            <br />
            <span class="weight-normal">${partTitle}</span>
          </h1>
        </div>
        <div 
          class="cover-image-page" 
          style="background-color: ${accentColor}; border: 1px solid ${accentColor};"
        >
          <img 
            src="${banner}" 
            alt="Part ${partID} cover illustration" 
          />
        </div>
        <div 
          class="cover-description-page" 
          style="background-color: ${accentColor}; border: 1px solid ${accentColor};"
        >
          ${partDescription}
        </div>
      </body>
      </html>
    `;

    const filename = path.resolve(
      config.OUTPUT.covers,
      `${partID}-cover.html`
    );
    await fs.writeFile(filename, html, "utf-8");
    progressTracker.increment(1, `Created cover for Part ${partID}`);
  }

  progressTracker.complete("Cover pages generated successfully");
}
