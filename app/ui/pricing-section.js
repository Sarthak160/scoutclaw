"use client";

import { useState } from "react";

const PLANS = [
  {
    key: "free",
    tier: "Free Forever",
    price: "$0",
    copy: "For independent candidates getting started with AI-assisted outreach.",
    features: [
      "Resume upload and profile setup",
      "Custom filters and advanced prompt guidance",
      "Basic OpenClaw run control",
      "Community-level support"
    ]
  },
  {
    key: "pro",
    tier: "Pro",
    oldPrice: "$19",
    price: "$5",
    ribbon: "Early bird discount",
    featured: true,
    copy: "For active job seekers who want stronger automation and higher-value lead screening.",
    features: [
      "Everything in Free Forever",
      "Higher AI usage limits and richer prompt memory",
      "Priority company and recruiter research flows",
      "Early access to smarter ranking features"
    ]
  },
  {
    key: "expert",
    tier: "Expert",
    oldPrice: "$100",
    price: "$20",
    ribbon: "Early bird expert",
    featuredSecondary: true,
    copy: "For power users, agencies, and operators who need bigger ceilings and premium model access.",
    features: [
      "Unlimited runs and higher operational limits",
      "More AI model budget and premium routing",
      "Opus 4.6 support",
      "Priority onboarding and advanced support"
    ]
  }
];

export default function PricingSection({ standalone = false }) {
  const [pendingPlan, setPendingPlan] = useState("");
  const [error, setError] = useState("");

  async function startCheckout(plan) {
    if (plan === "free") {
      return;
    }

    setPendingPlan(plan);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to start checkout.");
      }

      window.location.href = payload.url;
    } catch (nextError) {
      setError(nextError.message);
      setPendingPlan("");
    }
  }

  return (
    <section className={`marketing-panel marketing-panel-wide ${standalone ? "standalone-section" : ""}`} id="pricing">
      <div className="section-head">
        <div>
          <p className="panel-kicker">Pricing</p>
          <h2>Pick the lane that matches your search intensity.</h2>
        </div>
      </div>

      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <article
            className={`pricing-card ${plan.featured ? "pricing-card-featured" : ""} ${plan.featuredSecondary ? "pricing-card-featured-secondary" : ""}`}
            key={plan.key}
          >
            {plan.ribbon ? (
              <div className={`pricing-ribbon ${plan.featuredSecondary ? "pricing-ribbon-secondary" : ""}`}>{plan.ribbon}</div>
            ) : null}
            <p className="pricing-tier">{plan.tier}</p>
            <h3>
              {plan.oldPrice ? <span className="pricing-old">{plan.oldPrice}</span> : null}
              <span className="pricing-current">{plan.price}</span>
            </h3>
            <p className="pricing-copy">{plan.copy}</p>
            <ul className="pricing-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              className="primary-button pricing-button"
              disabled={pendingPlan === plan.key}
              onClick={() => void startCheckout(plan.key)}
            >
              {plan.key === "free" ? "Start free" : pendingPlan === plan.key ? "Redirecting…" : `Choose ${plan.tier}`}
            </button>
          </article>
        ))}
      </div>

      {error ? <p className="pricing-error">{error}</p> : null}
    </section>
  );
}

