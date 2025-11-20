import fs from "fs/promises";

// This will create the folder (and any missing parents)
// or do nothing if it already exists
export async function ensureDirExists(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}
