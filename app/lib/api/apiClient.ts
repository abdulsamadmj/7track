import type { ShipmentsListQuery } from "../../types/admin.generated";

const apiPaths = {
  shipments: "/api/shipments",
} as const;

type ApiErrorBody = {
  error?: string;
};

export type ShipmentsListPageParams = {
  first: number;
  after: string | null;
  query: string;
  archived: boolean;
  sortKey: string;
  reverse: boolean;
  /** Sent as repeated `foStatus` query params (Shopify FO status). */
  fulfillmentOrderStatuses: string[];
  /** Sent as repeated `loc` query params (Location GID). */
  assignedLocationIds: string[];
};

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  const json = (await res.json()) as T & ApiErrorBody;
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "error" in json && typeof json.error === "string"
        ? json.error
        : (res.statusText || "Request failed"),
    );
  }
  return json as T;
}

export function createApiClient() {
  return {
    shipments: {
      async listPage(params: ShipmentsListPageParams): Promise<ShipmentsListQuery> {
        const sp = new URLSearchParams();
        sp.set("first", String(params.first));
        if (params.after) sp.set("after", params.after);
        if (params.query.trim()) sp.set("query", params.query.trim());
        if (params.archived) sp.set("archived", "1");
        if (params.reverse) sp.set("reverse", "1");
        sp.set("sortKey", params.sortKey);
        for (const s of params.fulfillmentOrderStatuses) {
          if (s.trim()) sp.append("foStatus", s.trim());
        }
        for (const id of params.assignedLocationIds) {
          if (id.trim()) sp.append("loc", id.trim());
        }

        const url = `${apiPaths.shipments}?${sp.toString()}`;
        return requestJson<ShipmentsListQuery>(url);
      },
    },
  };
}
