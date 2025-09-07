import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Parse incoming FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null; // File object keeps name & type
    const token = formData.get("token") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json(
        { error: "No access token provided" },
        { status: 401 }
      );
    }

    // Use the filename from the uploaded file
    const metadata = {
      name: file.name, 
      mimeType: file.type || "audio/webm",
    };

    // Build multipart request safely with FormData
    const googleForm = new FormData();
    googleForm.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    googleForm.append("file", file);

    // Upload to Google Drive
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: googleForm,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || "Google Drive upload failed",
          details: data,
        },
        { status: res.status }
      );
    }

    // ✅ Success response
    return NextResponse.json({ success: true, file: data });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}
