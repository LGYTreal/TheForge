import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image." },
        { status: 400 }
      );
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 10MB." },
        { status: 400 }
      );
    }

    const buffer = await image.arrayBuffer();

    const base64 = Buffer.from(buffer).toString("base64");

    const body = new URLSearchParams();

    body.append("key", process.env.IMGBB_API_KEY || "");
    body.append("image", base64);

    const response = await fetch(
      "https://api.imgbb.com/1/upload",
      {
        method: "POST",
        body,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          error: data.error?.message || "ImgBB upload failed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.data.display_url,
      deleteUrl: data.data.delete_url,
    });
  } catch (error) {
    console.error("Image upload error:", error);

    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}