import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { ok: true, message: "DocuSign webhook disabled in production" },
    { status: 200 }
  )
}
