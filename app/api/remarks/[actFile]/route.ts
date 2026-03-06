import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

type RemarksDoc = {
  actFile: string;
  updatedAt: string;
  remarksBySectionId: Record<string, string>;
};

type Params = { params: { actFile: string } };

function safeActFileName(input: string) {
  const cleaned = input.replace(/[^a-zA-Z0-9_.-]/g, "");
  // Keep it predictable + prevent path traversal
  return cleaned.endsWith(".json") ? cleaned : `${cleaned}.json`;
}

function remarksPathname(actFile: string) {
  return `remarks/${actFile}.remarks.json`;
}

async function readRemarksFromBlob(pathname: string): Promise<RemarksDoc | null> {
  const { blobs } = await list({ prefix: pathname, limit: 5 });
  const match = blobs.find((b) => b.pathname === pathname);
  if (!match) return null;

  const res = await fetch(match.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as RemarksDoc;
}

export async function GET(_request: Request, { params }: Params) {
  const actFile = safeActFileName(params.actFile);
  const pathname = remarksPathname(actFile);

  try {
    const doc = await readRemarksFromBlob(pathname);
    if (!doc) {
      return NextResponse.json({
        actFile,
        updatedAt: new Date(0).toISOString(),
        remarksBySectionId: {}
      } satisfies RemarksDoc);
    }
    return NextResponse.json(doc);
  } catch (error) {
    console.error("Error reading remarks from Blob:", error);
    return NextResponse.json(
      {
        actFile,
        updatedAt: new Date(0).toISOString(),
        remarksBySectionId: {}
      } satisfies RemarksDoc,
      { status: 200 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const actFile = safeActFileName(params.actFile);
  const pathname = remarksPathname(actFile);

  const requiredKey = process.env.ADMIN_KEY;
  if (requiredKey) {
    const provided = request.headers.get("x-admin-key");
    if (!provided || provided !== requiredKey) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    const body = (await request.json()) as Partial<RemarksDoc>;
    const remarksBySectionId =
      typeof body.remarksBySectionId === "object" && body.remarksBySectionId
        ? Object.fromEntries(
            Object.entries(body.remarksBySectionId).map(([k, v]) => [
              String(k),
              String(v ?? "")
            ])
          )
        : {};

    const doc: RemarksDoc = {
      actFile,
      updatedAt: new Date().toISOString(),
      remarksBySectionId
    };

    await put(pathname, JSON.stringify(doc, null, 2), {
      contentType: "application/json",
      addRandomSuffix: false
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Error saving remarks to Blob:", error);
    return new NextResponse("Failed to save", { status: 500 });
  }
}

