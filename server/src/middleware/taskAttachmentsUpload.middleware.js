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
  return direct;
}

const UPLOADS_DIR = resolveUploadsDir();
const TASKS_DIR = path.resolve(UPLOADS_DIR, "tasks");
ensureDir(TASKS_DIR);

function sanitizeFilename(name) {
  const base = (name || "file").replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base.length ? base : "file";
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const taskId = req.params.id;
    const dir = path.resolve(TASKS_DIR, taskId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const id = crypto.randomUUID();
    const safeOriginal = sanitizeFilename(file.originalname);
    cb(null, `${id}__${safeOriginal}`);
  },
});

export const taskAttachmentsUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 10,
  },
});
