import launchPuppeteer from "#utils/helpers/puppeteerLauncher";
import fs from "fs/promises";
import hey from "#utils/core/logger";
import config from "#config";
import { ensureDirExists } from "#utils/helpers/fsHelpers";

export async function fetchUrls(language = "en") {
  try {
    hey.basic("Launching browser...");
    const browser = await launchPuppeteer();
    const page = await browser.newPage();
    const languagePath = config.SUPPORTED_LANGUAGES[language]?.path || config.SUPPORTED_LANGUAGES.en.path;
    const baseUrl = config.BASE_URL + languagePath;
    await page.goto(baseUrl, {
      waitUntil: "networkidle2",
    });

    // 1. Fetch both part titles and their base URLs from BASE_URL
    hey.info("Extracting part titles and URLs...");

    const partSummaries = await page.evaluate((languagePath) => {
      const blocks = Array.from(
        document.querySelectorAll(".content-liftup")
      );
      return blocks
        .map((block, index) => {
          const partName = block
            .querySelector("h2")
            ?.textContent.trim();
          const partTitle = block
            .querySelector("p")
            ?.textContent.trim();
          const href = block
            .querySelector(`a[href^='${languagePath}part']`)
            ?.getAttribute("href");

          return {
            partID: index,
            partName,
            partTitle,
            partUrl: "https://fullstackopen.com" + href,
          };
        })
        .filter(
          (p) => p.partName && p.partTitle && p.partUrl
        );
    }, languagePath);

    const results = [];

    // 2. Visit each part page and extract details
    for (let i = 0; i < partSummaries.length; i++) {
      const { partID, partName, partTitle, partUrl } =
        partSummaries[i];
      hey.info("Fetching: " + partUrl);
      await page.goto(partUrl, {
        waitUntil: "networkidle2",
      });

      const partDetails = await page.evaluate((partID) => {
        const bannerStyle =
          document
            .querySelector(".part-intro__banner")
            ?.getAttribute("style") || "";
        const bannerMatch = bannerStyle.match(
          /url\(["']?(.*?)["']?\)/
        );
        const banner = bannerMatch
          ? "https://fullstackopen.com" + bannerMatch[1]
          : null;
        const accentColor =
          bannerStyle.match(
            /background-color:\s*([^;]+)/
          )?.[1] || null;

        const partDescription =
          document.querySelector(".part-intro > div")
            ?.innerHTML || "";

        const lessons = Array.from(
          document.querySelectorAll(
            ".arrow__container--with-link a"
          )
        ).map((el, i) => {
          const span = el.querySelector("span");
          const label = span?.textContent.trim();
          const match = label?.match(/^([a-z])\s+(.*)/i);
          return {
            lessonID: match
              ? `${partID}-${match[1]}`
              : `${partID}-${String.fromCharCode(97 + i)}`,
            lessonLetter: match
              ? match[1]
              : String.fromCharCode(97 + i),
            lessonTitle: match ? match[2] : label,
            url:
              "https://fullstackopen.com" +
              el.getAttribute("href"),
          };
        });

        return {
          banner,
          accentColor,
          partDescription,
          lessons,
        };
      }, partID);

      results.push({
        partID,
        partName,
        partTitle,
        partUrl,
        banner: partDetails.banner,
        accentColor: partDetails.accentColor,
        partDescription: partDetails.partDescription,
        lessons: partDetails.lessons,
      });
    }

    await ensureDirExists(config.OUTPUT.fetchedData);
    await fs.writeFile(
      config.OUTPUT.dataJSON,
      JSON.stringify(results, null, 2),
      "utf-8"
    );
    hey.success("✅ All parts data saved.");

    await browser.close();
  } catch (error) {
    hey.error("Unexpected error: " + error.message);
    process.exit(1);
  }
}
