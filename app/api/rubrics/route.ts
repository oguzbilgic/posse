import { NextRequest, NextResponse } from "next/server";
import { listRubrics, createRubric } from "../../../lib/rubrics-store";

export async function GET() {
  return NextResponse.json({ data: listRubrics() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.instructions) {
    return NextResponse.json({ error: "name and instructions are required" }, { status: 400 });
  }
  const rubric = createRubric({
    name: body.name,
    description: body.description,
    instructions: body.instructions,
    criteria: Array.isArray(body.criteria) ? body.criteria : [],
  });
  return NextResponse.json(rubric, { status: 201 });
}
