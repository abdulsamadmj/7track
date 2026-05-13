import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { AppliedFilterInterface, IndexTableProps } from "@shopify/polaris";
import {
  ActionList,
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  ChoiceList,
  Icon,
  IndexTable,
  InlineGrid,
  InlineStack,
  Layout,
  Link,
  Page,
  Popover,
  Spinner,
  Tabs,
  Text,
  TextField,
  Tooltip,
  useIndexResourceState,
} from "@shopify/polaris";
import { FilterIcon, ChevronDownIcon, LayoutColumns3Icon, SearchIcon, SortIcon } from "@shopify/polaris-icons";

import { PolarisAppShell } from "../components/PolarisAppShell";
import { createApiClient } from "../lib/api/apiClient";
import {
  buildHeadings,
  defaultColumnVisibility,
  loadColumnVisibility,
  saveColumnVisibility,
  SHIPMENT_COLUMN_DEFS,
  type ColumnVisibility,
  type ShipmentColumnDef,
  type ShipmentColumnId,
} from "../lib/shipments/columnPrefs";
import {
  ALL_BUCKET,
  BUCKET_ORDER,
  bucketLabel,
  countBuckets,
  filterRowsByTab,
  type ShipmentBucketId,
  type ShipmentListEdge,
} from "../lib/shipments/eventBuckets";

type ShipmentNode = ShipmentListEdge["node"];
type TrackingInfo = ShipmentNode["fulfillments"]["edges"][number]["node"]["trackingInfo"][number];
type LatestEvent = ShipmentNode["fulfillments"]["edges"][number]["node"]["events"]["edges"][number]["node"];

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { label: "Latest update", value: "UPDATED_AT desc", directionLabel: "Newest first" },
  { label: "Latest update", value: "UPDATED_AT asc", directionLabel: "Oldest first" },
  { label: "Order time", value: "CREATED_AT desc", directionLabel: "Newest first" },
  { label: "Order time", value: "CREATED_AT asc", directionLabel: "Oldest first" },
  { label: "Order name", value: "ORDER_NAME asc", directionLabel: "A–Z" },
  { label: "Order name", value: "ORDER_NAME desc", directionLabel: "Z–A" },
] as const;

type PrimaryFilterKey = "foStatus" | "origin" | "destination" | "locations";

function parseSortSelected(selected: string[]): { sortKey: string; reverse: boolean } {
  const raw = selected[0] ?? "UPDATED_AT desc";
  const lastSpace = raw.lastIndexOf(" ");
  const key = lastSpace === -1 ? raw : raw.slice(0, lastSpace);
  const dir = lastSpace === -1 ? "desc" : raw.slice(lastSpace + 1);
  return { sortKey: key, reverse: dir === "desc" };
}

function gidToLegacyResourceId(gid: string): string {
  const segment = gid.split("/").pop();
  return segment ?? gid;
}

function adminOrderUrl(shop: string, orderGid: string | undefined): string | null {
  if (!orderGid) return null;
  const id = gidToLegacyResourceId(orderGid);
  return `https://${shop}/admin/orders/${id}`;
}

function fulfillmentStatusTone(
  status: string | null | undefined,
): "success" | "attention" | "info" | "critical" | "new" | "warning" | "read-only" | undefined {
  switch (status) {
    case "OPEN":
      return "attention";
    case "IN_PROGRESS":
      return "info";
    case "CANCELLED":
      return "critical";
    case "INCOMPLETE":
      return "warning";
    case "CLOSED":
      return "success";
    default:
      return undefined;
  }
}

