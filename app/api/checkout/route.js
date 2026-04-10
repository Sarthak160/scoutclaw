import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_CONFIG = {
  pro: {
    name: "ScoutClaw Pro",
    amount: 500
  },
  expert: {
    name: "ScoutClaw Expert",
    amount: 2000
  }
};

export async function POST(request) {
  return createCheckoutResponse(request);
}

export async function createCheckoutResponse(request, { stripeFactory = (key) => new Stripe(key) } = {}) {
  const { plan } = await request.json();
  const config = PLAN_CONFIG[plan];

  if (!config) {
    return Response.json({ error: "Unsupported plan selected." }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY first." }, { status: 500 });
  }

  const stripe = stripeFactory(process.env.STRIPE_SECRET_KEY);
  const origin = request.headers.get("origin") || process.env.APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cancel`,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: config.name
          },
          unit_amount: config.amount
        },
        quantity: 1
      }
    ]
  });

  return Response.json({
    url: session.url
  });
}

export const __testables = {
  PLAN_CONFIG
};
