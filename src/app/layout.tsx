import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RESQ — Emergency Reporting & Response System',
  description: 'AI-Powered Disaster Detection, Citizen Emergency Reporting & Multi-Agency Response Control Center.',
  keywords: ['emergency response', 'disaster detection', 'SOS', 'realtime incident management', 'AI disaster response'],
};

export const viewport: Viewport = {
  themeColor: '#080b11',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="ambient-glow-mesh" aria-hidden="true" />
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
