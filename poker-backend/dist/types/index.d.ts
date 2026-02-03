export interface Player {
    id: number;
    name: string;
    email?: string;
    created_at: string;
}
export interface User {
    id: number;
    google_id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
    last_login: string | null;
}
export interface Session {
    id: number;
    name: string;
    scheduled_datetime: string | null;
    timezone?: string;
    created_by: number;
    created_at: string;
    game_type?: 'cash' | 'tournament';
}
export type PlayerStatus = 'Invited' | 'In' | 'Out' | 'Maybe' | 'Attending but not playing';
export interface SessionPlayer {
    id: number;
    session_id: number;
    player_id: number;
    status: PlayerStatus;
    buy_in: number;
    cash_out: number;
    created_at: string;
    player?: Player;
}
export interface SeatingChart {
    id: number;
    session_id: number;
    name: string;
    number_of_tables: number;
    created_at: string;
    assignments?: SeatingAssignment[];
}
export interface SeatingAssignment {
    id: number;
    seating_chart_id: number;
    player_id: number;
    table_number: number;
    seat_position: number;
    created_at: string;
    player?: Player;
}
export interface CreatePlayerRequest {
    name: string;
    email?: string;
}
export interface UpdatePlayerRequest {
    name: string;
    email?: string;
}
export interface CreateSessionRequest {
    name?: string;
    scheduledDateTime: string;
    timezone?: string;
    playerIds?: number[];
    game_type?: 'cash' | 'tournament';
}
export interface UpdateSessionRequest {
    name?: string;
    scheduledDateTime: string;
    playerIds?: number[];
    game_type?: 'cash' | 'tournament';
}
export interface UpdatePlayerStatusRequest {
    status: PlayerStatus;
}
export interface UpdatePlayerFinancialsRequest {
    buy_in?: number;
    cash_out?: number;
}
export interface CreateSeatingChartRequest {
    sessionId: number;
    name: string;
    numberOfTables: number;
    playerIds: number[];
}
export interface UpdateSeatingChartRequest {
    name: string;
}
export interface SessionWithPlayers {
    id: number;
    name: string;
    scheduledDateTime: string | null;
    createdBy: number;
    createdAt: string;
    game_type?: 'cash' | 'tournament';
    players: SessionPlayer[];
}
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}
export interface HealthCheckResponse {
    status: string;
    message: string;
    timestamp?: string;
}
export interface SessionQueryResult {
    id: number;
    name: string;
    scheduled_datetime: string | null;
    created_at: string;
    player_ids: string | null;
    player_names: string | null;
}
export interface AuthUser {
    id: number;
    email: string;
    name: string;
    avatar_url: string | null;
}
export interface JWTPayload {
    userId: number;
    email: string;
    iat?: number;
    exp?: number;
}
export interface ApiError extends Error {
    statusCode?: number;
}
import { Request, Response } from 'express';
export interface TypedRequest<T = any> extends Request {
    body: T;
    user?: AuthUser | undefined;
}
export interface TypedResponse<T = any> extends Response {
    json: (body: T) => this;
}
//# sourceMappingURL=index.d.ts.map