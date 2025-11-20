import { fileURLToPath } from "url";
import path from "path";

// Get project root (directory of config.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

// Supported languages
const SUPPORTED_LANGUAGES = {
  en: { name: "English", path: "/en/" }, // English (default)
  fi: { name: "Suomi", path: "/" }, // Finnish uses root path
  zh: { name: "中文", path: "/zh/" },
  es: { name: "Español", path: "/es/" },
  fr: { name: "Français", path: "/fr/" },
  ptbr: { name: "Português(BR)", path: "/ptbr/" },
  // Add more languages as needed
};

// Export types
const EXPORT_TYPES = {
  FULL: "full",
  COURSE_ONLY: "course_only", 
  EXERCISES_ONLY: "exercises_only"
};

// Assets
const ASSETS = path.resolve(ROOT, "assets");
const COVER = path.resolve(ASSETS, "cover.png");
const COVER_EXERCISES = path.resolve(ASSETS, "cover-exercises.png");
const COVER_COURSE_ONLY = path.resolve(ASSETS, "cover-course-only.png");
const CSS = path.resolve(ASSETS, "styles.css");
const TITLE = path.resolve(ASSETS, "title.html");

// Output structure
const OUTPUT = path.resolve(ROOT, "output");
const OUTPUT_PATHS = Object.freeze({
  root: OUTPUT,
  fetchedData: path.resolve(OUTPUT, "fetched-data"),
  dataJSON: path.resolve(OUTPUT, "fetched-data/data.json"),
  lessonsDate: path.resolve(OUTPUT, "fetched-data/lessonsDate.json"),
  raw: path.resolve(OUTPUT, "fetched-data/raw"),
  covers: path.resolve(OUTPUT, "fetched-data/covers"),
  clean: path.resolve(OUTPUT, "fetched-data/clean"),
  imgs: path.resolve(OUTPUT, "fetched-data/clean/imgs"),
  imgsJSON: path.resolve(OUTPUT, "fetched-data/imgs.json"),
});

// URL config
const BASE_URL = "https://fullstackopen.com";

// Content processing options
const CONTENT_OPTIONS = {
  emojiHandling: "replace", // "replace", "remove", "keep"
  navigation: {
    includeTOC: true,
    includeChapterNumbers: false,
    includePartTitles: true,
  },
  imageProcessing: {
    optimize: true,
    maxWidth: 800,
    preserveAspectRatio: true,
  }
};

// HTML processing constants
const HTML_CONSTANTS = {
  ALLOWED_TAGS: [
    "html", "head", "body", "title", "meta", "link", "section", "header", "footer",
    "nav", "article", "aside", "h1", "h2", "h3", "h4", "h5", "h6", "p", "div",
    "span", "a", "img", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
    "pre", "code", "blockquote", "hr", "br", "em", "strong", "i", "b", "u", "sup", "sub"
  ],
  ALLOWED_ATTR: {
    a: ['href', 'title', 'id', 'class', 'style', 'target', 'rel'],
    img: ["src", "alt", "title", "width", "height", "style"],
    "*": ["id", "class", "style", "title"],
  }
};

// Export config as a single object for clarity
const config = Object.freeze({
  ROOT,
  ASSETS,
  COVER,
  COVER_EXERCISES,
  COVER_COURSE_ONLY,
  CSS,
  TITLE,
  OUTPUT: OUTPUT_PATHS,
  BASE_URL,
  SUPPORTED_LANGUAGES,
  EXPORT_TYPES,
  CONTENT_OPTIONS,
  HTML_CONSTANTS,
});

export default config;
