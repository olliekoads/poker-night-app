import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types/index';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare function authenticateToken(req: any, res: any, next: any): Promise<void>;
export declare function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireSessionOwnership(req: any, res: any, next: any): Promise<void>;
export declare function requireAuth(req: any, res: any, next: any): void;
export {};
//# sourceMappingURL=auth.d.ts.map