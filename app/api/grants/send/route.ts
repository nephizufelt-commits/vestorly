import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const grantId = body?.grantId as string | undefined
    if (!grantId) return NextResponse.json({ error: "Missing grantId" }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 })
    }

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) return NextResponse.json({ error: `Auth error: ${userErr.message}` }, { status: 401 })
    const actorUserId = userData.user?.id
    if (!actorUserId) return NextResponse.json({ error: "Unable to identify user." }, { status: 401 })

    const { data: grant, error: gErr } = await supabase
      .from("equity_grants")
      .select("*")
      .eq("id", grantId)
      .single()

    if (gErr) return NextResponse.json({ error: `Load grant failed: ${gErr.message}` }, { status: 400 })
    if (!grant) return NextResponse.json({ error: "Grant not found" }, { status: 404 })

    if (grant.status !== "draft") {
      return NextResponse.json({ error: `Grant is not draft (status=${grant.status})` }, { status: 400 })
    }

    const { data: providerReady, error: prErr } = await supabase.rpc("profile_ready_for_agreement", {
      uid: grant.recipient_user_id,
    })
    if (prErr) return NextResponse.json({ error: `Provider gate RPC failed: ${prErr.message}` }, { status: 400 })

    const { data: companyReady, error: crErr } = await supabase.rpc("company_ready_for_agreement", {
      cid: grant.company_id,
    })
    if (crErr) return NextResponse.json({ error: `Company gate RPC failed: ${crErr.message}` }, { status: 400 })

    if (!providerReady) return NextResponse.json({ error: "Provider profile not ready for agreement" }, { status: 400 })
    if (!companyReady) return NextResponse.json({ error: "Company KYB not ready for agreement" }, { status: 400 })

    const agreementUrl = `https://example.com/agreement/${grant.id}`

    // IMPORTANT: select() so we can see what actually changed
    const { data: updated, error: updErr } = await supabase
      .from("equity_grants")
      .update({
        status: "sent",
        agreement_provider: grant.agreement_provider ?? "docusign",
        agreement_url: agreementUrl,
      })
      .eq("id", grant.id)
      .select("*")
      .single()

    if (updErr) {
      return NextResponse.json({ error: `Grant update failed: ${updErr.message}` }, { status: 400 })
    }

    // If update returned no row, RLS blocked it
    if (!updated) {
      return NextResponse.json(
        { error: "Grant update returned no row. Likely blocked by RLS (UPDATE policy)." },
        { status: 400 }
      )
    }

    const { error: auditErr } = await supabase.from("audit_events").insert({
      actor_user_id: actorUserId,
      company_id: updated.company_id,
      entity_type: "equity_grant",
      entity_id: updated.id,
      event_type: "agreement_sent",
      metadata: { agreement_url: agreementUrl },
    })

    if (auditErr) {
      return NextResponse.json({ error: `Audit insert failed: ${auditErr.message}` }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      agreementUrl,
      updatedStatus: updated.status,
      updatedAgreementUrl: updated.agreement_url,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 })
  }
}
