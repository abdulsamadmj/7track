import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";

import { PolarisAppShell } from "../components/PolarisAppShell";

export default function ShipmentsPage() {
  return (
    <PolarisAppShell>
      <Page title="Shipments">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Shipments
                </Text>
                <Text as="p" variant="bodyMd">
                  View and manage shipments from this page. Connect your
                  fulfillment data here when you are ready to build the
                  feature.
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
                  Add loaders and actions to load shipment data from your
                  backend or Shopify APIs.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppShell>
  );
}
