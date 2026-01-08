import { pool } from "../config/db.js";

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, name, created_at
     FROM users
     WHERE email = $1
     LIMIT 1;`,
    [email]
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, email, name, created_at
     FROM users
     WHERE id = $1
     LIMIT 1;`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser({ email, passwordHash, name }) {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at;`,
    [email, passwordHash, name]
  );
  return result.rows[0];
}
