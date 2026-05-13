import { useMemo, useState } from "react";
import { useRouteLoaderData } from "react-router";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  IndexTable,
  InlineGrid,
  InlineStack,
  Layout,
  Link,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  CalendarTimeIcon,
  InfoIcon,
  LayoutFooterIcon,
  LayoutHeaderIcon,
  LinkIcon,
  MenuHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TabletIcon,
  ThemeEditIcon,
  ThumbsUpIcon,
  ViewIcon,
} from "@shopify/polaris-icons";

import type { loader as appLoader } from "./app";
import { PolarisAppShell } from "../components/PolarisAppShell";

/** Public app path segment under `/apps/…` — adjust if your app handle differs. */
const TRACKING_APP_PATH = "7track";

const MOCK = {
  currentPageTitle: "Tracking_page",
  lastUpdatedLabel: "Last update time: 12 May, 2026 22:08:45",
  addPageLabel: "Add page (1/5)",
} as const;

const SELL_POINTS: { icon: typeof ThumbsUpIcon; text: string }[] = [
  {
    icon: ThumbsUpIcon,
    text: "Real-time self-tracking reduces WISMO tickets, saving customer service costs.",
  },
  {
    icon: SearchIcon,
    text: "Marketing recommendations increase product exposure and promote sales conversion.",
  },
  {
    icon: TabletIcon,
    text: "Customized pages enhance brand experience.",
  },
  {
    icon: CalendarTimeIcon,
    text: "Estimated date of delivery reduces package anxiety.",
  },
];

function thumbPreview({ minHeight }: { minHeight: string }) {
  return (
    <Box
      background="bg-surface-secondary"
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      minHeight={minHeight}
      padding="300"
    />
  );
}

