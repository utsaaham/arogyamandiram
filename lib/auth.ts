// ============================================
// NextAuth.js Configuration
// ============================================

import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import User from '@/models/User';
import {
  clearLoginFailures,
  DUMMY_PASSWORD_HASH,
  getClientIp,
  inspectLoginLimit,
  loginCredentialsSchema,
  recordLoginFailure,
} from '@/lib/authSecurity';

function hashDeviceId(deviceId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? 'dev-secret-min-32-chars-for-jwt-signing';
  return crypto.createHmac('sha256', secret).update(deviceId).digest('hex');
}

function generateGuestUsername(): string {
  return `guest_${crypto.randomBytes(4).toString('hex')}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        try {
        const parsed = loginCredentialsSchema.safeParse(credentials);
        const ip = getClientIp(request.headers);
        await connectDB();

        if (!parsed.success) {
          console.error('[Auth] Login failed: credential validation failed', parsed.error.flatten());
          await recordLoginFailure('invalid-credentials', ip);
          throw new Error('INVALID_CREDENTIALS');
        }

        const { email, password } = parsed.data;
        const limit = await inspectLoginLimit(email, ip);
        if (!limit.allowed) throw new Error('RATE_LIMITED');

        const user = await User.findOne({ email })
          .select('+password +authSecurity.sessionVersion')
          .lean();

        if (!user) {
          console.error('[Auth] Login failed: no user found for email');
          await recordLoginFailure(email, ip);
          throw new Error('INVALID_CREDENTIALS');
        }
        if (typeof user.password !== 'string') {
          console.error('[Auth] Login failed: user has no password set');
          await recordLoginFailure(email, ip);
          throw new Error('INVALID_CREDENTIALS');
        }
        const storedPassword = user.password;
        console.error(`[Auth] Debug: password length=${password.length}, hash prefix=${storedPassword.substring(0, 7)}, hash length=${storedPassword.length}`);
        const isMatch = await bcrypt.compare(password, storedPassword);
        console.error(`[Auth] Debug: bcrypt.compare result=${isMatch}`);
        if (!isMatch) {
          console.error('[Auth] Login failed: password mismatch');
          await recordLoginFailure(email, ip);
          throw new Error('INVALID_CREDENTIALS');
        }

        await clearLoginFailures(email, ip);

        // Return minimal data for the session token
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.profile?.name || '',
          sessionVersion: user.authSecurity?.sessionVersion ?? 0,
        };
        } catch (err) {
          if (err instanceof Error && (err.message === 'INVALID_CREDENTIALS' || err.message === 'RATE_LIMITED')) {
            throw err;
          }
          console.error('[Auth] Unexpected login error:', err instanceof Error ? err.message : err);
          throw new Error('INVALID_CREDENTIALS');
        }
      },
    }),

    CredentialsProvider({
      id: 'guest',
      name: 'guest',
      credentials: {
        deviceId: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.deviceId) throw new Error('Missing deviceId');

        const fingerprint = hashDeviceId(credentials.deviceId);
        await connectDB();

        // Return existing guest if fingerprint matches
        const existing = await User.findOne({ guestFingerprint: fingerprint })
          .select('+guestFingerprint')
          .lean();

        if (existing) {
          // Touch updatedAt to reset the 10-day inactivity clock
          await User.updateOne({ _id: existing._id }, { $set: { updatedAt: new Date() } });
          return {
            id: existing._id.toString(),
            name: existing.username ?? 'Guest',
            email: null,
            isGuest: true,
          };
        }

        // Create new guest user
        try {
          const newGuest = await User.create({
            username: generateGuestUsername(),
            isGuest: true,
            guestFingerprint: fingerprint,
            profile: { name: 'Guest' },
            onboardingComplete: false,
          });
          return {
            id: newGuest._id.toString(),
            name: newGuest.username,
            email: null,
            isGuest: true,
          };
        } catch (err) {
          // Race-condition duplicate - another request created this guest simultaneously
          if ((err as { code?: number }).code === 11000) {
            const race = await User.findOne({ guestFingerprint: fingerprint })
              .select('+guestFingerprint')
              .lean();
            if (race) {
              return {
                id: race._id.toString(),
                name: race.username ?? 'Guest',
                email: null,
                isGuest: true,
              };
            }
          }
          throw err;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: { id?: string; isGuest?: boolean; sessionVersion?: number } }) {
      if (user?.id) {
        token.userId = user.id;
        token.authError = undefined;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.sessionVersionCheckedAt = Date.now();
        if (user.isGuest) token.isGuest = true;
        return token;
      }

      const shouldCheckVersion = token.userId
        && (!token.sessionVersionCheckedAt || Date.now() - token.sessionVersionCheckedAt >= 60_000);

      if (shouldCheckVersion) {
        await connectDB();
        const currentUser = await User.findById(token.userId)
          .select('+authSecurity.sessionVersion')
          .lean();
        const currentVersion = currentUser?.authSecurity?.sessionVersion ?? 0;

        if (!currentUser || (token.sessionVersion !== undefined && token.sessionVersion !== currentVersion)) {
          token.userId = undefined;
          token.authError = 'SessionRevoked';
        } else {
          token.sessionVersion = currentVersion;
          token.sessionVersionCheckedAt = Date.now();
        }
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as { id?: string; isGuest?: boolean }).id = token.userId ?? '';
        (session.user as { isGuest?: boolean }).isGuest = token.isGuest ?? false;
      }
      if (token.authError) session.authError = token.authError;
      return session;
    },
  },

  // Use NEXTAUTH_SECRET from env; in development only, fallback so local dev works without .env
  secret:
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === 'development'
      ? 'dev-secret-min-32-chars-for-jwt-signing'
      : undefined),
};

export default authOptions;
