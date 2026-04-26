import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoursesIQ",
  description: "Get an SMS the moment a seat opens in your MSU course — before anyone else knows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="bg-maroon text-white px-4 py-3 flex items-center justify-between">
          <a href="/" className="font-semibold text-lg tracking-tight">CoursesIQ</a>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:underline">Home</a>
            <a href="/dashboard" className="hover:underline">Dashboard</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
