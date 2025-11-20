# Full Stack Open Book Generator

A Node.js CLI tool to convert the Full Stack Open course into EPUB or PDF formats with support for multiple languages, export types, and content customization.

## 🚀 Features

- Multi-language support (English, Finnish, Spanish, Chinese, French, Portuguese)
- Flexible export types (full course, course-only, exercises-only)
- Emoji handling (replace, remove, or keep)
- Progress tracking and error handling

## 📦 Installation

```bash
npm install
```

## 🎯 Quick Start

### Complete Pipeline (Recommended)

**Note:** These commands use default options (English, full course, emoji=replace). For custom options, use the step-by-step approach below.

```bash
# Generate full course EPUB (fetches, downloads, and exports)
npm run full-epub

# Generate full course PDF
npm run full-pdf
```

### Step-by-Step (Manual)

**⚠️ Important:** Before running `epub` or `pdf` commands, you must first run these commands in order. Use this approach when you need custom options (language, export type, emoji handling):

```bash
# 1. Fetch course structure
npm run parts -- --lang=en  # or fi, es, zh, fr, ptbr

# 2. Download lesson content
npm run lessons

# 3. Download images
npm run images

# 4. Clean HTML content
npm run clean

# 5. Generate cover pages
npm run covers

# 6. Export to EPUB or PDF
npm run epub -- --lang=en --type=full --emoji=replace
npm run pdf -- --lang=en --type=full --emoji=replace
```

### CLI Options

**Note:** CLI options work with individual commands (`epub`, `pdf`, `parts`) but **not** with `full-epub` or `full-pdf`. Use the step-by-step approach for custom options.

All export commands support optional arguments:

- `--lang=en|fi|zh|es|fr|ptbr` (default: `en`)
- `--type=full|course_only|exercises_only` (default: `full`)
- `--emoji=replace|remove|keep` (default: `replace`)

### Examples

```bash
# Generate exercises only in Finnish
npm run epub -- --lang=fi --type=exercises_only

# Generate course without exercises in Spanish
npm run pdf -- --lang=es --type=course_only --emoji=remove

# Generate full course in Chinese
npm run epub -- --lang=zh
```

## 🔧 Configuration

### Supported Languages

Languages are configured in `config.js`:

- `en` - English (default)
- `fi` - Finnish (Suomi)
- `zh` - Chinese (中文)
- `es` - Spanish (Español)
- `fr` - French (Français)
- `ptbr` - Portuguese (Brazil)

### Export Types

- `full` - Complete course content
- `course_only` - Content without exercises
- `exercises_only` - Only exercise sections

### Emoji Handling

- `replace` - Convert emojis to text (e.g., ❤️ → :heart:)
- `remove` - Strip all emojis
- `keep` - Preserve emojis as-is

## 🛠️ Tech Stack

This is a **Node.js command-line application** built with:

- **Puppeteer** - Web scraping and browser automation
- **jsdom** - HTML parsing and DOM manipulation
- **epub-gen-memory** - EPUB file generation
- **sanitize-html** - HTML sanitization and cleaning
- **node-fetch** - HTTP requests for downloading content
- **chalk** - Terminal output styling
- **node-emoji** - Emoji processing

The tool uses ES modules and requires Node.js 18+ (for node-fetch v3 support).

## 📁 Project Structure

```
fso-book/
├── utils/
│   ├── commands/      # Command implementations
│   ├── core/          # Core utilities (AsyncProcessor, ProgressTracker, logger)
│   ├── helpers/       # Helper functions
│   ├── processors/    # HTML processing
│   ├── validators/    # Configuration validation
│   └── prepareBookContent.js
├── assets/            # Cover images, CSS, templates
├── config.js          # Configuration settings
├── index.js           # CLI entry point
└── package.json
```

## 📄 License

MIT License

## 🙏 Acknowledgments

- Full Stack Open course creators
- University of Helsinki
