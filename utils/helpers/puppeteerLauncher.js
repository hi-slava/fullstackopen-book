/* 
  This file is used to launch puppeteer.
  It's here in case we need to use the barebones version of puppeteer.
  Eg. if I will decide to do an electron version of the app with frontend.
*/

export default async function launchPuppeteer(
  options = {}
) {
  const usingElectron = !!process.versions.electron;
  let puppeteer;

  if (usingElectron) {
    puppeteer = (await import("puppeteer-core")).default;
    options.executablePath =
      options.executablePath || process.execPath;
    options.headless = "new";
    options.args = options.args || [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ];
  } else {
    puppeteer = (await import("puppeteer")).default;
    options.headless = true;
  }

  return puppeteer.launch(options);
}
