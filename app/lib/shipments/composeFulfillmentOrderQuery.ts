/**
 * Builds Shopify fulfillmentOrders `query` string fragments that the Admin API indexes.
 * @see https://shopify.dev/docs/api/admin-graphql/latest/queries/fulfillmentOrders
 */

const FO_STATUS = new Set(["OPEN", "IN_PROGRESS", "CANCELLED", "INCOMPLETE", "CLOSED"]);

const LOCATION_GID = /^gid:\/\/shopify\/Location\/\d+$/i;

function assertFoStatus(value: string): string | null {
  const v = value.trim().toUpperCase();
  return FO_STATUS.has(v) ? v : null;
}

function assertLocationGid(value: string): string | null {
  const v = value.trim();
  return LOCATION_GID.test(v) ? v : null;
}

export type ComposeFulfillmentOrderQueryInput = {
  /** Free-text / merchant search (passed through when safe). */
  search: string;
  /** Fulfillment order statuses (OR group). */
  fulfillmentOrderStatuses: string[];
  /** Assigned location GIDs (OR group). */
  assignedLocationIds: string[];
};

/**
 * Merges merchant search with structured AND groups. Returns null when nothing to send.
 */
export function composeFulfillmentOrderQuery(input: ComposeFulfillmentOrderQueryInput): string | null {
  const parts: string[] = [];

  const search = input.search.trim();
  if (search.length > 0) {
    parts.push(search);
  }

  const statuses = input.fulfillmentOrderStatuses.map(assertFoStatus).filter(Boolean) as string[];
  if (statuses.length === 1) {
    parts.push(`status:${statuses[0]}`);
  } else if (statuses.length > 1) {
    parts.push(`(${statuses.map((s) => `status:${s}`).join(" OR ")})`);
  }

  const locs = input.assignedLocationIds.map(assertLocationGid).filter(Boolean) as string[];
  if (locs.length === 1) {
    parts.push(`assigned_location_id:${locs[0]}`);
  } else if (locs.length > 1) {
    parts.push(`(${locs.map((id) => `assigned_location_id:${id}`).join(" OR ")})`);
  }

  if (parts.length === 0) return null;
  return parts.join(" AND ");
}