function uniqueStrings(values: (string | null | undefined)[]): string[] {
  const s = new Set<string>();
  for (const v of values) {
    if (v && v.trim()) s.add(v.trim());
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function FilterSearchChoiceList({
  filterLabel,
  choices,
  selected,
  onChange,
}: {
  filterLabel: string;
  choices: { label: string; value: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return choices;
    return choices.filter((c) => c.label.toLowerCase().includes(needle) || c.value.toLowerCase().includes(needle));
  }, [choices, q]);

  if (choices.length === 0) {
    return (
      <BlockStack gap="300">
        <TextField
          label={`Search ${filterLabel}`}
          value={q}
          onChange={setQ}
          autoComplete="off"
          placeholder="Search"
        />
        <Text as="p" variant="bodySm" tone="subdued">
          No data yet.
        </Text>
      </BlockStack>
    );
  }

  return (
    <BlockStack gap="300">
      <TextField
        label={`Search ${filterLabel}`}
        value={q}
        onChange={setQ}
        autoComplete="off"
        placeholder="Search"
      />
      {filtered.length === 0 ? (
        <Text as="p" variant="bodySm" tone="subdued">
          No matching options.
        </Text>
      ) : (
        <ChoiceList
          title={filterLabel}
          titleHidden
          allowMultiple
          choices={filtered}
          selected={selected}
          onChange={onChange}
        />
      )}
    </BlockStack>
  );
}

function ColumnEditor({
  draft,
  onChange,
}: {
  draft: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
}) {
  return (
    <Box padding="400" background="bg-surface-secondary">
      <BlockStack gap="400">
        <Text as="p" variant="bodySm" tone="subdued">
          Toggle columns to show in the table. Tracking is always visible.
        </Text>
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
          {SHIPMENT_COLUMN_DEFS.map((col: ShipmentColumnDef) => (
            <Box key={col.id} padding="300" background="bg-surface" borderRadius="200" shadow="100">
              <Checkbox
                label={col.title}
                checked={draft[col.id]}
                disabled={Boolean(col.locked)}
                onChange={(checked) => onChange({ ...draft, [col.id]: checked })}
              />
            </Box>
          ))}
        </InlineGrid>
      </BlockStack>
    </Box>
  );
}

export default function ShipmentsPage() {
  const routeData = useRouteLoaderData("routes/app") as { shop?: string; apiKey?: string } | undefined;
  const shop = routeData?.shop ?? "";

  const api = useMemo(() => createApiClient(), []);

  const [tabIndex, setTabIndex] = useState(0);
  const tabBucket: ShipmentBucketId = BUCKET_ORDER[tabIndex] ?? ALL_BUCKET;

  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(queryDraft), 400);
    return () => clearTimeout(id);
  }, [queryDraft]);

  const [sortSelected, setSortSelected] = useState<string[]>(["UPDATED_AT desc"]);
  const { sortKey, reverse } = parseSortSelected(sortSelected);

  const [listScope, setListScope] = useState<"active" | "archived">("active");

  const [filterFoStatuses, setFilterFoStatuses] = useState<string[]>([]);
  const [filterLocationIds, setFilterLocationIds] = useState<string[]>([]);
  const [filterDestinations, setFilterDestinations] = useState<string[]>([]);
  const [filterOriginCountries, setFilterOriginCountries] = useState<string[]>([]);
  const [filterRequestStatuses, setFilterRequestStatuses] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterCarriers, setFilterCarriers] = useState<string[]>([]);

  type ToolbarMode = "default" | "editing-columns";
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>("default");
  const prevToolbarMode = useRef<ToolbarMode>("default");

  const [primaryFilterOpen, setPrimaryFilterOpen] = useState<PrimaryFilterKey | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => defaultColumnVisibility());
  const [draftColumnVisibility, setDraftColumnVisibility] = useState<ColumnVisibility>(() => defaultColumnVisibility());

  useEffect(() => {
    setColumnVisibility(loadColumnVisibility());
  }, []);

  useEffect(() => {
    if (toolbarMode === "editing-columns" && prevToolbarMode.current !== "editing-columns") {
      setDraftColumnVisibility({ ...columnVisibility });
    }
    prevToolbarMode.current = toolbarMode;
  }, [toolbarMode, columnVisibility]);

  const columnsDirty = useMemo(
    () => JSON.stringify(draftColumnVisibility) !== JSON.stringify(columnVisibility),
    [draftColumnVisibility, columnVisibility],
  );

  const infinite = useInfiniteQuery({
    queryKey: [
      "shipments",
      {
        query,
        listScope,
        sortKey,
        reverse,
        foStatuses: filterFoStatuses,
        locationIds: filterLocationIds,
      },
    ],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.shipments.listPage({
        first: PAGE_SIZE,
        after: pageParam,
        query,
        listScope,
        sortKey,
        reverse,
        fulfillmentOrderStatuses: filterFoStatuses,
        assignedLocationIds: filterLocationIds,
      }),
    getNextPageParam: (last) => {
      const pi = last.fulfillmentOrders.pageInfo;
      return pi.hasNextPage && pi.endCursor ? pi.endCursor : undefined;
    },
  });

  const flatRows = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.fulfillmentOrders.edges) ?? [],
    [infinite.data],
  );

  const bucketCounts = useMemo(() => countBuckets(flatRows), [flatRows]);

  const facetChoices = useMemo(() => {
    const foStatus = uniqueStrings(flatRows.map((e) => e.node.status));
    const req = uniqueStrings(flatRows.map((e) => e.node.requestStatus));
    const countries = uniqueStrings(flatRows.map((e) => e.node.destination?.countryCode));
    const originCountries = uniqueStrings(
      flatRows.map((e) => e.node.assignedLocation?.location?.address?.countryCode),
    );
    const locs = flatRows
      .map((e) => {
        const loc = e.node.assignedLocation.location;
        if (!loc?.id) return null;
        return { id: loc.id, name: loc.name ?? loc.id };
      })
      .filter(Boolean) as { id: string; name: string }[];
    const locMap = new Map<string, string>();
    for (const l of locs) locMap.set(l.id, l.name);
    const locations = [...locMap.entries()]
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const tagSet = new Set<string>();
    for (const e of flatRows) {
      const tags = e.node.order.tags ?? [];
      for (const t of tags) {
        if (t.trim()) tagSet.add(t.trim());
      }
    }
    const tags = [...tagSet].sort((a, b) => a.localeCompare(b)).map((t) => ({ value: t, label: t }));
    return { foStatus, requestStatus: req, countries, originCountries, locations, tags };
  }, [flatRows]);

  const tabFiltered = useMemo(() => filterRowsByTab(flatRows, tabBucket), [flatRows, tabBucket]);

  const displayRows = useMemo(() => {
    return tabFiltered.filter((edge) => {
      const n = edge.node;
      if (filterDestinations.length > 0) {
        const cc = n.destination?.countryCode;
        if (!cc || !filterDestinations.includes(cc)) return false;
      }
      if (filterOriginCountries.length > 0) {
        const oc = n.assignedLocation?.location?.address?.countryCode;
        if (!oc || !filterOriginCountries.includes(oc)) return false;
      }
      if (filterRequestStatuses.length > 0) {
        const rs = n.requestStatus ?? "";
        if (!filterRequestStatuses.includes(rs)) return false;
      }
      if (filterTags.length > 0) {
        const tags = n.order.tags ?? [];
        const hit = filterTags.some((t) => tags.includes(t));
        if (!hit) return false;
      }
      if (filterCarriers.length > 0) {
        const company = n.fulfillments.edges[0]?.node.trackingInfo[0]?.company?.trim() ?? "";
        if (!company || !filterCarriers.includes(company)) return false;
      }
      return true;
    });
  }, [tabFiltered, filterDestinations, filterOriginCountries, filterRequestStatuses, filterTags, filterCarriers]);

  const resourceList = useMemo(() => displayRows.map((edge) => ({ id: edge.node.id })), [displayRows]);

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(resourceList);

  useEffect(() => {
    clearSelection();
  }, [
    tabBucket,
    query,
    listScope,
    sortKey,
    reverse,
    filterFoStatuses,
    filterLocationIds,
    filterDestinations,
    filterOriginCountries,
    filterRequestStatuses,
    filterTags,
    filterCarriers,
    clearSelection,
  ]);

  const handleClearAllFilters = useCallback(() => {
    setQueryDraft("");
    setQuery("");
    setFilterFoStatuses([]);
    setFilterLocationIds([]);
    setFilterDestinations([]);
    setFilterOriginCountries([]);
    setFilterRequestStatuses([]);
    setFilterTags([]);
    setFilterCarriers([]);
    setListScope("active");
    setTabIndex(0);
  }, []);

  const appliedFilters: AppliedFilterInterface[] = useMemo(() => {
    const out: AppliedFilterInterface[] = [];
    if (filterFoStatuses.length > 0) {
      out.push({
        key: "foStatus",
        label: `Status: ${filterFoStatuses.join(", ")}`,
        onRemove: () => setFilterFoStatuses([]),
      });
    }
    if (filterLocationIds.length > 0) {
      out.push({
        key: "loc",
        label: `Locations: ${filterLocationIds.length}`,
        onRemove: () => setFilterLocationIds([]),
      });
    }
    if (filterDestinations.length > 0) {
      out.push({
        key: "dest",
        label: `Destination: ${filterDestinations.map(countryLabel).join(", ")}`,
        onRemove: () => setFilterDestinations([]),
      });
    }
    if (filterOriginCountries.length > 0) {
      out.push({
        key: "origin",
        label: `Origin: ${filterOriginCountries.map(countryLabel).join(", ")}`,
        onRemove: () => setFilterOriginCountries([]),
      });
    }
    if (filterRequestStatuses.length > 0) {
      out.push({
        key: "req",
        label: `Sub-status: ${filterRequestStatuses.join(", ")}`,
        onRemove: () => setFilterRequestStatuses([]),
      });
    }
    if (filterTags.length > 0) {
      out.push({
        key: "tags",
        label: `Tags: ${filterTags.join(", ")}`,
        onRemove: () => setFilterTags([]),
      });
    }
    if (filterCarriers.length > 0) {
      out.push({
        key: "carrier",
        label: `Carrier: ${filterCarriers.join(", ")}`,
        onRemove: () => setFilterCarriers([]),
      });
    }
    return out;
  }, [
    filterFoStatuses,
    filterLocationIds,
    filterDestinations,
    filterOriginCountries,
    filterRequestStatuses,
    filterTags,
    filterCarriers,
  ]);

  const carrierChoices = useMemo(
    () =>
      uniqueStrings(flatRows.map((e) => e.node.fulfillments.edges[0]?.node.trackingInfo[0]?.company)).map((c) => ({
        label: c,
        value: c,
      })),
    [flatRows],
  );

  const sortChoiceListChoices = useMemo(
    () =>
      [...SORT_OPTIONS].map((o) => ({
        value: o.value,
        label: `${o.label} (${o.directionLabel})`,
      })),
    [],
  );

  const tabsForIndex = useMemo(
    () =>
      BUCKET_ORDER.map((id, index) => ({
        id: `tab-${index}`,
        content: bucketLabel(id),
        badge: String(bucketCounts[id] ?? 0),
      })),
    [bucketCounts],
  );

  const headings = useMemo(() => buildHeadings(columnVisibility), [columnVisibility]);

  const listLoading = infinite.isPending && !infinite.isFetchingNextPage;

  const pageTitleLabel = listScope === "archived" ? "Archived shipments" : "Shipments";

  return (
    <PolarisAppShell>
      <Page
        title=""
        pageReadyAccessibilityLabel={pageTitleLabel}
        subtitle="Fulfillment orders from your shop"
        titleMetadata={
          <Popover
            active={scopeMenuOpen}
            preferredPosition="below"
            autofocusTarget="first-node"
            onClose={() => setScopeMenuOpen(false)}
            activator={
              <button
                type="button"
                aria-expanded={scopeMenuOpen}
                aria-haspopup="true"
                onClick={() => setScopeMenuOpen((o) => !o)}
                style={{
                  border: "none",
                  margin: 0,
                  padding: 0,
                  background: "none",
                  cursor: "pointer",
                  color: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--p-space-100)",
                }}
              >
                <Text as="span" variant="headingLg" fontWeight="bold">
                  {pageTitleLabel}
                </Text>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    transform: scopeMenuOpen ? "rotate(180deg)" : "none",
                    transition: "transform var(--p-motion-duration-100) var(--p-motion-ease)",
                  }}
                >
                  <Icon source={ChevronDownIcon} tone="base" />
                </span>
              </button>
            }
          >
            <ActionList
              sections={[
                {
                  items: [
                    {
                      content: "Shipments",
                      active: listScope === "active",
                      onAction: () => {
                        setListScope("active");
                        setFilterFoStatuses([]);
                        setScopeMenuOpen(false);
                      },
                    },
                    {
                      content: "Archived shipments",
                      active: listScope === "archived",
                      onAction: () => {
                        setListScope("archived");
                        setFilterFoStatuses([]);
                        setScopeMenuOpen(false);
                      },
                    },
                  ],
                },
              ]}
            />
          </Popover>
        }
      >
        <Layout>
          <Layout.Section>
            <Box>
              <Card padding="0">
                <Box
                  paddingBlockStart="300"
                  paddingBlockEnd="300"
                  paddingInlineStart="400"
                  paddingInlineEnd="400"
                  borderBlockEndWidth="025"
                  borderColor="border-secondary"
                >
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center" gap="300" wrap={false}>
                      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <Tabs
                          tabs={tabsForIndex}
                          selected={tabIndex}
                          onSelect={setTabIndex}
                          fitted
                          canCreateNewView={false}
                        />
                      </div>
                    </InlineStack>

                    <InlineStack align="start" blockAlign="center" gap="300" wrap>
                      <div style={{ flex: "1 1 280px", minWidth: 200, maxWidth: 560 }}>
                        <TextField
                          label="Search shipments"
                          labelHidden
                          placeholder="Order, tracking number or email"
                          value={queryDraft}
                          onChange={setQueryDraft}
                          autoComplete="off"
                          clearButton
                          onClearButtonClick={() => {
                            setQueryDraft("");
                            setQuery("");
                          }}
                          prefix={<Icon source={SearchIcon} tone="base" />}
                        />
                      </div>
                      <InlineStack gap="200" wrap blockAlign="center">
                        <Popover
                          active={primaryFilterOpen === "foStatus"}
                          activator={
                            <Button
                              size="slim"
                              disclosure={primaryFilterOpen === "foStatus" ? "up" : "down"}
                              onClick={() => {
                                setPrimaryFilterOpen((p) => (p === "foStatus" ? null : "foStatus"));
                                setMoreFiltersOpen(false);
                                setSortOpen(false);
                                setScopeMenuOpen(false);
                              }}
                            >
                              {filterFoStatuses.length ? `Status (${filterFoStatuses.length})` : "Status"}
                            </Button>
                          }
                          preferredAlignment="left"
                          autofocusTarget="first-node"
                          onClose={() => setPrimaryFilterOpen(null)}
                        >
                          <Box padding="400" maxWidth="320px">
                            <FilterSearchChoiceList
                              filterLabel="Status"
                              choices={facetChoices.foStatus.map((s) => ({ label: s, value: s }))}
                              selected={filterFoStatuses}
                              onChange={setFilterFoStatuses}
                            />
                          </Box>
                        </Popover>

                        <Popover
                          active={primaryFilterOpen === "origin"}
                          activator={
                            <Button
                              size="slim"
                              disclosure={primaryFilterOpen === "origin" ? "up" : "down"}
                              onClick={() => {
                                setPrimaryFilterOpen((p) => (p === "origin" ? null : "origin"));
                                setMoreFiltersOpen(false);
                                setSortOpen(false);
                                setScopeMenuOpen(false);
                              }}
                            >
                              {filterOriginCountries.length
                                ? `Origin (${filterOriginCountries.length})`
                                : "Origin"}
                            </Button>
                          }
                          preferredAlignment="left"
                          autofocusTarget="first-node"
                          onClose={() => setPrimaryFilterOpen(null)}
                        >
                          <Box padding="400" maxWidth="320px">
                            <FilterSearchChoiceList
                              filterLabel="Origin"
                              choices={facetChoices.originCountries.map((c) => ({
                                value: c,
                                label: `${countryLabel(c)} (${c})`,
                              }))}
                              selected={filterOriginCountries}
                              onChange={setFilterOriginCountries}
                            />
                          </Box>
                        </Popover>

                        <Popover
                          active={primaryFilterOpen === "destination"}
                          activator={
                            <Button
                              size="slim"
                              disclosure={primaryFilterOpen === "destination" ? "up" : "down"}
                              onClick={() => {
                                setPrimaryFilterOpen((p) => (p === "destination" ? null : "destination"));
                                setMoreFiltersOpen(false);
                                setSortOpen(false);
                                setScopeMenuOpen(false);
                              }}
                            >
                              {filterDestinations.length
                                ? `Destination (${filterDestinations.length})`
                                : "Destination"}
                            </Button>
                          }
                          preferredAlignment="left"
                          autofocusTarget="first-node"
                          onClose={() => setPrimaryFilterOpen(null)}
                        >
                          <Box padding="400" maxWidth="320px">
                            <FilterSearchChoiceList
                              filterLabel="Destination"
                              choices={facetChoices.countries.map((c) => ({
                                value: c,
                                label: `${countryLabel(c)} (${c})`,
                              }))}
                              selected={filterDestinations}
                              onChange={setFilterDestinations}
                            />
                          </Box>
                        </Popover>

                        <Popover
                          active={primaryFilterOpen === "locations"}
                          activator={
                            <Button
                              size="slim"
                              disclosure={primaryFilterOpen === "locations" ? "up" : "down"}
                              onClick={() => {
                                setPrimaryFilterOpen((p) => (p === "locations" ? null : "locations"));
                                setMoreFiltersOpen(false);
                                setSortOpen(false);
                                setScopeMenuOpen(false);
                              }}
                            >
                              {filterLocationIds.length
                                ? `Locations (${filterLocationIds.length})`
                                : "Locations"}
                            </Button>
                          }
                          preferredAlignment="left"
                          autofocusTarget="first-node"
                          onClose={() => setPrimaryFilterOpen(null)}
                        >
                          <Box padding="400" maxWidth="320px">
                            <FilterSearchChoiceList
                              filterLabel="Locations"
                              choices={facetChoices.locations}
                              selected={filterLocationIds}
                              onChange={setFilterLocationIds}
                            />
                          </Box>
                        </Popover>

                        <Popover
                          active={moreFiltersOpen}
                          activator={
                            <Button
                              size="slim"
                              icon={FilterIcon}
                              onClick={() => {
                                setMoreFiltersOpen((o) => !o);
                                setPrimaryFilterOpen(null);
                                setSortOpen(false);
                                setScopeMenuOpen(false);
                              }}
                            />
                          }
                          preferredAlignment="left"
                          autofocusTarget="first-node"
                          onClose={() => setMoreFiltersOpen(false)}
                        >
                          <div style={{ maxHeight: "480px", overflowY: "auto", maxWidth: 380 }}>
                            <Box padding="400">
                              <BlockStack gap="400">
                                <Text as="h3" variant="headingSm">
                                  Sub-status
                                </Text>
                                <FilterSearchChoiceList
                                  filterLabel="Sub-status"
                                  choices={facetChoices.requestStatus.map((s) => ({
                                    label: s.length > 0 ? s : "(empty)",
                                    value: s.length > 0 ? s : "__EMPTY__",
                                  }))}
                                  selected={filterRequestStatuses.map((s) => (s === "" ? "__EMPTY__" : s))}
                                  onChange={(next) =>
                                    setFilterRequestStatuses(next.map((v) => (v === "__EMPTY__" ? "" : v)))
                                  }
                                />
                                <Text as="h3" variant="headingSm">
                                  Shopify order tags
                                </Text>
                                <FilterSearchChoiceList
                                  filterLabel="Tags"
                                  choices={facetChoices.tags}
                                  selected={filterTags}
                                  onChange={setFilterTags}
                                />
                                <Text as="h3" variant="headingSm">
                                  Carrier
                                </Text>
                                <FilterSearchChoiceList
                                  filterLabel="Carrier"
                                  choices={carrierChoices}
                                  selected={filterCarriers}
                                  onChange={setFilterCarriers}
                                />
                              </BlockStack>
                            </Box>
                          </div>
                        </Popover>

                        <Popover
                          active={sortOpen}
                          activator={
                            <Button
                              size="slim"
                              icon={SortIcon}
                              accessibilityLabel="Sort"
                              onClick={() => {
                                setSortOpen((o) => !o);
                                setPrimaryFilterOpen(null);
                                setMoreFiltersOpen(false);
                                setScopeMenuOpen(false);
                              }}
                            />
                          }
                          preferredAlignment="right"
                          autofocusTarget="first-node"
                          onClose={() => setSortOpen(false)}
                        >
                          <Box padding="400" minWidth="240px">
                            <ChoiceList
                              title="Sort by"
                              choices={sortChoiceListChoices}
                              selected={sortSelected}
                              onChange={setSortSelected}
                            />
                          </Box>
                        </Popover>

                        <Tooltip content="Edit columns" hoverDelay={400}>
                          <Button
                            size="slim"
                            icon={LayoutColumns3Icon}
                            accessibilityLabel="Edit columns"
                            onClick={() => {
                              setToolbarMode("editing-columns");
                              setPrimaryFilterOpen(null);
                              setMoreFiltersOpen(false);
                              setSortOpen(false);
                              setScopeMenuOpen(false);
                            }}
                          />
                        </Tooltip>

                        {listLoading ? <Spinner size="small" accessibilityLabel="Loading" /> : null}
                      </InlineStack>
                    </InlineStack>

                    {appliedFilters.length > 0 ? (
                      <InlineStack gap="200" align="start" blockAlign="center" wrap>
                        {appliedFilters.map((f) => (
                          <Button key={f.key} size="micro" variant="tertiary" onClick={() => f.onRemove(f.key)}>
                            {f.label}
                          </Button>
                        ))}
                      </InlineStack>
                    ) : null}

                    {toolbarMode === "editing-columns" ? (
                      <InlineStack gap="200" align="end" blockAlign="center">
                        <Button
                          onClick={() => {
                            setDraftColumnVisibility({ ...columnVisibility });
                            setToolbarMode("default");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          disabled={!columnsDirty}
                          onClick={() => {
                            saveColumnVisibility(draftColumnVisibility);
                            setColumnVisibility({ ...draftColumnVisibility });
                            setToolbarMode("default");
                          }}
                        >
                          Save
                        </Button>
                      </InlineStack>
                    ) : null}
                  </BlockStack>
                </Box>

                {toolbarMode === "editing-columns" ? (
                  <ColumnEditor draft={draftColumnVisibility} onChange={setDraftColumnVisibility} />
                ) : null}
                <Box padding="400">
                  <BlockStack gap="400">
                    {infinite.isError ? (
                      <Text as="p" variant="bodyMd" tone="critical">
                        {infinite.error instanceof Error ? infinite.error.message : "Something went wrong"}
                      </Text>
                    ) : (
                      <>
                        <ShipmentsTable
                          rows={displayRows}
                          shop={shop}
                          headings={headings}
                          columnVisibility={columnVisibility}
                          loading={infinite.isPending && !infinite.isFetchingNextPage}
                          selectedResources={selectedResources}
                          allResourcesSelected={allResourcesSelected}
                          onSelectionChange={handleSelectionChange}
                        />
                        {infinite.hasNextPage ? (
                          <InlineStack align="center">
                            <Button
                              onClick={() => void infinite.fetchNextPage()}
                              loading={infinite.isFetchingNextPage}
                              disabled={infinite.isFetchingNextPage}
                            >
                              Load more
                            </Button>
                          </InlineStack>
                        ) : null}
                      </>
                    )}
                  </BlockStack>
                </Box>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppShell>
  );
}

