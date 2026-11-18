import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserOrDefault } from "@/lib/auth"


// GET /api/subscriptions/[id] — Get single subscription with usage records
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserOrDefault()
    const { id } = await params;

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
      include: {
        provider: true,
        plan: true,
        usageRecords: { orderBy: { date: "desc" } },
        billingRecords: { orderBy: { billingDate: "desc" } },
      },
    });

    if (!subscription) {
      return Response.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: subscription });
  } catch (error) {
    console.error("Subscription GET error:", error);
    return Response.json(
      { data: null, error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// PUT /api/subscriptions/[id] — Update subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserOrDefault()
    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(body.providerId !== undefined && { providerId: body.providerId }),
        ...(body.planId !== undefined && { planId: body.planId }),
        ...(body.customPlanName !== undefined && { customPlanName: body.customPlanName }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.billingCycle !== undefined && { billingCycle: body.billingCycle }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.renewalDate !== undefined && { renewalDate: body.renewalDate ? new Date(body.renewalDate) : null }),
        ...(body.expiryDate !== undefined && { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null }),
        ...(body.quotaMessages !== undefined && { quotaMessages: body.quotaMessages }),
        ...(body.quotaTokens !== undefined && { quotaTokens: body.quotaTokens }),
        ...(body.quotaRequests !== undefined && { quotaRequests: body.quotaRequests }),
        ...(body.quotaCredits !== undefined && { quotaCredits: body.quotaCredits }),
        ...(body.quotaResetPeriod !== undefined && { quotaResetPeriod: body.quotaResetPeriod }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: { provider: true, plan: true },
    });

    return Response.json({ data: subscription });
  } catch (error) {
    console.error("Subscription PUT error:", error);
    return Response.json(
      { data: null, error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions/[id] — Soft delete (set status to cancelled)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserOrDefault()
    const { id } = await params;

    const existing = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    return Response.json({ data: subscription });
  } catch (error) {
    console.error("Subscription DELETE error:", error);
    return Response.json(
      { data: null, error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

// PATCH /api/subscriptions/[id] — Update usage counters
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserOrDefault()
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.subscription.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json(
        { data: null, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(body.usedMessages !== undefined && { usedMessages: body.usedMessages }),
        ...(body.usedTokens !== undefined && { usedTokens: body.usedTokens }),
        ...(body.usedRequests !== undefined && { usedRequests: body.usedRequests }),
        ...(body.usedCredits !== undefined && { usedCredits: body.usedCredits }),
      },
    });

    return Response.json({ data: subscription });
  } catch (error) {
    console.error("Subscription PATCH error:", error);
    return Response.json(
      { data: null, error: "Failed to update usage" },
      { status: 500 }
    );
  }
}
