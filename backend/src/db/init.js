const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function run() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
