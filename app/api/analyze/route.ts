import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Extract the file from the request
    const formData = await request.formData();
    const video = formData.get("video") as File;

    if (!video) {
      return NextResponse.json({ error: "No video found" }, { status: 400 });
    }

    // 2. Log it to your computer's terminal (not the browser)
    console.log("Success! Received file:", video.name);

    // 3. Send a "Success" message back to the UI
    return NextResponse.json({
      message: "Connection Successful!",
      filename: video.name,
      status: "Ready for Phase 2: Gemini Integration"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}