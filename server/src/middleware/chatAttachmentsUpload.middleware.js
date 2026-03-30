
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
const CHAT_DIR = path.resolve(UPLOADS_DIR, "chat");
ensureDir(CHAT_DIR);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, CHAT_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext || ".bin"}`);
  },
});

export const chatAttachmentsUpload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 15 * 1024 * 1024,
  },
});
