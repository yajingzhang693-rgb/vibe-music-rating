import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

type Context = {
  params: { albumId: string };
};

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const albumId = params.albumId;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("ratings").select("main_score").eq("album_id", albumId);
    if (error) {
      console.error("Supabase Error details:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ average: null, count: 0 });
    }
    const average = data.reduce((sum, row) => sum + Number(row.main_score ?? 0), 0) / data.length;
    return NextResponse.json({ average: Number(average.toFixed(1)), count: data.length });
  } catch (error) {
    console.error("GET /api/ratings/[albumId] failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
