import passport from 'passport';
import { User, AuthUser, JWTPayload } from '../types/index';
declare function findUserById(id: number): Promise<User | null>;
declare function findUserByEmail(email: string): Promise<User | null>;
declare function updateUserLastLogin(userId: number): Promise<void>;
export declare function generateJWT(user: User): string;
export declare function verifyJWT(token: string): JWTPayload | null;
export declare function userToAuthUser(user: User): AuthUser;
export { findUserByEmail, findUserById, updateUserLastLogin };
export default passport;
//# sourceMappingURL=auth.d.ts.map