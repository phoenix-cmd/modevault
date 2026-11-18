import { type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUserOrDefault } from "@/lib/auth"


// GET /api/api-accounts — List all API accounts with provider info
export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const accounts = await db.orm.public.ApiAccount
      .include("provider")
      .where({ userId: user.id })
      .orderBy((a) => a.createdAt.desc())
      .all();

    return Response.json({ data: accounts });
  } catch (error) {
    console.error("API Accounts GET error:", error);
    return Response.json(
      { data: null, error: "Failed to fetch API accounts" },
      { status: 500 }
    );
  }
}

// POST /api/api-accounts — Create API account
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getCurrentUserOrDefault()
    const body = await request.json();

    const { providerId, accountName, apiKeyLastFour, prepaidBalance, currency, rateLimit, rateLimitTokens, integrationStatus } = body;

    if (!providerId) {
      return Response.json(
        { data: null, error: "Missing required field: providerId" },
        { status: 400 }
      );
    }

    const account = await db.orm.public.ApiAccount
      .include("provider")
      .create({
        userId: user.id,
        providerId,
        accountName: accountName ?? null,
        apiKeyLastFour: apiKeyLastFour ?? null,
        prepaidBalance: prepaidBalance ?? 0,
        currency: currency ?? "USD",
        rateLimit: rateLimit ?? null,
        rateLimitTokens: rateLimitTokens ?? null,
        integrationStatus: integrationStatus ?? "manual",
      });

    return Response.json({ data: account }, { status: 201 });
  } catch (error) {
    console.error("API Accounts POST error:", error);
    return Response.json(
      { data: null, error: "Failed to create API account" },
      { status: 500 }
    );
  }
}
