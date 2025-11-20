import { JSDOM } from "jsdom";
import sanitizeHtml from "sanitize-html";
import { replaceEmojis } from "#utils/commands/cleanHtml";
import hey from "#utils/core/logger";
import path from "path";
import config from "#config";

export class HTMLProcessor {
  constructor(options = {}) {
    this.options = {
      emojiMode: "replace",
      accentColor: "#ccc",
      lessonIdIndex: {},
      urlToLessonFile: new Map(),
      collectImageUrls: false,
      ...options,
    };
    this.collectedImageUrls = [];
  }

  /**
   * Process HTML content through all cleaning steps
   */
  async processHTML(html, lessonInfo = {}) {
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Apply all processing steps
    this.removeInlineStyles(document);
    this.processImages(document);
    this.wrapTables(document);
    this.removeCopyButtons(document);
    this.cleanCodeBlocks(document);
    this.processLinks(document);
    this.processHeaders(document, lessonInfo);
    this.processExerciseBanners(document);
    this.cleanupDivs(document);

    // Serialize and sanitize
    let finalHtml = dom.serialize();
    finalHtml = this.sanitizeHTML(finalHtml);
    finalHtml = replaceEmojis(finalHtml, this.options.emojiMode);

    return {
      html: finalHtml,
      imageUrls: this.collectedImageUrls,
    };
  }

  removeInlineStyles(document) {
    [...document.querySelectorAll("[style]")].forEach((el) => {
      el.removeAttribute("style");
    });
  }

  processImages(document) {
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      if (this.options.collectImageUrls) {
        this.collectedImageUrls.push(img.src);
      }

      // Process image src for local paths
      try {
        const url = new URL(img.src);
        const newSrc = path.posix.join("imgs", url.pathname.substring(1));
        img.setAttribute("src", newSrc);
      } catch {
        // Ignore invalid URLs without crashing
      }

      if (!img.alt) img.alt = "Image";
      img.alt = img.alt.replace(/[&<>"]/g, "");
      img.setAttribute(
        "style",
        `border: 7px solid ${this.options.accentColor};`
      );
    });
  }

