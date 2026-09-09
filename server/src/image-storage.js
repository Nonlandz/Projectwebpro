import { randomUUID } from "node:crypto";
import path from "node:path";
import { readdir } from "node:fs/promises";
import multer from "multer";

const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (req, file, callback) => callback(null, Boolean(types[file.mimetype])),
});
export const uploadPostImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 5 },
  fileFilter: (req, file, callback) => callback(null, Boolean(types[file.mimetype])),
});

export function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "media";
  if (!url || !key) throw Object.assign(new Error("Cloud image storage is not configured"), { status: 503 });
  if (new URL(url).protocol !== "https:") throw new Error("SUPABASE_URL must use HTTPS");
  return { url, key, bucket };
}

function objectUrl(objectPath, publicAccess = false) {
  const { url, bucket } = storageConfig();
  return `${url}/storage/v1/object/${publicAccess ? "public/" : ""}${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}

export function publicImageUrl(objectPath) { return objectUrl(objectPath, true); }

export async function storeImage(group, id, file) {
  if (!["posts", "users"].includes(group) || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid image owner");
  const buffer = file.buffer;
  const valid = file.mimetype === "image/jpeg" ? buffer?.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : file.mimetype === "image/png" ? buffer?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : file.mimetype === "image/webp" && buffer?.toString("ascii", 0, 4) === "RIFF" && buffer?.toString("ascii", 8, 12) === "WEBP";
  if (!valid || !buffer.length || buffer.length > 5 * 1024 * 1024) {
    throw Object.assign(new Error("Use a JPEG, PNG or WebP image up to 5 MB"), { status: 400 });
  }
  const { key } = storageConfig();
  const objectPath = `${group}/${id}/${randomUUID()}.${types[file.mimetype]}`;
  const response = await fetch(objectUrl(objectPath), {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": file.mimetype, "Cache-Control": "max-age=31536000", "x-upsert": "false" },
    body: buffer, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Object.assign(new Error("Cloud image upload failed"), { status: 502 });
  return objectPath;
}

export async function removeImage(objectPath) {
  if (!objectPath) return;
  const { url, key, bucket } = storageConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Cloud image cleanup failed");
}

export async function cleanupImage(objectPath) {
  try { await removeImage(objectPath); }
  catch { console.warn("Cloud image cleanup needs retry:", objectPath); }
}

export async function legacyImage(group, id) {
  if (!["posts", "users"].includes(group) || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const directory = path.resolve("uploads", group, id);
  try {
    const prefix = group === "posts" ? "image-" : "profile-";
    const files = (await readdir(directory, { withFileTypes: true }))
      .filter(file => file.isFile() && file.name.startsWith(prefix))
      .sort((a, b) => b.name.localeCompare(a.name));
    return files.length ? path.join(directory, files[0].name) : null;
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
