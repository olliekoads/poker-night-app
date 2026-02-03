// Generate a JWT token for testing without Google OAuth
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'poker-night-jwt-secret-change-in-production-2024';

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

async function generateToken() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Get Edwin's user
    const result = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['edwinlin1987@gmail.com']
    );

    if (result.rows.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ Found user:', user);

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    console.log('\n✅ JWT Token generated:');
    console.log('━'.repeat(80));
    console.log(token);
    console.log('━'.repeat(80));
    console.log('\nTo test the API, use this token in requests:');
    console.log('Authorization: Bearer ' + token);
    console.log('\nTest with curl:');
    console.log(`curl -H "Authorization: Bearer ${token}" https://poker-night-app-production-e6e4.up.railway.app/api/players`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

generateToken()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
