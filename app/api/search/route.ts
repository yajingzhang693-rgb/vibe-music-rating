import { NextRequest, NextResponse } from "next/server";
import { searchArtists } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ artists: [] });
  }

  try {
    const artists = await searchArtists(query, 5);
    return NextResponse.json({
      artists: artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images[0]?.url ?? null,
        genres: artist.genres,
        popularity: artist.popularity
      }))
    });
  } catch (error) {
    console.error("Spotify search failed:", error);
    return NextResponse.json({ artists: [], error: "Spotify search failed" }, { status: 500 });
  }
}
