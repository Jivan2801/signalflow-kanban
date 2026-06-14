import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevBoard - Real-time Kanban",
  description: "Real-time collaborative Kanban board built with .NET 8 & Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

