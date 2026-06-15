import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("submissions")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("status", "selected")
      .select();

    if (error) {
      console.error("Reset pool error:", error);
      return NextResponse.json(
        { error: "Failed to reset pool" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reset_count: data?.length || 0,
      message: `${data?.length || 0} submission${(data?.length || 0) !== 1 ? "s" : ""} returned to pool`,
    });
  } catch (err: any) {
    console.error("Reset pool error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
