import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { zipSync } from "fflate";

// Packs extension/uavt-bridge into public/indir/eksperix-bridge.zip so the live
// site can offer the Eksperix Bridge as a download. Runs on every install
// (postinstall), so the download always matches the committed extension.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "extension", "uavt-bridge");
const destDir = path.join(root, "public", "indir");

// Everything sits under one top-level folder: after unzipping, that folder is
// what "Paketlenmemiş öğe yükle" expects.
const files = {};
for (const name of readdirSync(srcDir)) {
  files[`eksperix-bridge/${name}`] = readFileSync(path.join(srcDir, name));
}

mkdirSync(destDir, { recursive: true });
writeFileSync(path.join(destDir, "eksperix-bridge.zip"), zipSync(files, { level: 9 }));
