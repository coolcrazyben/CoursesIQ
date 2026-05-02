import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "./providers";
import { PostHogPageView } from "./PostHogPageView";
import { Suspense } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://coursesiq.com"),
  title: "CoursesIQ",
  description: "Find class availability, grade distributions, and professor insights at Mississippi State.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: "https://coursesiq.com",
    siteName: "CoursesIQ",
    title: "CoursesIQ",
    description: "Find class availability, grade distributions, and professor insights at Mississippi State.",
    images: [
      {
        url: "https://coursesiq.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "CoursesIQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@CoursesIQ",
    title: "CoursesIQ",
    description: "Find class availability, grade distributions, and professor insights at Mississippi State.",
    images: ["https://coursesiq.com/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="antialiased">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
