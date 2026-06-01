import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

type RatingPayload = {
  album_id: string;
  main_score: number;
  production_score: number;
  writing_score: number;
  comment: string;
  device_id: string;
  album_name?: string;
  cover_url?: string | null;
  artist_name?: string;
  release_date?: string | null;
  artists?: Array<{ id: string; name: string }>;
  tracks?: Array<{ id: string | null; name: string; duration_ms: number; track_number: number }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RatingPayload>;
    if (!body.album_id || !body.device_id) {
      return NextResponse.json({ error: "album_id and device_id are required" }, { status: 400 });
    }
    if (!body.album_name || !body.artist_name) {
      return NextResponse.json({ error: "album_name and artist_name are required before rating upsert" }, { status: 400 });
    }

    const payload: RatingPayload = {
      album_id: String(body.album_id),
      main_score: Number(body.main_score ?? 0),
      production_score: Number(body.production_score ?? 0),
      writing_score: Number(body.writing_score ?? 0),
      comment: String(body.comment ?? ""),
      device_id: String(body.device_id)
    };

    const supabase = getSupabaseServerClient();
    const albumUpsertPayload = {
      spotify_id: payload.album_id,
      name: String(body.album_name),
      cover_url: body.cover_url ? String(body.cover_url) : null,
      artist_name: String(body.artist_name),
      artists: Array.isArray(body.artists) ? body.artists : [],
      release_date: body.release_date ? String(body.release_date) : null,
      tracks: Array.isArray(body.tracks) ? body.tracks : [],
      updated_at: new Date().toISOString()
    };
    const { error: albumUpsertError } = await supabase.from("albums").upsert(albumUpsertPayload, { onConflict: "spotify_id" });
    if (albumUpsertError) {
      console.error("Supabase Error details:", albumUpsertError);
      return NextResponse.json({ error: albumUpsertError.message }, { status: 500 });
    }

    const { error } = await supabase.from("ratings").upsert(payload, { onConflict: "album_id,device_id" });
    if (error) {
      console.error("Supabase Error details:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/ratings failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
