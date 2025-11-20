import fs from "fs/promises";
import path from "path";
import hey from "#utils/core/logger";
import config from "#config";
import { prepareBookContentFlexible } from "#utils/prepareBookContent";
import { EPub } from "epub-gen-memory";

export async function exportToEpub({
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

    const epub = new EPub(metadata, content);
    const buffer = await epub.genEpub();

    const outputPath = path.resolve(
      config.OUTPUT.root,
      `FullStackOpen ${parts}.epub`
    );
    await fs.writeFile(outputPath, buffer);

    hey.success("✅ EPUB export complete!");
  } catch (error) {
    hey.error("❌ EPUB export failed:", error);
    throw error;
  }
}
