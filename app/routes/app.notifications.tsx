import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";

import { PolarisAppShell } from "../components/PolarisAppShell";

export default function NotificationsPage() {
  return (
    <PolarisAppShell>
      <Page title="Notifications">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Notifications
                </Text>
                <Text as="p" variant="bodyMd">
                  Configure how merchants receive updates about shipments,
                  delays, and delivery events. Extend this page with your
                  notification preferences and history.
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
                  Connect email, webhooks, or in-app alerts according to your
                  product requirements.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppShell>
  );
}
