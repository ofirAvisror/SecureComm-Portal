const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function run() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');
  try {
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));
    console.log('Database schema initialized successfully.');
    if (fs.existsSync(seedPath)) {
      await pool.query(fs.readFileSync(seedPath, 'utf8'));
      console.log('Catalog seed data loaded (packages, sectors).');
    }
  } catch (err) {
    console.error('Failed to initialize schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
