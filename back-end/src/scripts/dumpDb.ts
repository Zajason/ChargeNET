import { exec } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

/**
 * Find the back-end directory reliably.
 * - If script is run from inside back-end, cwd basename === "back-end"
 * - If run from repo root, expect a "back-end" folder under cwd
 */
function resolveBackendDir(): string {
  const cwd = process.cwd();
  if (path.basename(cwd) === "back-end") return cwd;

  const candidate = path.join(cwd, "back-end");
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;

  // Fallback: assume cwd is backend anyway
  return cwd;
}

const backendDir = resolveBackendDir();
const dumpDir = path.join(backendDir, "dump");

if (!fs.existsSync(dumpDir)) {
  console.log("📁 Creating dump directory...");
  fs.mkdirSync(dumpDir, { recursive: true });
}

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

const filename = `ev_app_dump_${getTimestamp()}.sql`;
const filepath = path.join(dumpDir, filename);

const command = `pg_dump "${DATABASE_URL}" -F p -f "${filepath}"`;

console.log("🚀 Starting database dump...");
console.log(`📦 Output: ${filepath}`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Dump failed:");
    console.error(error.message);
    process.exit(1);
  }

  if (stderr?.trim()) {
    console.warn("⚠️ pg_dump warnings:");
    console.warn(stderr);
  }

  console.log("✅ Database dump completed successfully!");
});
