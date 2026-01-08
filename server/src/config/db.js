import dotenv from "dotenv";
dotenv.config();

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to server/.env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function closeDb() {
  await pool.end();
}
