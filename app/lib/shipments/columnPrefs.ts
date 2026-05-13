import type { IndexTableProps } from "@shopify/polaris";

export type ShipmentColumnId =
  | "tracking"
  | "order"
  | "status"
  | "requestStatus"
  | "destination"
  | "latestEvent"
  | "updated"
  | "tags"
  | "carrier";

export type ShipmentColumnDef = {
  id: ShipmentColumnId;
  title: string;
  /** If true, cannot be hidden in edit-columns UI. */
  locked?: boolean;
};

export const SHIPMENT_COLUMN_DEFS: ShipmentColumnDef[] = [
  { id: "tracking", title: "Tracking no.", locked: true },
  { id: "order", title: "Order info" },
  { id: "status", title: "Status" },
  { id: "requestStatus", title: "Sub-status" },
  { id: "destination", title: "Destination" },
  { id: "latestEvent", title: "Latest event" },
  { id: "updated", title: "Updated" },
  { id: "tags", title: "Order tags" },
  { id: "carrier", title: "Carrier" },
];

const STORAGE_KEY = "7track:shipments:visibleColumns:v1";

export type ColumnVisibility = Record<ShipmentColumnId, boolean>;

export function defaultColumnVisibility(): ColumnVisibility {
  const v = {} as ColumnVisibility;
  for (const c of SHIPMENT_COLUMN_DEFS) {
    v[c.id] = true;
  }
  return v;
}

export function loadColumnVisibility(): ColumnVisibility {
  if (typeof window === "undefined") return defaultColumnVisibility();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultColumnVisibility();
    const parsed = JSON.parse(raw) as Partial<ColumnVisibility>;
    const base = defaultColumnVisibility();
    for (const c of SHIPMENT_COLUMN_DEFS) {
      if (c.locked) {
        base[c.id] = true;
      } else {
        const v = parsed[c.id];
        base[c.id] = typeof v === "boolean" ? v : true;
      }
    }
    return base;
  } catch {
    return defaultColumnVisibility();
  }
}

export function saveColumnVisibility(visibility: ColumnVisibility): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    /* ignore */
  }
}

export function buildHeadings(visibility: ColumnVisibility): NonNullable<IndexTableProps["headings"]> {
  const h = SHIPMENT_COLUMN_DEFS.filter((c) => visibility[c.id]).map((c) => ({ title: c.title, id: c.id }));
  if (h.length === 0) {
    return [{ title: "Tracking no.", id: "tracking" }];
  }
  return h as NonNullable<IndexTableProps["headings"]>;
}
