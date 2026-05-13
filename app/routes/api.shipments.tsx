import type { LoaderFunctionArgs } from "react-router";

import { FULFILLMENT_ORDERS_LIST_QUERY } from "../queries/shipments/shipmentsList.query.server";
import { authenticate } from "../shopify.server";
import type {
  ShipmentsListQuery,
  ShipmentsListQueryVariables,
} from "../types/admin.generated";
import type * as AdminTypes from "../types/admin.types";
import { composeFulfillmentOrderQuery } from "../lib/shipments/composeFulfillmentOrderQuery";

const MAX_FIRST = 50;
const DEFAULT_FIRST = 20;

const ALLOWED_SORT_KEYS = new Set<string>([
  "CASE_PRIORITY",
  "CREATED_AT",
  "ID",
  "ORDER_NAME",
  "RELEVANCE",
  "UPDATED_AT",
]);

type GraphqlErrorsBody = {
  errors?: { message?: string }[];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const firstRaw = Number(url.searchParams.get("first") ?? DEFAULT_FIRST);
  const first = Math.min(
    Math.max(Number.isFinite(firstRaw) ? Math.floor(firstRaw) : DEFAULT_FIRST, 1),
    MAX_FIRST,
  );
  const after = url.searchParams.get("after");
  const searchQuery = url.searchParams.get("query")?.trim() ?? "";
  const listScope = url.searchParams.get("list") === "archived" ? "archived" : "active";
  const reverse = url.searchParams.get("reverse") === "1";
  const sortKeyParam = url.searchParams.get("sortKey") ?? "ID";
  const sortKeyStr = ALLOWED_SORT_KEYS.has(sortKeyParam) ? sortKeyParam : "ID";

  const foStatusesRaw = url.searchParams.getAll("foStatus").map((s) => s.trim()).filter(Boolean);
  /** Archived list uses a fixed CLOSED filter; ignore status query params there to avoid conflicts. */
  const foStatuses = listScope === "archived" ? [] : foStatusesRaw;
  const locationIds = url.searchParams.getAll("loc").map((s) => s.trim()).filter(Boolean);

  const composedQuery = composeFulfillmentOrderQuery({
    search: searchQuery,
    fulfillmentOrderStatuses: foStatuses,
    assignedLocationIds: locationIds,
    closedFulfillmentOrdersOnly: listScope === "archived",
  });

  const variables: ShipmentsListQueryVariables = {
    first,
    after: after && after.length > 0 ? after : null,
    query: composedQuery,
    sortKey: sortKeyStr as AdminTypes.FulfillmentOrderSortKeys,
    reverse,
    includeClosed: listScope === "archived",
  };

  const response = await admin.graphql(FULFILLMENT_ORDERS_LIST_QUERY, {
    variables,
  });

  const json = (await response.json()) as GraphqlErrorsBody & {
    data?: ShipmentsListQuery;
  };

  if (!response.ok) {
    return Response.json({ error: "GraphQL request failed" }, { status: 502 });
  }

  if (json.errors?.length) {
    const message = json.errors
      .map((e) => e.message ?? "Unknown error")
      .join("; ");
    return Response.json({ error: message }, { status: 502 });
  }

  if (json.data === undefined || json.data === null) {
    return Response.json({ error: "Empty GraphQL response" }, { status: 502 });
  }

  return Response.json(json.data);
}
