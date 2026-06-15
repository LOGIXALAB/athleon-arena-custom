/**
 * Hand-authored row types mirroring supabase/migrations/0001_init.sql.
 * These give the app practical type-safety before (and alongside) the
 * generated types.gen.ts. Keep in sync with the migration.
 */

export type BookingStatus =
  | "pending_payment"
  | "pending_verification"
  | "reserved"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show";

export type BookingSource = "online" | "walk_in" | "ops";
export type PaymentMethod = "online" | "bank_transfer" | "cash_on_arrival";
export type StaffRole = "scorer" | "ops_manager" | "owner" | "admin";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface VenueSettings {
  bank?: {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
  };
  whatsappNumber?: string; // E.164, e.g. +923001234567
  phone?: string;
  socials?: { instagram?: string; facebook?: string; tiktok?: string };
  mapEmbedUrl?: string;
  cancellation?: { windowHours?: number; feePct?: number };
}

export interface RosterSchema {
  roles: string[];
  maxPlayers: number;
  teamCount: number;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  settings: VenueSettings;
  is_active: boolean;
  created_at: string;
}

export interface Sport {
  id: string;
  name: string;
  module_key: string;
  roster_schema: RosterSchema;
  display_order: number;
  is_active: boolean;
}

export interface Court {
  id: string;
  venue_id: string;
  name: string;
  surface: string | null;
  is_active: boolean;
}

export interface CourtSport {
  court_id: string;
  sport_id: string;
  changeover_minutes: number;
}

export interface CourtSchedule {
  id: string;
  court_id: string;
  day_of_week: number; // 0=Sun
  opens: string; // 'HH:MM:SS'
  closes: string;
  slot_minutes: number;
}

export interface CourtBlock {
  id: string;
  court_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface PricingRule {
  id: string;
  venue_id: string | null;
  court_id: string | null;
  sport_id: string | null;
  days_of_week: number[] | null;
  time_from: string | null;
  time_to: string | null;
  price_per_slot: number;
  currency: string;
  label: string | null;
  priority: number;
  is_active: boolean;
}

export interface MembershipPlan {
  id: string;
  name: string;
  monthly_price: number;
  discount_pct: number;
  free_practice_hours: number;
  priority_booking_days: number;
  perks: string[];
  display_order: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  phone: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  customer_id: string;
  plan_id: string;
  starts_on: string;
  ends_on: string;
  status: string;
}

export interface Booking {
  id: string;
  venue_id: string;
  court_id: string;
  sport_id: string;
  customer_id: string | null;
  match_type: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  source: BookingSource;
  payment_method: PaymentMethod;
  hold_expires_at: string | null;
  arrived_at: string | null;
  arrival_marked_by: string | null;
  amount_due: number;
  currency: string;
  notes: string | null;
  management_token: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  provider: string;
  provider_ref: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface PaymentProof {
  id: string;
  booking_id: string;
  storage_path: string;
  note: string | null;
  uploaded_at: string;
}

export interface Team {
  id: string;
  booking_id: string;
  side: "A" | "B";
  name: string | null;
  captain_name: string | null;
  contact_phone: string | null;
  logo_url: string | null;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  jersey_no: number | null;
  role: string | null;
  photo_url: string | null;
  sort_order: number;
}

export interface Match {
  id: string;
  booking_id: string;
  sport_id: string;
  format: Json;
  status: "scheduled" | "live" | "completed" | "abandoned";
  result: Json | null;
  created_at: string;
}

export interface MatchEvent {
  id: number;
  match_id: string;
  seq: number;
  type: string;
  payload: Json;
  recorded_by: string | null;
  recorded_via: "staff" | "manage_token" | "system";
  reverted_by_seq: number | null;
  created_at: string;
}

export interface CourtDisplayState {
  court_id: string;
  mode: "headline" | "scorecard";
  match_id: string | null;
  updated_at: string;
}

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  venue_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  config: Json;
}

export interface AuditLogRow {
  id: number;
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Json | null;
  created_at: string;
}
