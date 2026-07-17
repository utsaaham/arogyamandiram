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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() })
          .select('+password')
          .lean();

        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password as string);
        if (!isMatch) {
          throw new Error('Invalid email or password');
        }

        // Return minimal data for the session token
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.profile?.name || '',
        };
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
    async jwt({ token, user }: { token: JWT; user?: { id?: string; isGuest?: boolean } }) {
      if (user?.id) {
        token.userId = user.id;
        if (user.isGuest) token.isGuest = true;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as { id?: string; isGuest?: boolean }).id = token.userId as string;
        (session.user as { isGuest?: boolean }).isGuest = token.isGuest ?? false;
      }
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
