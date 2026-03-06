import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

type Params = {
  params: {
    name: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const safeName = params.name.replace(/[^a-zA-Z0-9_.-]/g, "");
    const filePath = path.join(process.cwd(), "doc", safeName);
    const content = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(content);
    return NextResponse.json(json);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}

