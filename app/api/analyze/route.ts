import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import os from "os"; // 1. Add this import at the top

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;

    if (!videoFile) return NextResponse.json({ error: "No video found" }, { status: 400 });

    // 2. USE os.tmpdir() instead of "/tmp"
    // This will point to C:\Users\YourName\AppData\Local\Temp on Windows
    // and /tmp on Linux/Vercel.
    const tempPath = path.join(os.tmpdir(), videoFile.name); 
    
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);

    console.log("Uploading to Google AI servers...");
    
    // 3. Upload to Google's File Manager
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: videoFile.type,
      displayName: videoFile.name,
    });

    // 4. "Polling" Logic: Wait for the AI to finish processing the video
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === FileState.PROCESSING) {
      console.log("AI is processing the video...");
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === FileState.FAILED) {
      throw new Error("Video processing failed on Google's end.");
    }

    // 5. The Analysis: Tell the AI exactly what to look for
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
      You are an expert gym coach. Analyze this video and:
      1. Identify the exercise.
      2. Give a grade from A (perfect) to F (dangerous).
      3. Provide 3 short, actionable tips to improve form.
      
      Return ONLY a raw JSON object with this exact structure:
      {
        "exercise": "string",
        "grade": "string",
        "feedback": ["tip 1", "tip 2", "tip 3"]
      }
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri,
        },
      },
      { text: prompt },
    ]);

    // Cleanup: Delete the local temp file to keep the server clean
    fs.unlinkSync(tempPath);

    // 6. Parse the AI response and send it back to your Frontend
    const textResponse = result.response.text();
    // Clean up any markdown code blocks Gemini might include
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const aiData = JSON.parse(cleanJson);

    return NextResponse.json(aiData);

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}