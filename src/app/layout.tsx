import { Metadata, Viewport } from 'next';

import './globals.css';
import '@/styles/dashboard.css';

import { ThemeProvider } from '@/context/ThemeContext';
import { LoadingProvider } from '@/context/LoadingProvider';

export const metadata: Metadata = {
  title: {
    default: 'SOLAR HUB',
    template: '%s | SOLAR HUB'
  },
  description: 'Admin page Product LifeCycle PLN ICON +',
  keywords: ['product lifecycle', 'PLN', 'Solar', 'management'],
  authors: [{ name: 'PLN ICON +' }],
  creator: 'PLN ICON +',
  publisher: 'PLN ICON +',
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/fonts/inter-local.css" />
      </head>
      <body className="font-inter">
        <ThemeProvider>
          <LoadingProvider>
            {children}
          </LoadingProvider>
        </ThemeProvider>  
      </body>
    </html>
  );
}