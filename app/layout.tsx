import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-jb",
});

export const metadata: Metadata = {
  title: "Job Postings Monitor",
  description: "Check career pages daily for new job postings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans antialiased text-ink">
        <div className="mx-auto min-h-screen max-w-content px-4 py-5 sm:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
