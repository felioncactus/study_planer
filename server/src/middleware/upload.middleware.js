import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function resolveUploadsDir() {
  const cwd = process.cwd();
  const direct = path.resolve(cwd, "uploads");
  const nested = path.resolve(cwd, "server", "uploads");
  if (fs.existsSync(direct)) return direct;
  if (fs.existsSync(nested)) return nested;
  // default to direct (will be created)
  return direct;
}

const UPLOADS_DIR = resolveUploadsDir();
const COURSES_DIR = path.resolve(UPLOADS_DIR, "courses");
ensureDir(COURSES_DIR);

function safeExt(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  return allowed.has(ext) ? ext : "";
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, COURSES_DIR);
  },
  filename(req, file, cb) {
    const ext = safeExt(file.originalname);
    const id = crypto.randomUUID();
    cb(null, `${id}${ext || ".bin"}`);
  },
});

export const courseUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});
