"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../database/index"));
const createAdminUser = async () => {
    const adminData = {
        google_id: 'admin-test-123',
        email: 'admin@pokernight.com',
        name: 'Admin User',
        avatar_url: null,
        role: 'admin'
    };
    const sql = `
    INSERT INTO users (google_id, email, name, avatar_url, role)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (google_id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      role = EXCLUDED.role
  `;
    try {
        await index_1.default.run(sql, [
            adminData.google_id,
            adminData.email,
            adminData.name,
            adminData.avatar_url,
            adminData.role
        ]);
        console.log('✅ Admin user created successfully!');
        console.log('Email:', adminData.email);
        console.log('Role:', adminData.role);
        console.log('Google ID:', adminData.google_id);
    }
    catch (err) {
        console.error('Error creating admin user:', err.message);
        throw err;
    }
};
const createPlayerUser = async () => {
    const playerData = {
        google_id: 'player-test-456',
        email: 'player@pokernight.com',
        name: 'Test Player',
        avatar_url: null,
        role: 'player'
    };
    const sql = `
    INSERT INTO users (google_id, email, name, avatar_url, role)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (google_id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      role = EXCLUDED.role
  `;
    try {
        await index_1.default.run(sql, [
            playerData.google_id,
            playerData.email,
            playerData.name,
            playerData.avatar_url,
            playerData.role
        ]);
        console.log('✅ Player user created successfully!');
        console.log('Email:', playerData.email);
        console.log('Role:', playerData.role);
        console.log('Google ID:', playerData.google_id);
    }
    catch (err) {
        console.error('Error creating player user:', err.message);
        throw err;
    }
};
const main = async () => {
    try {
        console.log('🔧 Creating test users...');
        await createPlayerUser();
        await createAdminUser();
        console.log('✅ All test users created successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Failed to create test users:', error);
        process.exit(1);
    }
};
main();
//# sourceMappingURL=createAdmin.js.map