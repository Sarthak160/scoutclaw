import test from "node:test";
import assert from "node:assert/strict";

import { createCheckoutResponse } from "../app/api/checkout/route.js";

test("checkout rejects unsupported plans", async () => {
  const response = await createCheckoutResponse(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "enterprise" }),
      headers: { "content-type": "application/json" }
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unsupported plan selected." });
});

test("checkout requires stripe secret key", async () => {
  const original = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;

  const response = await createCheckoutResponse(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro" }),
      headers: { "content-type": "application/json" }
    })
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY first." });
  process.env.STRIPE_SECRET_KEY = original;
});

test("checkout creates a stripe session with expected urls and amount", async () => {
  const original = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_123";

  let factoryKey = "";
  let checkoutPayload = null;
  const response = await createCheckoutResponse(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "expert" }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3001"
      }
    }),
    {
      stripeFactory: (key) => {
        factoryKey = key;
        return {
          checkout: {
            sessions: {
              create: async (payload) => {
                checkoutPayload = payload;
                return { url: "https://checkout.stripe.test/session_123" };
              }
            }
          }
        };
      }
    }
  );

  assert.equal(factoryKey, "sk_test_123");
  assert.equal(checkoutPayload.line_items[0].price_data.unit_amount, 2000);
  assert.equal(checkoutPayload.success_url, "http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { url: "https://checkout.stripe.test/session_123" });

  process.env.STRIPE_SECRET_KEY = original;
});
