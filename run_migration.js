import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

const MIGRATIONS_DIR = path.join('src', 'db', 'migrations');

async function run() {
    try {
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            console.log(`Running migration: ${file}`);
            await pool.query(sql);
        }

        console.log('All migrations completed successfully!');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

run();
