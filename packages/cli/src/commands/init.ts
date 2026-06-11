// ── betterpay init ───────────────────────────────────────────────────────
// Detects the project framework and generates the appropriate route handler
// and configuration files.

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Framework = 'next' | 'hono' | 'node' | 'unknown';

export async function initCommand(args: string[]): Promise<void> {
  const cwd = args[0] ?? process.cwd();
  console.log('🔍 Detecting framework...');

  const framework = detectFramework(cwd);
  console.log(`   Detected: ${framework}`);

  // Generate billing.ts config file
  const billingPath = join(cwd, 'billing.ts');
  if (!existsSync(billingPath)) {
    writeFileSync(billingPath, generateBillingConfig(framework));
    console.log(`✅ Created billing.ts`);
  } else {
    console.log(`⚠️  billing.ts already exists, skipping`);
  }

  // Generate route handler based on framework
  switch (framework) {
    case 'next':
      generateNextHandler(cwd);
      break;
    case 'hono':
      generateHonoHandler(cwd);
      break;
    default:
      generateNodeHandler(cwd);
      break;
  }

  // Generate .env.example
  const envExamplePath = join(cwd, '.env.example');
  if (!existsSync(envExamplePath)) {
    writeFileSync(envExamplePath, generateEnvExample());
    console.log(`✅ Created .env.example`);
  }

  console.log(`\n🎉 BetterPay initialized! Next steps:`);
  console.log(`   1. Add your API keys to .env`);
  console.log(`   2. Run: npx @betterpay/cli push  (to apply migrations)`);
  console.log(`   3. Import 'pay' from './billing' in your app`);
}

function detectFramework(cwd: string): Framework {
  try {
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) return 'unknown';

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.next) return 'next';
    if (deps.hono) return 'hono';
    return 'node';
  } catch {
    return 'unknown';
  }
}

function generateBillingConfig(_framework: Framework): string {
  return `import { betterPay } from "@betterpay/core";
// import { midtrans } from "@betterpay/midtrans";
// import { xendit } from "@betterpay/xendit";
// import { duitku } from "@betterpay/duitku";
// import { pakasir } from "@betterpay/pakasir";
// import { billing, feature, plan } from "@betterpay/billing";

// ── Define your plans ───────────────────────────────────────────────────
// const messages = feature({ id: "messages", type: "metered" });
//
// const free = plan({
//   id: "free", group: "base", default: true,
//   includes: [messages({ limit: 100, reset: "month" })],
// });
//
// const pro = plan({
//   id: "pro", group: "base",
//   price: { amount: 199000, currency: "IDR", interval: "month" },
//   includes: [messages({ limit: 5000, reset: "month" })],
// });

export const pay = betterPay({
  // database: process.env.DATABASE_URL!,

  plugins: [
    // ── Payment Providers (choose one or more) ──────────────────────────
    // midtrans({
    //   serverKey: process.env.MIDTRANS_SERVER_KEY!,
    //   isSandbox: process.env.NODE_ENV !== "production",
    // }),
    // xendit({
    //   apiKey: process.env.XENDIT_API_KEY!,
    //   webhookSecret: process.env.XENDIT_WEBHOOK_SECRET!,
    // }),
    // duitku({
    //   apiKey: process.env.DUITKU_API_KEY!,
    //   merchantCode: process.env.DUITKU_MERCHANT_CODE!,
    // }),
    // pakasir({
    //   apiKey: process.env.PAKASIR_API_KEY!,
    //   projectSlug: process.env.PAKASIR_PROJECT_SLUG!,
    // }),

    // ── Billing (optional — uncomment to enable subscriptions) ──────────
    // billing({ products: [free, pro] }),
  ],
});
`;
}

function generateNextHandler(cwd: string): void {
  const routePath = join(cwd, 'app', 'api', 'pay', '[...all]', 'route.ts');

  if (existsSync(routePath)) {
    console.log(`⚠️  Route handler already exists, skipping`);
    return;
  }

  // We can't create directories easily with writeFileSync, so just create the file
  try {
    writeFileSync(routePath, `import { payHandler } from "@betterpay/next";
import { pay } from "@/billing";

export const { GET, POST } = payHandler(pay);
`);
    console.log(`✅ Created app/api/pay/[...all]/route.ts`);
  } catch {
    console.log(`⚠️  Could not create Next.js route. Create it manually:`);
    console.log(`   File: app/api/pay/[...all]/route.ts`);
    console.log(`   See: https://betterpay.dev/docs/quickstart#nextjs`);
  }
}

function generateHonoHandler(cwd: string): void {
  const routePath = join(cwd, 'src', 'pay-route.ts');

  if (existsSync(routePath)) {
    console.log(`⚠️  Route handler already exists, skipping`);
    return;
  }

  try {
    writeFileSync(routePath, `import { Hono } from "hono";
import { payHandler } from "@betterpay/hono";
import { pay } from "./billing";

const app = new Hono();
app.all("/pay/*", payHandler(pay));

export default app;
`);
    console.log(`✅ Created src/pay-route.ts`);
  } catch {
    console.log(`⚠️  Could not create Hono handler. Create it manually.`);
  }
}

function generateNodeHandler(cwd: string): void {
  const routePath = join(cwd, 'src', 'pay-handler.ts');

  try {
    writeFileSync(routePath, `import { createServer } from "node:http";
import { pay } from "./billing";

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/pay")) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  // Convert Node.js IncomingMessage → Web Request
  const url = \`http://\${req.headers.host}\${req.url}\`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value[0]! : value);
  }

  const request = new Request(url, {
    method: req.method,
    headers,
  });

  const response = await pay.handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
});

const port = process.env.PORT ?? 3000;
server.listen(port, () => {
  console.log(\`BetterPay server running on port \${port}\`);
});
`);
    console.log(`✅ Created src/pay-handler.ts`);
  } catch {
    console.log(`⚠️  Could not create Node.js handler. Create it manually.`);
  }
}

function generateEnvExample(): string {
  return `# BetterPay Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/betterpay

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=

# Xendit
XENDIT_API_KEY=
XENDIT_WEBHOOK_SECRET=

# Duitku
DUITKU_API_KEY=
DUITKU_MERCHANT_CODE=

# Pakasir
PAKASIR_API_KEY=
PAKASIR_PROJECT_SLUG=
`;
}
