import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const DEMO_USER_ID = "user_demo_001";

// GET /api/api-accounts — List all API accounts with provider info
export async function GET(_request: NextRequest) {
  try {
    const accounts = await prisma.apiAccount.findMany({
      where: { userId: DEMO_USER_ID },
      include: { provider: true },
      orderBy: { createdAt: "desc" },
    });

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
    const body = await request.json();

    const { providerId, accountName, apiKeyLastFour, prepaidBalance, currency, rateLimit, rateLimitTokens, integrationStatus } = body;

    if (!providerId) {
      return Response.json(
        { data: null, error: "Missing required field: providerId" },
        { status: 400 }
      );
    }

    const account = await prisma.apiAccount.create({
      data: {
        userId: DEMO_USER_ID,
        providerId,
        accountName: accountName ?? null,
        apiKeyLastFour: apiKeyLastFour ?? null,
        prepaidBalance: prepaidBalance ?? 0,
        currency: currency ?? "USD",
        rateLimit: rateLimit ?? null,
        rateLimitTokens: rateLimitTokens ?? null,
        integrationStatus: integrationStatus ?? "manual",
      },
      include: { provider: true },
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
