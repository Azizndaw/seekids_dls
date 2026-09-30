import { SignJWT, jwtVerify } from 'jose';

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

// Simple password hashing compatible with the platform
// Using Web Crypto API available in Cloudflare Workers
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'seekids-salt-2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password);
    return computed === hash;
}
