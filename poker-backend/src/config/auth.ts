import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import db from '../database/index';
import { User, AuthUser, JWTPayload } from '../types/index';

// Environment variables for Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET_HERE';
const JWT_SECRET = process.env.JWT_SECRET || 'poker-night-jwt-secret-change-in-production-2024';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';

console.log('Auth config loaded:', {
  GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID.substring(0, 20) + '...',
  hasSecret: !!GOOGLE_CLIENT_SECRET,
  isConfigured: !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE')
});

// Configure Google OAuth Strategy (only if we have real credentials)
if (!GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE') && !GOOGLE_CLIENT_SECRET.includes('YOUR_GOOGLE_CLIENT_SECRET_HERE')) {
  // Determine the callback URL based on environment
  const getCallbackURL = () => {
    if (process.env.NODE_ENV === 'production') {
      // In production, use custom domain or fallback to Railway domain
      const customDomain = process.env.CUSTOM_DOMAIN;
      const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

      let baseUrl;
      if (customDomain) {
        baseUrl = `https://${customDomain}`;
      } else if (railwayDomain) {
        baseUrl = `https://${railwayDomain}`;
      } else {
        baseUrl = 'https://poker-night-app-production.up.railway.app'; // fallback
      }

      return `${baseUrl}/api/auth/google/callback`;
    }
    return "/api/auth/google/callback"; // relative URL for development
  };

  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: getCallbackURL()
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth strategy called');
    console.log('Profile received:', { id: profile.id, email: profile.emails?.[0]?.value, name: profile.displayName });

    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
      console.error('No email found in Google profile');
      return done(new Error('No email found in Google profile'), undefined);
    }

    console.log('Looking for existing user with Google ID:', googleId);
    // Check if user already exists
    const existingUser = await findUserByGoogleId(googleId);

    if (existingUser) {
      console.log('Existing user found:', existingUser.id);
      // Update last login
      await updateUserLastLogin(existingUser.id);
      console.log('Last login updated');
      return done(null, existingUser);
    }

    console.log('Creating new user');
    // Create new user with default 'player' role
    const newUser = await createUser({
      google_id: googleId,
      email,
      name,
      avatar_url: avatarUrl || null
    });

    console.log('New user created:', newUser.id);
    return done(null, newUser);
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, undefined);
  }
  }));
  console.log('✅ Google OAuth strategy configured successfully');
} else {
  console.log('⚠️  Google OAuth not configured - please update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  console.log('📖 See GOOGLE_OAUTH_SETUP.md for setup instructions');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Database helper functions
async function findUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    const sql = 'SELECT * FROM users WHERE google_id = ?';
    const row = await db.get(sql, [googleId]);
    return row || null;
  } catch (error) {
    console.error('Error finding user by Google ID:', error);
    throw error;
  }
}

async function findUserById(id: number): Promise<User | null> {
  try {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const row = await db.get(sql, [id]);
    return row || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = await db.get(sql, [email]);
    return row || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

async function createUser(userData: Omit<User, 'id' | 'created_at' | 'last_login'>): Promise<User> {
  try {
    const sql = `
      INSERT INTO users (google_id, email, name, avatar_url)
      VALUES (?, ?, ?, ?)
    `;

    const result = await db.run(sql, [
      userData.google_id,
      userData.email,
      userData.name,
      userData.avatar_url || null
    ]);

    const userId = result.lastID;
    if (!userId) {
      throw new Error('Failed to get user ID');
    }

    // Fetch the created user
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('Failed to fetch created user');
    }

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function updateUserLastLogin(userId: number): Promise<void> {
  try {
    const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    await db.run(sql, [userId]);
  } catch (error) {
    console.error('Error updating user last login:', error);
    throw error;
  }
}

// JWT helper functions
export function generateJWT(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Convert User to AuthUser
export function userToAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url
  };
}

// Export database functions for use in routes
export {
  findUserByEmail,
  findUserById,
  updateUserLastLogin
};

export default passport;
