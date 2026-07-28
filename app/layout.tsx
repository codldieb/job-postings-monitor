import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
