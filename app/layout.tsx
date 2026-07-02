import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Outfit, JetBrains_Mono } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import { SafeAreaProvider } from '@/components/SafeAreaProvider';
import ToastContainer from '@/components/ui/Toast';
import './globals.css';

// ---------- Fonts ----------
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
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
    'Arogyamandiram is your health & wellness companion for tracking nutrition, hydration, weight, workouts, sleep, and more, with insights that are personal to you. Private by design.',
  keywords: [
    'health',
    'wellness',
    'nutrition',
    'fitness',
    'tracker',
    'food logging',
    'calories',
    'workouts',
    'sleep',
    'water intake',
    'Insights & recommendations',
  ],
  authors: [{ name: 'Arogyamandiram' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'ArogyaM',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#08080d',
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
};

// ---------- Root Layout ----------
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${bebasNeue.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body bg-bg-primary text-text-primary antialiased">
        <SafeAreaProvider />
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
