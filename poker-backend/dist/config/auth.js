"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJWT = generateJWT;
exports.verifyJWT = verifyJWT;
exports.userToAuthUser = userToAuthUser;
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.updateUserLastLogin = updateUserLastLogin;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = __importDefault(require("../database/index"));
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET_HERE';
const JWT_SECRET = process.env.JWT_SECRET || 'poker-night-jwt-secret-change-in-production-2024';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';
console.log('Auth config loaded:', {
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID.substring(0, 20) + '...',
    hasSecret: !!GOOGLE_CLIENT_SECRET,
    isConfigured: !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE')
});
if (!GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE') && !GOOGLE_CLIENT_SECRET.includes('YOUR_GOOGLE_CLIENT_SECRET_HERE')) {
    const getCallbackURL = () => {
        if (process.env.NODE_ENV === 'production') {
            const customDomain = process.env.CUSTOM_DOMAIN;
            const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
            let baseUrl;
            if (customDomain) {
                baseUrl = `https://${customDomain}`;
            }
            else if (railwayDomain) {
                baseUrl = `https://${railwayDomain}`;
            }
            else {
                baseUrl = 'https://poker-night-app-production.up.railway.app';
            }
            return `${baseUrl}/api/auth/google/callback`;
        }
        return "/api/auth/google/callback";
    };
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
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
            const existingUser = await findUserByGoogleId(googleId);
            if (existingUser) {
                console.log('Existing user found:', existingUser.id);
                await updateUserLastLogin(existingUser.id);
                console.log('Last login updated');
                return done(null, existingUser);
            }
            console.log('Creating new user');
            const newUser = await createUser({
                google_id: googleId,
                email,
                name,
                avatar_url: avatarUrl || null
            });
            console.log('New user created:', newUser.id);
            return done(null, newUser);
        }
        catch (error) {
            console.error('Error in Google OAuth strategy:', error);
            return done(error, undefined);
        }
    }));
    console.log('✅ Google OAuth strategy configured successfully');
}
else {
    console.log('⚠️  Google OAuth not configured - please update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
    console.log('📖 See GOOGLE_OAUTH_SETUP.md for setup instructions');
}
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
async function findUserByGoogleId(googleId) {
    try {
        const sql = 'SELECT * FROM users WHERE google_id = ?';
        const row = await index_1.default.get(sql, [googleId]);
        return row || null;
    }
    catch (error) {
        console.error('Error finding user by Google ID:', error);
        throw error;
    }
}
async function findUserById(id) {
    try {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const row = await index_1.default.get(sql, [id]);
        return row || null;
    }
    catch (error) {
        console.error('Error finding user by ID:', error);
        throw error;
    }
}
async function findUserByEmail(email) {
    try {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const row = await index_1.default.get(sql, [email]);
        return row || null;
    }
    catch (error) {
        console.error('Error finding user by email:', error);
        throw error;
    }
}
async function createUser(userData) {
    try {
        const sql = `
      INSERT INTO users (google_id, email, name, avatar_url)
      VALUES (?, ?, ?, ?)
    `;
        const result = await index_1.default.run(sql, [
            userData.google_id,
            userData.email,
            userData.name,
            userData.avatar_url || null
        ]);
        const userId = result.lastID;
        if (!userId) {
            throw new Error('Failed to get user ID');
        }
        const user = await findUserById(userId);
        if (!user) {
            throw new Error('Failed to fetch created user');
        }
        return user;
    }
    catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}
async function updateUserLastLogin(userId) {
    try {
        const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
        await index_1.default.run(sql, [userId]);
    }
    catch (error) {
        console.error('Error updating user last login:', error);
        throw error;
    }
}
function generateJWT(user) {
    const payload = {
        userId: user.id,
        email: user.email
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyJWT(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
}
function userToAuthUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
    };
}
exports.default = passport_1.default;
//# sourceMappingURL=auth.js.map