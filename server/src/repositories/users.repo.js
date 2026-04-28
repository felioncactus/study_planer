import { pool } from "../config/db.js";

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, name, avatar_url, language, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1;`,
    [email]
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, email, name, avatar_url, language, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1;`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser({ email, passwordHash, name, avatarUrl = null, language = "en" }) {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, avatar_url, language)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, avatar_url, language, created_at, updated_at;`,
    [email, passwordHash, name, avatarUrl, language]
  );
  return result.rows[0];
}

export async function updateUserById(id, { email, name, avatarUrl, language }) {
  const sets = [];
  const values = [];
  let i = 1;

  if (email !== undefined) {
    sets.push(`email = $${i++}`);
    values.push(email);
  }
  if (name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(name);
  }
  if (avatarUrl !== undefined) {
    sets.push(`avatar_url = $${i++}`);
    values.push(avatarUrl);
  }
  if (language !== undefined) {
    sets.push(`language = $${i++}`);
    values.push(language);
  }

  if (!sets.length) return await findUserById(id);

  values.push(id);

  const result = await pool.query(
    `UPDATE users
     SET ${sets.join(", ")}
     WHERE id = $${i}
     RETURNING id, email, name, avatar_url, language, created_at, updated_at;`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteUserById(id) {
  await pool.query(`DELETE FROM users WHERE id = $1;`, [id]);
}
