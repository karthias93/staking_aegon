import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema/user";
// import { seedAdmin } from "../admin-login/seedAdmin";

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "postgres",
  database: process.env.DB_NAME || "aegon-ai",
    ssl: {
      rejectUnauthorized: false, 
    },
});

export const db = drizzle(pool, { schema });
// seedAdmin().catch(console.error);
export { schema };
