import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode('seekids-jwt-secret-key-2026-dls');

export interface JWTPayload {
    userId: string;
    email: string;
    nom: string;
    prenom: string;
    role: string[];
    schoolId: string;
    telephone?: string;
    est_approuve: boolean;
    created_at?: string;
}

export async function signToken(payload: JWTPayload, expiresIn = '7d'): Promise<string> {
    return new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}