function ShipmentsTable({
  rows,
  shop,
  headings,
  columnVisibility,
  loading,
  selectedResources,
  allResourcesSelected,
  onSelectionChange,
}: {
  rows: ShipmentListEdge[];
  shop: string;
  headings: NonNullable<IndexTableProps["headings"]>;
  columnVisibility: ColumnVisibility;
  loading: boolean;
  selectedResources: string[];
  allResourcesSelected: boolean;
  onSelectionChange: NonNullable<IndexTableProps["onSelectionChange"]>;
}) {
  const empty = rows.length === 0;
  const itemCount = empty ? 1 : rows.length;

  return (
    <IndexTable
      resourceName={{ singular: "shipment", plural: "shipments" }}
      itemCount={itemCount}
      loading={loading}
      selectable={!empty}
      selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
      onSelectionChange={onSelectionChange}
      headings={headings}
    >
      {empty ? (
        <IndexTable.Row id="shipments-table-empty" position={0} selected={false}>
          <IndexTable.Cell colSpan={Math.max(headings.length, 1)}>
            <Text as="p" variant="bodyMd" tone="subdued">
              {loading ? "Loading shipments…" : "No shipments match the current filters."}
            </Text>
          </IndexTable.Cell>
        </IndexTable.Row>
      ) : null}
      {!empty
        ? rows.map((edge, index) => {
          const item = edge.node;
          const ff = item.fulfillments.edges[0]?.node;
          const ti = ff?.trackingInfo[0];
          const ev = ff?.events.edges[0]?.node;
          const dest = [item.destination?.city, item.destination?.province, item.destination?.countryCode]
            .filter(Boolean)
            .join(", ");
          const orderUrl = adminOrderUrl(shop, item.order?.id);
          const tags = (item.order.tags ?? []).join(", ") || "—";
          const carrier = ti?.company?.trim() || "—";

          return (
            <IndexTable.Row
              id={item.id}
              key={`${item.id}-${index}`}
              position={index}
              selected={selectedResources.includes(item.id)}
            >
              {SHIPMENT_COLUMN_DEFS.filter((c) => columnVisibility[c.id]).map((col) => (
                <IndexTable.Cell key={col.id}>
                  {renderShipmentCell({
                    colId: col.id,
                    item,
                    ti,
                    ev,
                    dest,
                    orderUrl,
                    tags,
                    carrier,
                  })}
                </IndexTable.Cell>
              ))}
            </IndexTable.Row>
          );
        })
        : null}
    </IndexTable>
  );
}

