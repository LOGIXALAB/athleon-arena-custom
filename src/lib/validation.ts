import { z } from "zod";

/**
 * Permissive UUID-shape validator. Accepts any hex UUID layout (including the
 * non-RFC-strict fixed IDs used in seed data). These IDs originate from our own
 * database, not untrusted format-sensitive input, so strict version/variant
 * bit checks (zod's .uuid()) aren't needed.
 */
export const zUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID");
