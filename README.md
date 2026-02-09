This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Builder Pipeline V2

The streaming builder endpoint (`/api/builder/stream`) now supports hybrid generation strategies:

- `fast_json`: low-latency generation path (default).
- `plan_driven`: planner -> designer -> coder -> repairer flow.
- `template_fill`: deterministic section template composition for business sites.

### Request Shape

```ts
interface BuildRequestV2 {
  message: string;
  brandContext: BrandContext;
  currentFiles?: Record<string, string>;
  mode?: "fast" | "agentic";
  strategy?: "fast_json" | "plan_driven" | "template_fill";
  quality?: "speed" | "balanced" | "high";
  templateId?: string;
}
```

### Rollout Flag

Set `BUILDER_PIPELINE_V2=true` to enable non-default orchestration paths (`plan_driven`, `template_fill`) in production traffic.

When disabled, the API falls back to `fast_json` unless legacy `mode: "agentic"` is explicitly used.

### Stage Status Markers

Status updates follow stage prefixes for observability:

- `planning`
- `designing`
- `coding`
- `repairing`
- `finalizing`

## Local Agent Profile (Dev-only)

For local experimentation you can run an external coding agent (including Gemini CLI) against generated projects while keeping production traffic on server-managed Gemini API.

Example local workflow:

1. Terminal A: run `npm run dev`.
2. Terminal B: run your agent in the generated app directory (for example, `npx gemini`).
3. Keep this mode for development only; production should use server-side API orchestration.
