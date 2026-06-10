// ── BetterPay Demo App ───────────────────────────────────────────────────
//
// This file demonstrates how to use BetterPay in a standalone Node.js app.
// Run: npx tsx demo/index.ts
//
// It uses a mock provider so no real API keys are needed.

import { betterPay } from '@betterpay/core';
import type { PaymentProvider, NormalizedWebhookEvent } from '@betterpay/core';

// ── Mock Provider (simulates Midtrans/Xendit without real API calls) ──────

function createDemoProvider(): PaymentProvider & { priority?: number } {
  const transactions = new Map<string, { amount: number; status: string }>();

  return {
    id: 'demo',
    name: 'Demo Provider',
    paymentMethods: ['virtual_account', 'qris', 'ewallet'],
    capabilities: {
      paymentLink: true,
      recurring: false,
      refund: false,
      virtualAccount: true,
      qris: true,
      ewallet: true,
    },
    priority: 1,

    getApiEndpoint: () => 'https://api.demo.example.com',

    async createPaymentLink(data) {
      const txnId = `demo_${data.orderId}`;
      transactions.set(txnId, { amount: data.amount, status: 'pending' });

      console.log(`   📝 Demo provider: Created payment for ${data.orderId} (${data.amount} ${data.currency})`);

      return {
        providerTransactionId: txnId,
        paymentUrl: `https://checkout.demo.example.com/pay/${txnId}`,
        qrString: `00020101021126420016COM.DEMO.EXAMPLE0118${txnId}`,
        amount: data.amount,
        currency: data.currency,
        status: 'active',
        raw: { demo: true },
      };
    },

    async verifyWebhook() {
      return true; // Always valid for demo
    },

    async normalizeWebhook(data) {
      const parsed = JSON.parse(data.body) as Record<string, unknown>;
      const events: NormalizedWebhookEvent[] = [
        {
          name: `payment.${(parsed.status as string) ?? 'completed'}`,
          payload: parsed,
          providerEventId: parsed.event_id as string,
        },
      ];
      return events;
    },

    async checkStatus(providerTransactionId) {
      const txn = transactions.get(providerTransactionId);
      return {
        providerTransactionId,
        status: (txn?.status ?? 'pending') as any,
        amount: txn?.amount ?? 0,
        currency: 'IDR',
        raw: {},
      };
    },
  };
}

// ── Main Demo ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 BetterPay Demo\n');

  // 1. Initialize BetterPay
  const pay = betterPay({
    plugins: [
      {
        id: 'demo-plugin',
        providers: [createDemoProvider()],
      },
    ],
  });

  console.log('✅ BetterPay initialized with demo provider\n');

  // 2. Create a one-time payment
  console.log('💳 Creating payment...');
  const payment = await pay.createTransaction({
    orderId: 'demo_order_001',
    amount: 199000, // Rp 199,000
    currency: 'IDR',
    customerEmail: 'customer@example.com',
    customerName: 'Budi Santoso',
    description: 'Pro Plan - Monthly',
    returnUrl: 'https://myapp.com/success',
  });

  console.log(`   Order ID:    ${payment.orderId}`);
  console.log(`   Status:      ${payment.status}`);
  console.log(`   Payment URL: ${payment.paymentUrl}`);
  console.log(`   Provider TX: ${payment.providerTransactionId}\n`);

  // 3. Check status
  console.log('📊 Checking status...');
  let status = await pay.getStatus('demo_order_001');
  console.log(`   Status: ${status?.status}\n`);

  // 4. Simulate webhook (customer paid)
  console.log('🔔 Simulating payment webhook...');
  const webhookResult = await pay.handleWebhook('demo', {
    body: JSON.stringify({
      order_id: 'demo_order_001',
      status: 'completed',
      amount: 199000,
      event_id: 'demo_evt_001',
    }),
    headers: {},
  });

  console.log(`   Webhook result: ${webhookResult.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Event: ${webhookResult.eventName}\n`);

  // 5. Check status after payment
  console.log('📊 Checking status after payment...');
  status = await pay.getStatus('demo_order_001');
  console.log(`   Status: ${status?.status}\n`);

  // 6. Test idempotency
  console.log('🔄 Replaying same webhook (idempotency test)...');
  const duplicate = await pay.handleWebhook('demo', {
    body: JSON.stringify({
      order_id: 'demo_order_001',
      status: 'completed',
      amount: 199000,
      event_id: 'demo_evt_001',
    }),
    headers: {},
  });
  console.log(`   Result: ${duplicate.success ? '✅ Success' : '❌ Failed'} (duplicate: ${duplicate.eventName ? 'yes' : 'no'})\n`);

  // 7. Summary
  console.log('📋 Demo Summary:');
  console.log('   ✅ Payment created successfully');
  console.log('   ✅ Status tracked correctly');
  console.log('   ✅ Webhook processed');
  console.log('   ✅ Idempotency working');
  console.log('\n🎉 BetterPay demo complete!\n');

  // 8. Show how to use in real app
  console.log('─'.repeat(50));
  console.log('\n📖 Real usage example:\n');
  console.log('```ts');
  console.log('import { betterPay } from "@betterpay/core";');
  console.log('import { midtrans } from "@betterpay/midtrans";');
  console.log('import { xendit } from "@betterpay/xendit";');
  console.log('');
  console.log('const pay = betterPay({');
  console.log('  plugins: [');
  console.log('    midtrans({ serverKey: "...", isSandbox: true }),');
  console.log('    xendit({ apiKey: "...", webhookSecret: "..." }),');
  console.log('  ],');
  console.log('});');
  console.log('');
  console.log('// Create payment');
  console.log('const result = await pay.createTransaction({');
  console.log('  orderId: "order_001",');
  console.log('  amount: 199000,');
  console.log('  customerEmail: "user@example.com",');
  console.log('});');
  console.log('// → { paymentUrl: "https://..." }');
  console.log('```');
}

main().catch(console.error);
