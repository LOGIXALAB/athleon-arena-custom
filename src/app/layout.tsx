import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

// Body / UI typeface
const inter = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
});

// Condensed display typeface for scores and big numerals
const oswald = Oswald({
  variable: "--font-condensed-stack",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Athleon Arena — Cricket & Futsal",
  description:
    "Book your slot, manage your team, and follow the live score at Athleon Arena.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
