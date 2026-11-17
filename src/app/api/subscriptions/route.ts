import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const DEMO_USER_ID = "user_demo_001";

// GET /api/subscriptions — List all subscriptions for user, with provider data
export async function GET(_request: NextRequest) {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: DEMO_USER_ID },
      include: {
        provider: true,
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: subscriptions });
  } catch (error) {
    console.error("Subscriptions GET error:", error);
    return Response.json(
      { data: null, error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions — Create a new subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { providerId, type, price, startDate, billingCycle, planId, customPlanName, currency, status, renewalDate, expiryDate, quotaMessages, quotaTokens, quotaRequests, quotaCredits, quotaResetPeriod, notes } = body;

    // Validate required fields
    if (!providerId || !type || price == null) {
      return Response.json(
        { data: null, error: "Missing required fields: providerId, type, price" },
        { status: 400 }
      );
    }

    if (!["consumer", "api"].includes(type)) {
      return Response.json(
        { data: null, error: "type must be 'consumer' or 'api'" },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: DEMO_USER_ID,
        providerId,
        planId: planId ?? null,
        customPlanName: customPlanName ?? null,
        type,
        status: status ?? "active",
        billingCycle: billingCycle ?? "monthly",
        price,
        currency: currency ?? "INR",
        startDate: startDate ? new Date(startDate) : new Date(),
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        quotaMessages: quotaMessages ?? null,
        quotaTokens: quotaTokens ?? null,
        quotaRequests: quotaRequests ?? null,
        quotaCredits: quotaCredits ?? null,
        quotaResetPeriod: quotaResetPeriod ?? null,
        notes: notes ?? null,
      },
      include: { provider: true, plan: true },
    });

    return Response.json({ data: subscription }, { status: 201 });
  } catch (error) {
    console.error("Subscriptions POST error:", error);
    return Response.json(
      { data: null, error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
