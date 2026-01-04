import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createSupabaseAdmin } from "@/lib/supabase-server"

// 🔒 Prevent build-time execution
export const dynamic = "force-dynamic"

// ------------------------
// Utility: timing-safe compare
// ------------------------
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// ------------------------
// Verify DocuSign signature
// ------------------------
function verifySignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false

  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET
  if (!secret) return false

  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64")

  return safeEqual(computedSignature, signatureHeader)
}

// ------------------------
// POST handler
// ------------------------
export async function POST(req: NextRequest) {
  // 🚧 Feature gate: DocuSign not enabled yet
  if (!process.env.DOCUSIGN_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "DocuSign webhook not enabled" },
      { status: 410 }
    )
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Server not configured for webhook" },
      { status: 500 }
    )
  }

  const supabaseAdmin = createSupabaseAdmin()

  try {
    // 1️⃣ Read raw body FIRST
    const rawBody = await req.text()

    // 2️⃣ Verify signature BEFORE parsing JSON
    const signatureHeader = req.headers.get("x-docusign-signature")
    const isValid = verifySignature(rawBody, signatureHeader)

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      )
    }

    // 3️⃣ Parse payload
    const payload = JSON.parse(rawBody)
    const { event, external_grant_id: grantId, provider } = payload ?? {}

    if (event !== "agreement_signed") {
      return NextResponse.json(
        { error: "Unhandled event type" },
        { status: 400 }
      )
    }

    if (!grantId || provider !== "docusign") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      )
    }

    // 4️⃣ Load grant
    const { data: grant, error } = await supabaseAdmin
      .from("equity_grants")
      .select("id, status, agreement_provider")
      .eq("id", grantId)
      .single()

    if (error || !grant) {
      return NextResponse.json(
        { error: "Grant not found" },
        { status: 404 }
      )
    }

    // 5️⃣ Idempotency
    if (grant.status === "signed") {
      return NextResponse.json({ ok: true })
    }

    // 6️⃣ Provider guard
    if (grant.agreement_provider !== "docusign") {
      return NextResponse.json(
        { error: "Provider mismatch" },
        { status: 409 }
      )
    }

    // 7️⃣ Delegate signing to DB logic
    const { error: signError } = await supabaseAdmin.rpc("sign_grant", {
      p_grant_id: grantId,
    })

    if (signError) {
      console.error("sign_grant failed:", signError.message)
      // Do NOT retry — webhook providers will retry automatically
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DocuSign webhook error:", err)
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  }
}
