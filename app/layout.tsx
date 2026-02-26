import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import ToastContainer from '@/components/ui/Toast';
import './globals.css';

// ---------- Fonts ----------
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// Satoshi is a premium font - using DM Sans as fallback
// To use Satoshi, download from https://www.fontshare.com/fonts/satoshi
// and add to /public/fonts/

// ---------- Metadata ----------
export const metadata: Metadata = {
  title: 'Arogyamandiram – Intelligent Health & Wellness OS',
  description:
    'Arogyamandiram is your intelligent health & wellness companion for tracking nutrition, hydration, weight, workouts, sleep, and more with AI-personalized insights.',
  keywords: [
    'health',
    'wellness',
    'nutrition',
    'fitness',
    'tracker',
    'Indian food',
    'calories',
    'workouts',
    'sleep',
    'water intake',
    'AI recommendations',
  ],
  authors: [{ name: 'Arogyamandiram' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#08080d',
  viewportFit: 'cover',
};

// ---------- Root Layout ----------
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${jetbrainsMono.variable}`}
      style={{ ['--font-satoshi' as string]: "'DM Sans', system-ui, sans-serif" }}
      suppressHydrationWarning
    >
      <body className="font-body bg-bg-primary text-text-primary antialiased">
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
