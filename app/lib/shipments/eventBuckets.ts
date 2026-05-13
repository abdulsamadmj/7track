/**
 * Maps latest FulfillmentEvent.status (and tracking presence) to 7track-style buckets.
 * Tab counts and tab filtering apply to data already loaded in the client (see UX copy on page).
 */

import type { ShipmentsListQuery } from "../../types/admin.generated";

export type ShipmentListEdge = ShipmentsListQuery["fulfillmentOrders"]["edges"][number];

/** First tab is always "All"; remaining ids are bucket keys. */
export const ALL_BUCKET = "all";

export const BUCKET_ORDER = [
  ALL_BUCKET,
  "pending",
  "not_found",
  "info_received",
  "in_transit",
  "pickup",
  "out_for_delivery",
  "undelivered",
  "delivered",
  "alert",
] as const;

export type ShipmentBucketId = (typeof BUCKET_ORDER)[number];

const BUCKET_LABEL: Record<Exclude<ShipmentBucketId, typeof ALL_BUCKET>, string> = {
  pending: "Pending",
  not_found: "Not found",
  info_received: "Info received",
  in_transit: "In transit",
  pickup: "Pick up",
  out_for_delivery: "Out for delivery",
  undelivered: "Undelivered",
  delivered: "Delivered",
  alert: "Alert",
};

export function bucketLabel(id: ShipmentBucketId): string {
  if (id === ALL_BUCKET) return "All";
  return BUCKET_LABEL[id];
}

function latestEventStatus(edge: ShipmentListEdge): string | null {
  const ev = edge.node.fulfillments.edges[0]?.node.events.edges[0]?.node;
  return ev?.status ?? null;
}

function hasTrackingNumber(edge: ShipmentListEdge): boolean {
  const n = edge.node.fulfillments.edges[0]?.node.trackingInfo[0]?.number;
  return Boolean(n && n.trim().length > 0);
}

/**
 * Assign each row to a single bucket for tabs / badges.
 */
export function bucketForEdge(edge: ShipmentListEdge): Exclude<ShipmentBucketId, typeof ALL_BUCKET> {
  const status = latestEventStatus(edge);
  const tracking = hasTrackingNumber(edge);

  if (!tracking) {
    return "not_found";
  }

  if (!status) {
    return "pending";
  }

  switch (status) {
    case "CONFIRMED":
      return "info_received";
    case "LABEL_PRINTED":
    case "LABEL_PURCHASED":
      return "pending";
    case "IN_TRANSIT":
      return "in_transit";
    case "CARRIER_PICKED_UP":
    case "READY_FOR_PICKUP":
      return "pickup";
    case "OUT_FOR_DELIVERY":
      return "out_for_delivery";
    case "DELIVERED":
      return "delivered";
    case "ATTEMPTED_DELIVERY":
    case "DELAYED":
      return "undelivered";
    case "FAILURE":
      return "alert";
    default:
      return "pending";
  }
}

export function countBuckets(rows: ShipmentListEdge[]): Record<ShipmentBucketId, number> {
  const counts: Record<ShipmentBucketId, number> = {
    all: rows.length,
    pending: 0,
    not_found: 0,
    info_received: 0,
    in_transit: 0,
    pickup: 0,
    out_for_delivery: 0,
    undelivered: 0,
    delivered: 0,
    alert: 0,
  };
  for (const edge of rows) {
    const b = bucketForEdge(edge);
    counts[b]++;
  }
  return counts;
}

export function filterRowsByTab(rows: ShipmentListEdge[], tabBucket: ShipmentBucketId): ShipmentListEdge[] {
  if (tabBucket === ALL_BUCKET) return rows;
  return rows.filter((e) => bucketForEdge(e) === tabBucket);
}
