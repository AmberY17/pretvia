import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Kumar_One_Outline } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

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

export const metadata: Metadata = {
  title: "Pretvia",
  description:
    "Track your training with emoji-powered visual logs, custom tags, and share them with your fellow athletes.",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

// Inline script to apply saved color theme before paint to prevent flash
const colorThemeScript = `
(function() {
  try {
    var c = localStorage.getItem('prets-color');
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorThemeScript }} />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
