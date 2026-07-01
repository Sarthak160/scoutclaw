import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlanConfig {
  name: string;
  amount: number;
}

const PLAN_CONFIG: Record<string, PlanConfig> = {
  pro: {
    name: "ScoutClaw Pro",
    amount: 500
  },
  expert: {
    name: "ScoutClaw Expert",
    amount: 2000
  }
};

export interface CheckoutSessionParams {
  mode: "payment";
  success_url: string;
  cancel_url: string;
  line_items: Array<{
    price_data: {
      currency: string;
      product_data: { name: string };
      unit_amount: number;
    };
    quantity: number;
  }>;
}

/** Minimal Stripe surface used by the checkout route, so tests can supply a double. */
export interface StripeCheckoutClient {
  checkout: {
    sessions: {
      create(params: CheckoutSessionParams): Promise<{ url: string | null }>;
    };
  };
}

type StripeFactory = (key: string) => StripeCheckoutClient;

const defaultStripeFactory: StripeFactory = (key) => new Stripe(key) as unknown as StripeCheckoutClient;

export async function POST(request: Request): Promise<Response> {
  return createCheckoutResponse(request);
}

export async function createCheckoutResponse(
  request: Request,
  { stripeFactory = defaultStripeFactory }: { stripeFactory?: StripeFactory } = {}
): Promise<Response> {
  const { plan } = (await request.json()) as { plan?: string };
  const config = plan ? PLAN_CONFIG[plan] : undefined;

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
