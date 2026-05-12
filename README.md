# 7track

Shopify embedded app built with **React Router 7**, **Vite**, **Polaris**, **App Bridge**, **TanStack Query**, and **Prisma** (session storage). Admin GraphQL operations are typed with **GraphQL Code Generator** and Shopify’s **`@shopify/api-codegen-preset`**. The **Shipments** area (`/app/shipments`) loads fulfillment orders via a small JSON API (`GET /api/shipments`) typed with the same generated **`ShipmentsListQuery`** shape as the underlying Admin operation.

## Prerequisites

- Node.js `>=20.19 <22 || >=22.12`
- npm
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- Shopify Partner account and a development store
- [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (optional, for the quick tunnel flow below)

## Quick setup

```bash
npm install
shopify auth login
npm run config:link
```

Use `npm run config:link` when this repository is not yet linked to your Shopify app in the Partner Dashboard.

## Running the app

### Default (Shopify CLI tunnel)

```bash
npm run dev
```

Follow the CLI prompts. Press **P** when offered to open the app URL, install the app on your dev store, then continue development.

### App + Cloudflare quick tunnel (no Cloudflare account)

Use this when you need a stable public URL (for example embedded admin or mobile testing).

**Terminal 1** — start a tunnel and copy the printed `https://…trycloudflare.com` URL:

```bash
cloudflared tunnel --url http://localhost:3000
```

**Terminal 2** — pass that host with port `3000` to the Shopify dev server:

```bash
npm run dev -- --tunnel-url https://<your-subdomain>.trycloudflare.com:3000
```

### Shipments (example feature)

After install, open **Shipments** from the app nav (`/app/shipments`). Data is loaded with TanStack Query from `GET /api/shipments`, which proxies Admin GraphQL using the operation in [`app/queries/shipments/shipmentsList.graphql`](app/queries/shipments/shipmentsList.graphql).

Deploy the app:

```bash
npm run deploy
```

## GraphQL type generation workflow

Admin GraphQL is strongly typed on the schema side. This project uses **GraphQL Code Generator** with Shopify’s **`@shopify/api-codegen-preset`** so TypeScript types and `admin.graphql` operation typings stay aligned with your queries and mutations.

### How it fits together

1. You write operations either as **`.graphql` files** under [`app/queries/<section>/`](app/queries/shipments/) (recommended for a single source of truth, e.g. [`shipmentsList.graphql`](app/queries/shipments/shipmentsList.graphql)) or as inline `#graphql` strings in `.ts`/`.tsx` files under `app/`.
2. **GraphQL Config** ([`.graphqlrc.ts`](.graphqlrc.ts)) points the codegen preset at the **Admin API** schema (version **`ApiVersion.October25`**, aligned with [`app/shopify.server.ts`](app/shopify.server.ts)) and at your **document** globs.
3. Running codegen writes generated files under **`app/types/`** (for example `admin.types.d.ts` and `admin.generated.d.ts`), including types such as `ShipmentsListQuery` / `ShipmentsListQueryVariables` and module augmentation for `@shopify/admin-api-client`.
4. On the server, `authenticate.admin` + `admin.graphql(...)` use those types when your query document matches a generated operation.
5. For **JSON routes** that return GraphQL `data` to the browser (e.g. [`app/routes/api.shipments.tsx`](app/routes/api.shipments.tsx)), the payload can be typed as the generated **`…Query`** type so the UI stays aligned with the same operation without maintaining a parallel hand-written DTO.

### Configuration

- Config file: [`.graphqlrc.ts`](.graphqlrc.ts)
- Preset: `shopifyApiProject({ apiType: ApiType.Admin, apiVersion: ApiVersion.October25, documents: […], outputDir: "./app/types" })`
- **Documents** include:
  - `./app/**/*.{js,ts,jsx,tsx}`
  - `./app/.server/**/*.{js,ts,jsx,tsx}`
  - `./app/queries/**/*.graphql`

### Generated outputs and git

This repo **gitignores** large generated artifacts under `app/types/` (see [.gitignore](.gitignore)):

- `admin-*.schema.json`
- `admin.types.d.ts`
- `admin.generated.d.ts`

They are recreated whenever you run codegen. **Fresh clones** should run **`npm run graphql-codegen`** (or **`npm run typecheck`** / **`npm run build`**, which run codegen first) before relying on editor or `tsc` against those paths.

### Commands (workflow)

| Command | Purpose |
|--------|---------|
| `npm run graphql-codegen` | Regenerate `app/types` from the Admin schema and your GraphQL documents. Run after you add or change operations. |

**Already wired:** `npm run typecheck` and `npm run build` both start with **`graphql-codegen`**, so CI and local checks do not compile against stale generated types.

### Day-to-day developer flow

1. Add or edit an operation in `app/queries/<section>/*.graphql` and/or in route files using `#graphql` tagged strings.
2. Run **`npm run graphql-codegen`** (or rely on it at the start of **`npm run typecheck`** / **`npm run build`**).
3. Fix any TypeScript errors from renamed fields or variables.
4. Commit **only** what your team policy allows for generated files; this repository currently expects them to be **regenerated** locally/CI rather than committed.

### Editor support

Install the [GraphQL VS Code extension](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) so `.graphql` files get schema-aware completion using the same `.graphqlrc.ts`.

### Further reading

- [Shopify: `@shopify/api-codegen-preset`](https://www.npmjs.com/package/@shopify/api-codegen-preset)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the app via Shopify CLI (tunnel, env, etc.). |
| `npm run build` | Run `graphql-codegen`, then production React Router build. |
| `npm run start` | Serve the production build with `react-router-serve`. |
| `npm run setup` | `prisma generate` and `prisma migrate deploy` for session storage. |
| `npm run lint` | ESLint. |
| `npm run graphql-codegen` | Regenerate Admin GraphQL TypeScript types. |
| `npm run typecheck` | `graphql-codegen`, React Router typegen, then `tsc --noEmit`. |
| `npm run deploy` | Deploy app via Shopify CLI. |
| `npm run config:link` | Link local app to Partner Dashboard app. |
| `npm run config:use` | Switch Shopify app config. |
| `npm run env` | Shopify CLI env helpers. |
| `npm run generate` | `shopify app generate` scaffolding. |
| `npm run shopify` | Shopify CLI passthrough. |
| `npm run prisma` | Prisma CLI passthrough. |
| `npm run vite` | Vite CLI passthrough. |
| `npm run docker-start` | `npm run setup` then `npm run start`. |

## Tech stack

- **Framework:** React Router 7, React 18, Vite
- **Shopify:** `@shopify/shopify-app-react-router`, App Bridge, Polaris
- **Data loading:** `@tanstack/react-query` (e.g. Shipments infinite list)
- **Sessions:** Prisma + SQLite by default (see [`prisma/schema.prisma`](prisma/schema.prisma)); swap datasource for production if needed
- **Types:** TypeScript, GraphQL codegen (see above)

## Database and sessions

Sessions are stored with **Prisma** (see [`prisma/schema.prisma`](prisma/schema.prisma)). SQLite is fine for local dev and single-instance hosting. For production at scale, use a hosted SQL database and update the Prisma datasource and `DATABASE_URL` accordingly.

If you see `The table main.Session does not exist`, run:

```bash
npm run setup
```

## Build and hosting

```bash
npm run build
npm run start
```

For production deployment, environment variables, and hosting options, follow [Shopify’s deployment documentation](https://shopify.dev/docs/apps/launch/deployment). Set `NODE_ENV=production` in production.

## Embedded app behavior

- Prefer **`Link`** from `react-router` or Polaris navigation, not raw `<a href>`, so session and embedded context stay correct.
- Use **`redirect`** from `authenticate.admin` (see [`app/shopify.server.ts`](app/shopify.server.ts)), not React Router’s `redirect`, when signing in or bouncing after auth inside the embedded admin.

## Webhooks

Prefer **app-specific** webhooks declared in [`shopify.app.toml`](shopify.app.toml) so Shopify keeps subscriptions in sync when you deploy. See [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions).

## Shopify Dev MCP

This template can be used with the **Shopify Dev MCP** so tools like Cursor, GitHub Copilot, or Claude Code can use Shopify’s MCP server for API references and tasks.

For more information see [Shopify Dev MCP documentation](https://shopify.dev/docs/apps/build/devmcp).

## Troubleshooting

### GraphQL extension shows wrong schema

If you use multiple APIs (Storefront, extension schemas), update [`.graphqlrc.ts`](.graphqlrc.ts) projects so the correct schema maps to each document set.

### JWT / "nbf" claim errors

Usually clock skew. Enable automatic date and time on your machine.

### Cloudflare tunnel and streaming

By default the CLI uses a Cloudflare tunnel, which may buffer response streams during local dev. This does not affect production. For streaming-heavy local tests, consider [localhost-based development](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options#localhost-based-development).

### Database tables don't exist

If Prisma reports missing `Session` (or similar), run `npm run setup`.

### Windows / Prisma engine errors

If Prisma fails to load native engines on Windows ARM64, try:

```bash
export PRISMA_CLIENT_ENGINE_TYPE=binary
```

(Use the equivalent `set` syntax on Windows CMD.)

## Resources

- [React Router documentation](https://reactrouter.com/home)
- [Shopify app overview](https://shopify.dev/docs/apps/getting-started)
- [`@shopify/shopify-app-react-router`](https://shopify.dev/docs/api/shopify-app-react-router)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Polaris](https://polaris.shopify.com/)
- [App Bridge](https://shopify.dev/docs/api/app-bridge-library)
