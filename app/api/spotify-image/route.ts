import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "i.scdn.co") {
    return NextResponse.json({ error: "Unsupported image host" }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    cache: "force-cache",
    next: { revalidate: 3600 }
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
    }
  });
}
