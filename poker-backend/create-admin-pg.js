// Quick script to create an admin user in PostgreSQL production database
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

async function createAdminUser() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    const adminData = {
      google_id: 'admin-test-edwin',
      email: 'edwinlin1987@gmail.com',
      name: 'Edwin Lin',
      avatar_url: null
    };

    // Check if user exists
    const checkSql = 'SELECT id, email, name FROM users WHERE google_id = $1';
    const existing = await client.query(checkSql, [adminData.google_id]);

    if (existing.rows.length > 0) {
      console.log('ℹ️  User already exists:', existing.rows[0]);
    } else {
      // Create new user
      const insertSql = `
        INSERT INTO users (google_id, email, name, avatar_url, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, email, name
      `;

      const result = await client.query(insertSql, [
        adminData.google_id,
        adminData.email,
        adminData.name,
        adminData.avatar_url
      ]);

      console.log('✅ User created successfully!');
      console.log('User:', result.rows[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createAdminUser()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
