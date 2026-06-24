-- Allow more than one match per booking.
-- A short cricket/futsal match can finish well before the slot ends; the team
-- can then start a fresh match while time remains. Previously `matches.booking_id`
-- was UNIQUE (one match per booking) — drop that so a booking can hold several
-- matches. The app treats the most-recently-created match as the active one.

alter table matches drop constraint if exists matches_booking_id_key;

-- Fast "latest match for this booking" lookups.
create index if not exists matches_booking_latest_idx
  on matches (booking_id, created_at desc);
