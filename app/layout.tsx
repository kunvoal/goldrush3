import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { DerivWSProvider } from '@/components/deriv-ws-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GOLDRUSH 3 — 5-Tick Impulse Radar & Sniper',
  description: 'Dedicated 5-Tick Only Ups & Only Downs Quant Radar and Sniper Bot for Deriv',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background min-h-screen text-slate-100 antialiased`}>
        <DerivWSProvider>
          {children}
        </DerivWSProvider>
      </body>
    </html>
  );
}
