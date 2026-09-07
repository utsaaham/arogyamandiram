import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    authError?: 'SessionRevoked';
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isGuest?: boolean;
    };
  }
  interface User {
    isGuest?: boolean;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    isGuest?: boolean;
    sessionVersion?: number;
    sessionVersionCheckedAt?: number;
    authError?: 'SessionRevoked';
  }
}
