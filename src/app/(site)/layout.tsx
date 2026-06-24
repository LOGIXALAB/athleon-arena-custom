import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import SmoothScroll from "@/components/landing/SmoothScroll";

// Cinematic landing typefaces (scoped to the marketing site, not the app shell)
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "The Athleon Arena — Where Sports Meet The Future",
  description:
    "A next-generation sports facility for Cricket & Futsal — live LED scoring, smart umpire panels, real-time player stats, and a premium food & lounge experience.",
  openGraph: {
    title: "The Athleon Arena — Where Sports Meet The Future",
    description:
      "Premium Cricket & Futsal arenas fused with digital tech. Live LED scoring, player stats and an executive lounge.",
    type: "website",
  },
};

/**
 * Marketing (cinematic landing) layout. The `theme-site` wrapper re-scopes the
 * brand's navy + lime palette and display fonts so the landing keeps its identity
 * while the rest of the app stays on the floodlit dark + volt theme.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`theme-site ${geistSans.variable} ${geistMono.variable} ${orbitron.variable}`}>
      <SmoothScroll>{children}</SmoothScroll>
    </div>
  );
}
