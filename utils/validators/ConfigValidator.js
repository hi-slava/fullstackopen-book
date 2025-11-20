import fs from "fs/promises";
import path from "path";
import config from "#config";
import hey from "#utils/core/logger";

export class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    this.errors = [];
    this.warnings = [];

    await this.validateAssets();
    this.validateLanguageSupport();

    if (this.errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${this.errors.join('\n')}`);
    }

    if (this.warnings.length > 0) {
      hey.warn(`Configuration warnings:\n${this.warnings.join('\n')}`);
    }

    hey.success("✅ Configuration validation passed");
  }

  async validateAssets() {
    const requiredAssets = [
      { path: config.COVER, name: "Cover image" },
      { path: config.CSS, name: "CSS file" },
      { path: config.TITLE, name: "Title HTML" }
    ];

    for (const asset of requiredAssets) {
      try {
        await fs.access(asset.path);
      } catch {
        this.errors.push(`Missing required asset: ${asset.name} (${asset.path})`);
      }
    }
  }

  validateLanguageSupport() {
    const supportedLanguages = Object.keys(config.SUPPORTED_LANGUAGES);
    
    if (supportedLanguages.length === 0) {
      this.errors.push("No supported languages configured");
    }

    // Validate language paths
    for (const [code, lang] of Object.entries(config.SUPPORTED_LANGUAGES)) {
      if (!lang.path || !lang.name) {
        this.errors.push(`Invalid language configuration for ${code}`);
      }
    }
  }

  validateCLIArgs(args) {
    const { lang, type, emoji } = args;
    
    if (lang && !config.SUPPORTED_LANGUAGES[lang]) {
      this.errors.push(`Unsupported language: ${lang}`);
    }

    if (type && !Object.values(config.EXPORT_TYPES).includes(type)) {
      this.errors.push(`Unsupported export type: ${type}`);
    }

    if (emoji && !['replace', 'remove', 'keep'].includes(emoji)) {
      this.errors.push(`Unsupported emoji mode: ${emoji}`);
    }
  }
} 