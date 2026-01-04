"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function FounderGrantsPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [grants, setGrants] = useState<any[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)

  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({})
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

      const recipientIds = Array.from(
        new Set(rows.map((x: any) => x.recipient_user_id).filter(Boolean))
      ) as string[]

      if (recipientIds.length) {
        const entries = await Promise.all(
          recipientIds.map(async (uid) => {
            const { data: ready } = await supabase.rpc(
              "profile_ready_for_agreement",
              { uid }
            )
            return [uid, Boolean(ready)] as const
          })
        )

        const map: Record<string, boolean> = {}
        for (const [uid, ready] of entries) map[uid] = ready
        setReadyMap(map)
      }

      const companyIds = Array.from(
        new Set(rows.map((x: any) => x.company_id).filter(Boolean))
      ) as string[]

      if (companyIds.length) {
        const entries2 = await Promise.all(
          companyIds.map(async (cid) => {
            const { data: ready } = await supabase.rpc(
              "company_ready_for_agreement",
              { cid }
            )
            return [cid, Boolean(ready)] as const
          })
        )

        const map2: Record<string, boolean> = {}
        for (const [cid, ready] of entries2) map2[cid] = ready
        setCompanyReadyMap(map2)
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

      setMessage("Agreement sent successfully.")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setSendingId(null)
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  return (
    <div className="bg-soft/40">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              Equity Grants
            </h1>
            <p className="text-sm text-muted">
              Draft and sent agreements. Sending is gated by provider + company readiness.
            </p>
          </div>

          <Link
            href="/dashboard/founder"
            className="text-sm font-medium text-primary hover:underline"
          >
            Back
          </Link>
        </div>

        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}

        {grants.length === 0 ? (
          <p className="text-sm text-muted">No grants yet.</p>
        ) : (
          <div className="space-y-4">
            {grants.map((g) => {
              const recipientReady = readyMap[g.recipient_user_id] ?? false
              const companyReady = companyReadyMap[g.company_id] ?? false

              const canSend =
                g.status === "draft" && recipientReady && companyReady

              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-soft bg-white p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-1">
                      <div className="font-semibold text-text">
                        Grant #{String(g.id).slice(0, 8)}
                      </div>

                      <div className="text-sm text-muted">
                        {g.equity_amount ?? "?"} {g.equity_unit ?? ""} · Status: {g.status}
                      </div>

                      <div className="text-xs text-muted">
                        Recipient: {g.recipient_user_id}
                      </div>
                    </div>

                    <button
                      onClick={() => sendAgreement(g)}
                      disabled={!canSend || sendingId === g.id}
                      className="
                        rounded-md
                        bg-primary
                        px-4 py-2
                        text-sm font-semibold text-white
                        hover:opacity-90
                        disabled:opacity-50
                      "
                      title={
                        !recipientReady
                          ? "Provider profile incomplete"
                          : !companyReady
                          ? "Company KYB incomplete"
                          : undefined
                      }
                    >
                      {g.status !== "draft"
                        ? "Sent"
                        : sendingId === g.id
                        ? "Sending…"
                        : canSend
                        ? "Send agreement"
                        : "Not ready"}
                    </button>
                  </div>

                  {/* Readiness indicators */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Readiness
                      label="Provider profile"
                      ready={recipientReady}
                    />
                    <Readiness
                      label="Company KYB"
                      ready={companyReady}
                    />
                  </div>

                  <div className="text-sm">
                    Agreement:{" "}
                    {g.agreement_url ? (
                      <a
                        className="text-primary underline"
                        href={g.agreement_url}
                        target="_blank"
                      >
                        Open agreement
                      </a>
                    ) : (
                      <span className="text-muted">Not generated yet</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Readiness({
  label,
  ready,
}: {
  label: string
  ready: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        ready
          ? "border-accent bg-accentSoft text-text"
          : "border-soft bg-soft text-muted"
      }`}
    >
      <span className="font-medium">{label}:</span>{" "}
      {ready ? "Ready" : "Incomplete"}
    </div>
  )
}
