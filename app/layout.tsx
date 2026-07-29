import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
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
    <html lang="en">
      <body className={`${plusJakarta.className} min-h-screen antialiased`}>
        <div className="mx-auto max-w-6xl px-4 py-5">{children}</div>
      </body>
    </html>
  );
}
