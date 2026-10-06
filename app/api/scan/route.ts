import { NextRequest, NextResponse } from "next/server";
import { analyzeCode } from "../../../lib/analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputText = typeof body.inputText === "string" ? body.inputText : "";
    const projectName = typeof body.projectName === "string" ? body.projectName : "Untitled Project";

    if (!inputText.trim()) {
      return NextResponse.json({ error: "Paste some code before scanning." }, { status: 400 });
    }

    if (inputText.length > 120_000) {
      return NextResponse.json({ error: "Please keep snippets under 120,000 characters for this MVP." }, { status: 413 });
    }

    return NextResponse.json(analyzeCode(inputText, projectName));
  } catch {
    return NextResponse.json({ error: "Could not parse scan request." }, { status: 400 });
  }
}
