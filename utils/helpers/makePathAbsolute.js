import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import { pathToFileURL } from "url";
import fetch from "node-fetch";
import hey from "#utils/core/logger";
import config from "#config";
import { ensureDirExists } from "#utils/helpers/fsHelpers";

export async function makePathsAbsolute(filepath) {
  const html = await fs.readFile(filepath, "utf-8");
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const baseDir = path.dirname(filepath);

  // Load image URLs from JSON for refetching
  let imageUrls = [];
  try {
    const imgsList = await fs.readFile(config.OUTPUT.imgsJSON, "utf-8");
    imageUrls = JSON.parse(imgsList);
  } catch (error) {
    hey.warn("Could not load imgs.json for refetching");
  }

  // Convert image src to absolute file:// URLs to put them in the EPUB
  for (const img of document.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src").trim();

    if (src && !src.match(/^https?:\/\//i) && !src.match(/^file:\/\//i)) {
      const absPath = path.resolve(baseDir, src);

      // Check if the image file actually exists before converting to file:// URL
      try {
        await fs.access(absPath);
        img.setAttribute("src", pathToFileURL(absPath).href);
      } catch (error) {
        // Image file doesn't exist - try to refetch it from JSON
        try {
          // Find matching URL in JSON (match by pathname)
          const imagePath = src.startsWith("imgs/") ? src.substring(5) : src;
          const imageUrl = imageUrls.find((url) => {
            try {
              const urlObj = new URL(url);
              return urlObj.pathname.substring(1) === imagePath;
            } catch {
              return false;
            }
          });

          if (!imageUrl) {
            throw new Error("Image URL not found in imgs.json");
          }

          hey.info(`🔄 Attempting to refetch missing image: ${imageUrl}`);

          // Fetch and save the image (same logic as downloadImages.js)
          const res = await fetch(imageUrl);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          await ensureDirExists(path.dirname(absPath));
          await fs.writeFile(absPath, buffer);

          hey.success(`✅ Successfully refetched and saved: ${absPath}`);
          img.setAttribute("src", pathToFileURL(absPath).href);
        } catch (fetchError) {
          // Refetch failed - remove from DOM
          hey.warn(
            `⚠️  Image file not found and refetch failed, removing from content: ${absPath}`
          );
          hey.warn(`   Error: ${fetchError.message}`);
          img.remove();
        }
      }
    }
  }

  // Convert all local links from .html to .xhtml
  for (const link of document.querySelectorAll("a[href]")) {
    let href = link.getAttribute("href");
    if (!href) continue;
    href = href.trim();

    if (/^https?:\/\/$/i.test(href)) {
      link.replaceWith(...link.childNodes);
      continue;
    }

    if (href.includes(".html") && !href.startsWith("http")) {
      const newHref = href.replace(/\.html(#.*)?$/, ".xhtml$1");
      link.setAttribute("href", newHref);
    }
  }

  return dom.serialize();
}
