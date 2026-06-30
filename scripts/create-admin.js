// Usage: node scripts/create-admin.js admin@example.com yourpassword
const bcrypt = require("bcryptjs");
const pg     = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.js <email> <password>");
  process.exit(1);
}

const pool = new pg.Pool({
  host:     process.env.PGHOST     || "localhost",
  port:     parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "preisgucken",
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function main() {
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2",
    [email, hash]
  );
  console.log(`✓ Admin created/updated: ${email}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