function renderShipmentCell({
  colId,
  item,
  ti,
  ev,
  dest,
  orderUrl,
  tags,
  carrier,
}: {
  colId: ShipmentColumnId;
  item: ShipmentListEdge["node"];
  ti: TrackingInfo | undefined;
  ev: LatestEvent | undefined;
  dest: string;
  orderUrl: string | null;
  tags: string;
  carrier: string;
}) {
  switch (colId) {
    case "tracking":
      return (
        <BlockStack gap="100">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {ti?.number ?? "—"}
          </Text>
          {ti?.url ? (
            <Link url={ti.url} external>
              Track
            </Link>
          ) : null}
        </BlockStack>
      );
    case "order":
      return orderUrl ? (
        <Link url={orderUrl} external>
          {item.order?.name ?? item.orderName ?? "—"}
        </Link>
      ) : (
        <Text as="span" variant="bodyMd">
          {item.order?.name ?? item.orderName ?? "—"}
        </Text>
      );
    case "status":
      return item.status ? (
        <Badge tone={fulfillmentStatusTone(item.status)}>{item.status}</Badge>
      ) : (
        "—"
      );
    case "requestStatus":
      return (
        <Text as="p" variant="bodyMd">
          {item.requestStatus ?? "—"}
        </Text>
      );
    case "destination":
      return (
        <Text as="p" variant="bodyMd">
          {dest || "—"}
        </Text>
      );
    case "latestEvent":
      return (
        <BlockStack gap="100">
          {ev?.happenedAt ? (
            <Text as="span" variant="bodySm" tone="subdued">
              {new Date(ev.happenedAt).toLocaleString()}
            </Text>
          ) : null}
          <Text as="span" variant="bodyMd">
            {ev?.message ?? "—"}
          </Text>
        </BlockStack>
      );
    case "updated":
      return (
        <Text as="p" variant="bodyMd">
          {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}
        </Text>
      );
    case "tags":
      return (
        <Text as="p" variant="bodyMd">
          {tags}
        </Text>
      );
    case "carrier":
      return (
        <Text as="p" variant="bodyMd">
          {carrier}
        </Text>
      );
    default:
      return "—";
  }
}