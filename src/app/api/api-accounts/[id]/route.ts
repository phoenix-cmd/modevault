import { type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUserOrDefault } from "@/lib/auth"


// GET /api/api-accounts/[id] — Get single API account
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const { id } = await params;

    const account = await db.orm.public.ApiAccount
      .include("provider")
      .include("apiUsageRecords", (records) =>
        records.orderBy((r) => r.date.desc()).limit(50)
      )
      .where({ id })
      .where({ userId: user.id })
      .first();

    if (!account) {
      return Response.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: account });
  } catch (error) {
    console.error("API Account GET error:", error);
    return Response.json(
      { data: null, error: "Failed to fetch API account" },
      { status: 500 }
    );
  }
}

// PUT /api/api-accounts/[id] — Update API account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const { id } = await params;
    const body = await request.json();

    const existing = await db.orm.public.ApiAccount
      .where({ id })
      .where({ userId: user.id })
      .first();

    if (!existing) {
      return Response.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      );
    }

    const account = await db.orm.public.ApiAccount
      .include("provider")
      .where({ id })
      .update({
        ...(body.accountName !== undefined && { accountName: body.accountName }),
        ...(body.apiKeyLastFour !== undefined && { apiKeyLastFour: body.apiKeyLastFour }),
        ...(body.prepaidBalance !== undefined && { prepaidBalance: body.prepaidBalance }),
        ...(body.totalSpent !== undefined && { totalSpent: body.totalSpent }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.rateLimit !== undefined && { rateLimit: body.rateLimit }),
        ...(body.rateLimitTokens !== undefined && { rateLimitTokens: body.rateLimitTokens }),
        ...(body.integrationStatus !== undefined && { integrationStatus: body.integrationStatus }),
      });

    return Response.json({ data: account });
  } catch (error) {
    console.error("API Account PUT error:", error);
    return Response.json(
      { data: null, error: "Failed to update API account" },
      { status: 500 }
    );
  }
}

// DELETE /api/api-accounts/[id] — Delete API account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const { id } = await params;

    const existing = await db.orm.public.ApiAccount
      .where({ id })
      .where({ userId: user.id })
      .first();

    if (!existing) {
      return Response.json(
        { data: null, error: "API account not found" },
        { status: 404 }
      );
    }

    await db.orm.public.ApiAccount.where({ id }).delete();

    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("API Account DELETE error:", error);
    return Response.json(
      { data: null, error: "Failed to delete API account" },
      { status: 500 }
    );
  }
}
