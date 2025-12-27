"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function FounderGrantsPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [grants, setGrants] = useState<any[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)

  // recipient_user_id -> ready?
  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({})
  // company_id -> ready?
  const [companyReadyMap, setCompanyReadyMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      const { data, error } = await supabase
        .from("equity_grants")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      const rows = data ?? []
      setGrants(rows)

      // ---------- Provider readiness ----------
      const recipientIds = Array.from(
        new Set(rows.map((x: any) => x.recipient_user_id).filter(Boolean))
      ) as string[]

      if (recipientIds.length) {
        const entries = await Promise.all(
          recipientIds.map(async (uid) => {
            const { data: ready, error: rErr } = await supabase.rpc(
              "profile_ready_for_agreement",
              { uid }
            )
            if (rErr) {
              console.log("profile_ready_for_agreement RPC error:", rErr)
              return [uid, false] as const
            }
            return [uid, Boolean(ready)] as const
          })
        )

        const map: Record<string, boolean> = {}
        for (const [uid, ready] of entries) map[uid] = ready
        setReadyMap(map)
      } else {
        setReadyMap({})
      }

      // ---------- Company readiness ----------
      const companyIds = Array.from(
        new Set(rows.map((x: any) => x.company_id).filter(Boolean))
      ) as string[]

      if (companyIds.length) {
        const entries2 = await Promise.all(
          companyIds.map(async (cid) => {
            const { data: ready, error: rErr } = await supabase.rpc(
              "company_ready_for_agreement",
              { cid }
            )
            if (rErr) {
              console.log("company_ready_for_agreement RPC error:", rErr)
              return [cid, false] as const
            }
            return [cid, Boolean(ready)] as const
          })
        )

        const map2: Record<string, boolean> = {}
        for (const [cid, ready] of entries2) map2[cid] = ready
        setCompanyReadyMap(map2)
      } else {
        setCompanyReadyMap({})
      }

      setLoading(false)
    })()
  }, [])

  async function sendAgreement(grant: any) {
  setMessage(null)
  setSendingId(grant.id)

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error("Not signed in.")

    const res = await fetch("/api/grants/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ grantId: grant.id }),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json?.error ?? "Failed to send agreement")

    setGrants((prev) =>
      prev.map((g) =>
        g.id === grant.id
          ? { ...g, status: "sent", agreement_url: json.agreementUrl }
          : g
      )
    )

    setMessage("Agreement sent (server-side).")
  } catch (err: any) {
    setMessage(err?.message ?? "Something went wrong.")
  } finally {
    setSendingId(null)
  }
}


  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Equity Grants</h1>
          <p className="text-sm text-gray-600">
            Drafts and sent agreements (sending is gated by provider + company KYB readiness).
          </p>
        </div>
        <Link className="underline text-sm font-medium" href="/dashboard/founder">
          Back to dashboard
        </Link>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      {grants.length === 0 ? (
        <p className="text-sm text-gray-600">No grants yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {grants.map((g) => {
            const recipientId = g.recipient_user_id as string
            const recipientReady = readyMap[recipientId] ?? false

            const cid = g.company_id as string
            const companyReady = companyReadyMap[cid] ?? false

            const canSend = g.status === "draft" && recipientReady && companyReady

            const disabledReason =
              !recipientReady
                ? "Provider profile missing legal/address info required for agreement."
                : !companyReady
                ? "Company KYB incomplete (needs control person + beneficial owner)."
                : undefined

            return (
              <div key={g.id} className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <div className="font-semibold">Grant #{String(g.id).slice(0, 8)}</div>
                    <div className="text-sm text-gray-600">
                      Status: {g.status} · {g.equity_amount ?? "?"} {g.equity_unit ?? ""}
                    </div>
                    <div className="text-sm text-gray-600">
                      Recipient: {g.recipient_user_id} · Opportunity: {g.opportunity_id}
                    </div>

                    <div className="text-sm">
                      Agreement:{" "}
                      {g.agreement_url ? (
                        <a className="underline" href={g.agreement_url} target="_blank">
                          Open
                        </a>
                      ) : (
                        <span className="text-gray-600">Not generated yet</span>
                      )}
                    </div>

                    {g.status === "draft" && !recipientReady ? (
                      <div className="text-xs text-gray-600">
                        Cannot send: provider profile missing required legal/address fields.
                      </div>
                    ) : null}

                    {g.status === "draft" && !companyReady ? (
                      <div className="text-xs text-gray-600">
                        Cannot send: company KYB incomplete (needs control person + beneficial owner).
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={() => sendAgreement(g)}
                    disabled={sendingId === g.id || !canSend}
                    title={!canSend ? disabledReason : undefined}
                    className="bg-black text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    {g.status !== "draft"
                      ? "Sent"
                      : sendingId === g.id
                      ? "Sending..."
                      : recipientReady && companyReady
                      ? "Send agreement"
                      : "Not ready"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
