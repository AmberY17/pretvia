import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Kumar_One_Outline } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { FeedbackButton } from "@/components/feedback/feedback-button";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
const kumarOneOutline = Kumar_One_Outline({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brand",
});

const siteUrl = 'https://pretvia.com'
const siteDescription =
  'Track your training with emoji-powered visual logs, custom tags, and share them with your fellow athletes.'

export const metadata: Metadata = {
  title: {
    default: 'Pretvia',
    template: '%s | Pretvia',
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Pretvia',
    description: siteDescription,
    url: siteUrl,
    siteName: 'Pretvia',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pretvia',
    description: siteDescription,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pretvia',
  },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

// Inline script to apply saved color theme before paint to prevent flash
const colorThemeScript = `
(function() {
  try {
    var c = localStorage.getItem('pretvia-color');
    if (c && ['green','blue','indigo'].indexOf(c) !== -1) {
      document.documentElement.setAttribute('data-theme', c);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${kumarOneOutline.variable}`}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: colorThemeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Pretvia',
              description: siteDescription,
              applicationCategory: 'SportsApplication',
              operatingSystem: 'Web',
              url: siteUrl,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden">
        <QueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <FeedbackButton />
          <Toaster
            position="top-right"
            duration={2000}
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
