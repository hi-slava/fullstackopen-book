import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import { pathToFileURL } from "url";

export async function makePathsAbsolute(filepath) {
  const html = await fs.readFile(filepath, "utf-8");
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const baseDir = path.dirname(filepath);

  // Convert image src to absolute file:// URLs to put them in the EPUB
  for (const img of document.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src").trim();

    if (
      src &&
      !src.match(/^https?:\/\//i) &&
      !src.match(/^file:\/\//i)
    ) {
      const absPath = path.resolve(baseDir, src);
      img.setAttribute("src", pathToFileURL(absPath).href);
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

    if (
      href.includes(".html") &&
      !href.startsWith("http")
    ) {
      const newHref = href.replace(
        /\.html(#.*)?$/,
        ".xhtml$1"
      );
      link.setAttribute("href", newHref);
    }
  }

  return dom.serialize();
}
