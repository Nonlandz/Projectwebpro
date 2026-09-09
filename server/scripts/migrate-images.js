import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/db.js";
import { legacyImage, storeImage, cleanupImage, storageConfig } from "../src/image-storage.js";

// Run from server/. Preview by default; --apply uploads and saves references.
const apply = process.argv.includes("--apply");
const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
try {
  if (apply) storageConfig();
  for (const group of ["posts", "users"]) {
    let entries;
    try { entries = await readdir(path.resolve("uploads", group), { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    for (const entry of entries.filter(entry => entry.isDirectory())) {
      const id = entry.name;
      const model = group === "posts" ? prisma.post : prisma.userInfo;
      const where = group === "posts" ? { id } : { userId: id };
      const field = group === "posts" ? "imagePath" : "profileImagePath";
      const record = await model.findUnique({ where });
      if (!record || record[field]) continue;
      const filename = await legacyImage(group, id);
      if (!filename) continue;
      console.log(`${apply ? "Migrating" : "Would migrate"}: ${group}/${id}/${path.basename(filename)}`);
      if (!apply) continue;
      const objectPath = await storeImage(group, id, { buffer: await readFile(filename), mimetype: mime[path.extname(filename).toLowerCase()] });
      try {
        const result = await model.updateMany({ where: { ...where, [field]: null }, data: {
          [field]: objectPath,
          ...(group === "users" ? { profileImageUrl: `/api/user/${id}/profile-image` } : {}),
        } });
        if (!result.count) await cleanupImage(objectPath);
      } catch (error) { await cleanupImage(objectPath); throw error; }
    }
  }
  console.log(apply ? "Migration finished. Local files were preserved." : "Preview finished. Run again with --apply to upload. Local files will be preserved.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
