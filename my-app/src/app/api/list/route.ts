import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "No access token provided" }, { status: 401 });
    }

    const folderQuery = encodeURIComponent(
      "name = 'voice-recorder' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );

    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const folderData = await folderRes.json();

    if (!folderRes.ok || !folderData.files?.length) {
      return NextResponse.json({ files: [] }); 
    }

    const folderId = folderData.files[0].id;

    const filesQuery = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const filesRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${filesQuery}&orderBy=createdTime desc&fields=files(id,name,createdTime,mimeType,webContentLink,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const filesData = await filesRes.json();

    if (!filesRes.ok) {
      return NextResponse.json(
        { error: filesData.error?.message || "Failed to fetch files", details: filesData },
        { status: filesRes.status }
      );
    }

    return NextResponse.json({ files: filesData.files || [] });
  } catch (err: any) {
    console.error("List error:", err);
    return NextResponse.json({ error: "Unexpected server error", details: err.message }, { status: 500 });
  }
}
