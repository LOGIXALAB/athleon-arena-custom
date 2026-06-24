import Navbar from "@/components/landing/Navbar";
import CursorSpotlight from "@/components/landing/CursorSpotlight";
import Hero from "@/components/landing/Hero";
import ConceptStrip from "@/components/landing/ConceptStrip";
import BallTrajectory from "@/components/landing/BallTrajectory";
import Arenas from "@/components/landing/Arenas";
import TechExperience from "@/components/landing/TechExperience";
import LiveScoreboard from "@/components/landing/LiveScoreboard";
import Lounge from "@/components/landing/Lounge";
import StatsBand from "@/components/landing/StatsBand";
import Gallery from "@/components/landing/Gallery";
import Memberships from "@/components/landing/Memberships";
import BookingCTA from "@/components/landing/BookingCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <CursorSpotlight />
      <Navbar />
      <main>
        <Hero />
        <ConceptStrip />
        <BallTrajectory />
        <Arenas />
        <TechExperience />
        <LiveScoreboard />
        <Lounge />
        <StatsBand />
        <Gallery />
        <Memberships />
        <BookingCTA />
      </main>
      <Footer />
    </>
  );
}
