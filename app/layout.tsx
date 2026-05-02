import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "./providers";
import { PostHogPageView } from "./PostHogPageView";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "CoursesIQ",
  description: "Get an email the moment a seat opens in your MSU course — before anyone else knows.",
  icons: {
    icon: "/icon.svg",
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