export default function TrackingPage() {
  const appData = useRouteLoaderData("routes/app") as
    | Awaited<ReturnType<typeof appLoader>>
    | undefined;
  const shop = appData?.shop;

  const storeHandle = useMemo(() => {
    if (!shop) return "test-289ntxio";
    return shop.replace(/\.myshopify\.com$/i, "") || shop;
  }, [shop]);

  const trackingPageUrl = useMemo(() => {
    const host = shop ?? "test-289ntxio.myshopify.com";
    return `https://${host}/apps/${TRACKING_APP_PATH}`;
  }, [shop]);

  const [menuName, setMenuName] = useState("Track Your Order");

  return (
    <PolarisAppShell>
      <Page
        title="Tracking Page"
        subtitle="Add a tracking page to your store. Enable your customer to track for themselves. This helps relieve your post-sales cost."
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <InlineGrid columns={{ xs: 1, md: "1fr auto" }} gap="400">
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Boost customer satisfaction with tracking page
                    </Text>
                    <BlockStack gap="200">
                      {SELL_POINTS.map(({ icon, text }) => (
                        <InlineStack key={text} gap="200" blockAlign="start" wrap={false}>
                          <Box>
                            <Icon source={icon} tone="base" />
                          </Box>
                          <Text as="p" variant="bodyMd">
                            {text}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </BlockStack>
                  <BlockStack inlineAlign="end" gap="0">
                    <Box maxWidth="320px" width="100%">
                      {thumbPreview({ minHeight: "200px" })}
                    </Box>
                  </BlockStack>
                </InlineGrid>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        {storeHandle}
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Tracking page URL:{" "}
                        <Link url={trackingPageUrl} external>
                          {trackingPageUrl}
                        </Link>
                      </Text>
                    </BlockStack>
                    <Button variant="primary" icon={PlusIcon}>
                      {MOCK.addPageLabel}
                    </Button>
                  </InlineStack>

                  <InlineGrid columns={{ xs: 1, md: "auto 1fr auto" }} gap="400" alignItems="center">
                    <Box minWidth="72px">{thumbPreview({ minHeight: "56px" })}</Box>
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center" wrap>
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {MOCK.currentPageTitle}
                        </Text>
                        <Badge tone="info">Current page</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {MOCK.lastUpdatedLabel}
                      </Text>
                    </BlockStack>
                    <InlineStack gap="100" align="end" blockAlign="center">
                      <Button icon={ViewIcon} accessibilityLabel="View page" variant="plain" />
                      <Button icon={ThemeEditIcon} accessibilityLabel="Edit page" variant="plain" />
                      <Button
                        icon={MenuHorizontalIcon}
                        accessibilityLabel="More actions"
                        variant="plain"
                      />
                    </InlineStack>
                  </InlineGrid>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center" gap="400" wrap>
                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                      <Text as="h2" variant="headingMd">
                        How to add the tracking page to the store navigation bar?
                      </Text>
                      <Icon source={InfoIcon} tone="subdued" />
                    </InlineStack>
                    <Link url="#" external>
                      Can&apos;t install? Check Help center
                    </Link>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    You can easily install the tracking page to the header or footer of your store with
                    just one click, allowing customers to track their packages within your store.{" "}
                    <Link url="#">Preview</Link>
                  </Text>
                  <TextField
                    label="Menu Name"
                    value={menuName}
                    onChange={setMenuName}
                    autoComplete="off"
                    maxLength={255}
                    showCharacterCount
                  />
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Position
                  </Text>
                  <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="medium">
                        Install to Header
                      </Text>
                      <Link url="#">Turn on</Link>
                      <Box
                        background="bg-surface-secondary"
                        borderColor="border"
                        borderWidth="025"
                        borderRadius="200"
                        padding="400"
                        minHeight="100px"
                      >
                        <InlineStack align="center" blockAlign="center">
                          <Icon source={LayoutHeaderIcon} tone="subdued" />
                        </InlineStack>
                      </Box>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="medium">
                        Install to Footer
                      </Text>
                      <Link url="#">Turn on</Link>
                      <Box
                        background="bg-surface-secondary"
                        borderColor="border"
                        borderWidth="025"
                        borderRadius="200"
                        padding="400"
                        minHeight="100px"
                      >
                        <InlineStack align="center" blockAlign="center">
                          <Icon source={LayoutFooterIcon} tone="subdued" />
                        </InlineStack>
                      </Box>
                    </BlockStack>
                  </InlineGrid>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Manage tracking page URLs
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Note: Please keep 7track App installed while using the tracking page.
                  </Text>
                  <IndexTable
                    resourceName={{ singular: "store", plural: "stores" }}
                    itemCount={1}
                    selectable={false}
                    headings={[
                      { title: "Store name" },
                      { title: "Current page" },
                      { title: "URLs" },
                      { title: "Actions" },
                    ]}
                  >
                    <IndexTable.Row id="tracking-url-row-1" position={0}>
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {storeHandle}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {MOCK.currentPageTitle}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Link url={trackingPageUrl} external>
                          {trackingPageUrl}
                        </Link>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack gap="100">
                          <Button
                            icon={ThemeEditIcon}
                            accessibilityLabel="Edit"
                            variant="plain"
                          />
                          <Button icon={LinkIcon} accessibilityLabel="Copy URL" variant="plain" />
                          <Button icon={ViewIcon} accessibilityLabel="View" variant="plain" />
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  </IndexTable>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Replace shipment link (Redirection)
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      Redirection is enabled by default and only applies to orders synced to the app
                      after you install 7track. Once enabled, 7track replaces tracking links for these
                      places with your tracking page.{" "}
                      <Link url="#">Redirect historical orders</Link> ·{" "}
                      <Link url="#">Replace in these places</Link>
                    </Text>
                  </BlockStack>
                  <InlineStack align="space-between" blockAlign="center" gap="400" wrap>
                    <InlineStack gap="200" blockAlign="center" wrap>
                      <Text as="span" variant="bodyMd" fontWeight="medium">
                        Enable link replacement
                      </Text>
                      <Badge tone="success">On</Badge>
                    </InlineStack>
                    <Button>Turn off</Button>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <Text as="h2" variant="headingMd">
                      Add order tracking widget to order status page
                    </Text>
                    <Button variant="primary" icon={PlusIcon}>
                      Add widget now
                    </Button>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    Add the order tracking widget to the order status page so that your customers can
                    quickly access the tracking page to track order. <Link url="#">Learn more</Link>
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <InlineGrid columns={{ xs: 1, md: "1fr auto" }} gap="400">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Embed tracking page using iframe
                    </Text>
                    <Text as="p" variant="bodyMd">
                      You can embed the content of the tracking page on any page of your store using an
                      iframe, so customers can track without leaving the page they are on.
                    </Text>
                  </BlockStack>
                  <BlockStack inlineAlign="end" gap="0">
                    <Box maxWidth="280px" width="100%">
                      {thumbPreview({ minHeight: "140px" })}
                    </Box>
                  </BlockStack>
                </InlineGrid>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppShell>
  );
}
