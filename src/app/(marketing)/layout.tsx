import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getActiveSports, getVenue } from "@/lib/db/queries/public";
import { feature } from "@/lib/config/features";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [sports, venue, showMemberships] = await Promise.all([
    getActiveSports(),
    getVenue(),
    feature("memberships"),
  ]);
  return (
    <>
      <Nav sports={sports} showMemberships={showMemberships} />
      <div className="flex-1">{children}</div>
      <Footer venue={venue} />
    </>
  );
}
