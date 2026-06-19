import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(__dirname, "../sprites-source");
const outputDir = path.join(__dirname, "../public/sprites");

const TARGETS = [
  { fileName: "gj-dev-sprite.png", webp: { quality: 95, alphaQuality: 100, effort: 6 } },
  { fileName: "sher-design-sprite.png", webp: { quality: 92, alphaQuality: 100, effort: 6 } },
  { fileName: "bumpy_single.png", webp: { quality: 90, alphaQuality: 100, effort: 6 } },
];

async function compressSprite({ fileName, webp }) {
  const inputPath = path.join(sourceDir, fileName);
  const outputBase = fileName.replace(/\.png$/i, "");
  const outputPath = path.join(outputDir, `${outputBase}.webp`);

  await sharp(inputPath).webp(webp).toFile(outputPath);

  const before = fs.statSync(inputPath).size;
  const after = fs.statSync(outputPath).size;
  const savings = Math.round((1 - after / before) * 100);

  console.log(`${fileName}: ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB (${savings}% smaller, pixels unchanged)`);
}

for (const target of TARGETS) {
  await compressSprite(target);
}

console.log("Compressed sprite sheets written as .webp. Transparency is applied at runtime.");
