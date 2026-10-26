/**
 * make-logo.mjs — Render logo.svg → logo.png (1024) & icon.png (512, favicon)
 * Jalankan: bun /home/z/my-project/scripts/make-logo.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";

const SVG = "/home/z/my-project/public/logo.svg";
const svg = readFileSync(SVG);

// 1) logo.png — dipakai <img src="/logo.png">, OG image, sidebar
await sharp(svg, { density: 96 })
  .resize(1024, 1024)
  .png()
  .toFile("/home/z/my-project/public/logo.png");
console.log("OK public/logo.png 1024x1024");

// 2) icon.png — favicon app router Next.js
await sharp(svg, { density: 96 })
  .resize(512, 512)
  .png()
  .toFile("/home/z/my-project/src/app/icon.png");
console.log("OK src/app/icon.png 512x512");
