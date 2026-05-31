import { NextRequest, NextResponse } from "next/server";
import { readCuratedSnapshot, refreshCuratedSnapshot } from "@/lib/curated-cache";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    // In local/dev environments, allow invocation when secret is not configured yet.
    return true;
  }

  const header = request.headers.get("authorization");
  const tokenFromHeader = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const tokenFromQuery = request.nextUrl.searchParams.get("secret");
  const token = tokenFromHeader ?? tokenFromQuery;
  return token === configuredSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await refreshCuratedSnapshot();
    return NextResponse.json({
      ok: true,
      refreshedAt: snapshot.updatedAt,
      count: snapshot.albums.length
    });
  } catch (error) {
    const stale = await readCuratedSnapshot();
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown refresh error",
        staleUpdatedAt: stale?.updatedAt ?? null,
        staleCount: stale?.albums.length ?? 0
      },
      { status: 500 }
    );
  }
}

export const POST = GET;