  wrapTables(document) {
    document.querySelectorAll("table").forEach((table) => {
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  removeCopyButtons(document) {
    document
      .querySelectorAll(".copy-button, .copy-code-button")
      .forEach((btn) => btn.remove());
  }

  cleanCodeBlocks(document) {
    document.querySelectorAll("pre code").forEach((code) => {
      let sawLineSpans = false;
      let hasTokenLineSpans = false;
      Array.from(code.querySelectorAll("span")).forEach((span) => {
        const className = span.getAttribute("class") || "";
        const classes = className.split(" ").filter(Boolean);
        const isHighlightLine = classes.includes("gatsby-highlight-code-line");
        const isTokenLine = classes.includes("token-line");

        if (isHighlightLine || isTokenLine) {
          // Preserve line wrapper spans; ensure no inline styles
          span.removeAttribute("style");
          sawLineSpans = true;
          if (isTokenLine) hasTokenLineSpans = true;
        } else {
          // Unwrap token-level spans but keep their text (including any internal newlines)
          span.replaceWith(document.createTextNode(span.textContent));
        }
      });

      // Only when Prism provides explicit per-line wrappers (token-line) should we synthesize newline separators.
      // If we only have highlight-line wrappers mixed with plain text nodes, the original newlines already exist.
      if (sawLineSpans && hasTokenLineSpans) {
        Array.from(
          code.querySelectorAll(
            "span.gatsby-highlight-code-line, span.token-line"
          )
        ).forEach((lineSpan) => {
          const next = lineSpan.nextSibling;
          const needsNewline =
            !next ||
            !(
              (next.nodeType === 3 && next.textContent.startsWith("\n")) ||
              (next.nodeType === 1 && next.nodeName.toLowerCase() === "br")
            );
          if (needsNewline) {
            lineSpan.after(document.createTextNode("\n"));
          }
        });
      }

      // Group consecutive highlighted lines so they appear as a single visual block
      let node = code.firstChild;
      while (node) {
        if (
          node.nodeType === 1 &&
          node.classList &&
          node.classList.contains("gatsby-highlight-code-line")
        ) {
          const group = document.createElement("span");
          group.className = "code-highlight-group";
          code.insertBefore(group, node);

          // Move consecutive highlighted lines (and their newline text nodes) into the group
          while (
            node &&
            ((node.nodeType === 1 &&
              node.classList &&
              node.classList.contains("gatsby-highlight-code-line")) ||
              (node.nodeType === 3 && /^\n*$/.test(node.textContent)))
          ) {
            const nextSibling = node.nextSibling;
            group.appendChild(node);
            node = nextSibling;
          }
        } else {
          node = node.nextSibling;
        }
      }

      code.removeAttribute("style");
      code.closest("pre")?.removeAttribute("style");
    });
  }

  processLinks(document) {
    // Convert local links to lesson files, validate fragments and URLs
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      // Skip links inside code/pre, external links except fullstackopen.com, mailto/tel, or anchors
      if (
        link.closest("pre") ||
        link.closest("code") ||
        (href.startsWith("http") && !href.includes("fullstackopen.com")) ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#")
      )
        return;

      // Remove invalid absolute URLs like href="http://"
      if (/^https?:\/\/$/i.test(href) || /^https?:\/\/#/.test(href)) {
        link.replaceWith(...link.childNodes);
        return;
      }

      const [urlPathRaw, anchor] = href.split("#");
      const urlPath = this.normalizePath(urlPathRaw);
      const lessonFile = this.options.urlToLessonFile.get(urlPath);

      if (lessonFile) {
        if (anchor) {
          const fragmentIdSet = this.options.lessonIdIndex[lessonFile];
          if (fragmentIdSet && fragmentIdSet.has(anchor)) {
            link.setAttribute("href", `${lessonFile}#${anchor}`);
          } else {
            link.replaceWith(...link.childNodes);
          }
        } else {
          link.setAttribute("href", lessonFile);
        }
      } else {
        link.replaceWith(...link.childNodes);
      }
    });
  }

  normalizePath(urlPath) {
    if (urlPath.includes("fullstackopen.com")) {
      urlPath = new URL(urlPath).pathname;
    }
    if (urlPath.length > 1 && urlPath.endsWith("/")) {
      return urlPath.slice(0, -1);
    }
    return urlPath;
  }

  processHeaders(document, lessonInfo) {
    const oldH1 = document.querySelector("h1");
    const oldBadge = document.querySelector(".letter");

    if (
      oldH1 &&
      oldBadge &&
      lessonInfo.lessonLetter &&
      lessonInfo.lessonTitle
    ) {
      oldH1.remove();
      oldBadge.remove();

      const row = document.createElement("div");
      row.className = "lesson-row";

      const badge = document.createElement("div");
      badge.className = "lesson-badge";
      badge.style.borderColor = this.options.accentColor;

      const badgeLetter = document.createElement("span");
      badgeLetter.className = "badge-letter";
      badgeLetter.textContent = lessonInfo.lessonLetter;

      badge.appendChild(badgeLetter);

      const newH2 = document.createElement("h2");
      newH2.className = "lesson-header";
      newH2.id = lessonInfo.lessonID;
      newH2.textContent = lessonInfo.lessonTitle;

      row.appendChild(badge);
      row.appendChild(newH2);

      document.body.insertBefore(row, document.body.firstChild);
    }
  }

  processExerciseBanners(document) {
    document.querySelectorAll(".banner.tasks").forEach((el) => {
      el.setAttribute(
        "style",
        `background: ${this.options.accentColor}; border: 1px solid ${this.options.accentColor};`
      );

      const exercise = el.innerHTML;
      const exerciseDiv = document.createElement("div");
      exerciseDiv.className = "exercise";
      exerciseDiv.innerHTML = exercise;
      el.replaceWith(exerciseDiv);
    });
  }

  cleanupDivs(document) {
    [...document.querySelectorAll("div")].forEach((div) => {
      const cls = div.getAttribute("class");
      const id = div.getAttribute("id");
      if (!cls && !id && div.children.length === 1) {
        div.replaceWith(div.children[0]);
      }
    });

    [
      ...document.querySelectorAll(
        "div[class*='gatsby'], div[class*='course-content']"
      ),
    ].forEach((div) => {
      div.replaceWith(...div.childNodes);
    });
  }

  sanitizeHTML(html) {
    return sanitizeHtml(html, {
      allowedTags: config.HTML_CONSTANTS.ALLOWED_TAGS,
      allowedAttributes: config.HTML_CONSTANTS.ALLOWED_ATTR,
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowProtocolRelative: false,
      parser: { lowerCaseTags: true },
      transformTags: {
        div: (tagName, attribs) => {
          if (
            attribs.class &&
            (attribs.class.includes("gatsby") ||
              attribs.class.includes("course-content"))
          ) {
            return { tagName: false };
          }
          return { tagName, attribs };
        },
        span: (tagName, attribs) => {
          // Preserve highlight spans; strip inline styles everywhere
          const newAttribs = { ...attribs };
          if (newAttribs.style) {
            delete newAttribs.style;
          }
          return { tagName, attribs: newAttribs };
        },
        code: (tagName, attribs) => {
          return {
            tagName,
            attribs,
            textFilter: (text) => text,
          };
        },
      },
    });
  }
}
