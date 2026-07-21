import { NextRequest, NextResponse } from "next/server";
import { getRubric, updateRubric, archiveRubric } from "../../../../lib/rubrics-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rubric = getRubric(id);
  if (!rubric) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rubric);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const rubric = updateRubric(id, body);
  if (!rubric) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rubric);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rubric = archiveRubric(id);
  if (!rubric) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rubric);
}
