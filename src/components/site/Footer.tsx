import Link from "next/link";
import type { Venue } from "@/lib/db/tables";
import { waLink } from "@/lib/core/notify/providers/wa-click-to-send";

export function Footer({ venue }: { venue: Venue }) {
  const wa = venue.settings.whatsappNumber;
  return (
    <footer id="contact" className="mt-24 border-t border-border bg-surface-1">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3">
        <div>
          <div className="numeral text-2xl font-semibold">ATHLEON ARENA</div>
          <p className="mt-3 max-w-xs text-sm text-fg-muted">
            {venue.address ?? "Indoor cricket & futsal under the floodlights."}
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-medium text-fg">Visit</div>
          <ul className="space-y-2 text-fg-muted">
            {venue.settings.phone && <li>Phone: {venue.settings.phone}</li>}
            {venue.address && <li>{venue.address}</li>}
            <li>Open daily · 9:00 AM – 11:00 PM</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-medium text-fg">Get in touch</div>
          <ul className="space-y-2 text-fg-muted">
            {wa && (
              <li>
                <a
                  href={waLink(wa, "Hi Athleon Arena! I'd like to ask about a booking.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volt transition hover:text-volt-dim"
                >
                  Chat on WhatsApp
                </a>
              </li>
            )}
            {venue.settings.socials?.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${venue.settings.socials.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-fg"
                >
                  @{venue.settings.socials.instagram}
                </a>
              </li>
            )}
            <li>
              <Link href="/book/cricket" className="transition hover:text-fg">Book a slot</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-fg-faint">
        © {new Date().getFullYear()} Athleon Arena. Play under the floodlights.
      </div>
    </footer>
  );
}
