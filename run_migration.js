import pkg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    try {
        const sql = fs.readFileSync('db_migration.sql', 'utf8');
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration successful!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

run();
