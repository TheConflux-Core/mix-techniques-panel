import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_judge } = body;

    if (typeof is_judge !== "boolean") {
      return NextResponse.json(
        { error: "is_judge must be a boolean" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS for admin operations
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .update({ is_judge })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (err: unknown) {
    console.error("User PATCH error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
