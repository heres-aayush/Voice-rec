import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
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

    const searchQuery = encodeURIComponent(
      "name = 'voice-recorder' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const searchData = await searchRes.json();

    let folderId: string | null = null;
    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    } else {
      const folderMetadata = {
        name: "voice-recorder",
        mimeType: "application/vnd.google-apps.folder",
      };

      const folderRes = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(folderMetadata),
        }
      );

      const folderData = await folderRes.json();
      if (!folderRes.ok) {
        return NextResponse.json(
          {
            error:
              folderData.error?.message || "Could not create or find folder",
            details: folderData,
          },
          { status: folderRes.status }
        );
      }

      folderId = folderData.id;
    }

    const metadata = {
      name: file.name,
      mimeType: file.type || "audio/webm",
      parents: folderId ? [folderId] : undefined,
    };

    const googleForm = new FormData();
    googleForm.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    googleForm.append("file", file);

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

    return NextResponse.json({ success: true, file: data });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}
