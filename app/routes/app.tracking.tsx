import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";

import { PolarisAppShell } from "../components/PolarisAppShell";

export default function TrackingPage() {
  return (
    <PolarisAppShell>
      <Page title="Tracking">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Order tracking
                </Text>
                <Text as="p" variant="bodyMd">
                  Surface tracking numbers and carrier status for your merchants
                  here. This page is a placeholder until you wire tracking
                  integrations.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Next steps
                </Text>
                <Text as="p" variant="bodyMd">
                  Integrate carrier APIs or fulfillment events to populate
                  tracking timelines.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppShell>
  );
}
