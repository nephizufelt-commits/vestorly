"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ProviderGrantDetailPage() {
  const params = useParams()
  const grantId = useMemo(() => {
    const raw = (params as any)?.id
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  }, [params])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [grant, setGrant] = useState<any | null>(null)
  const [company, setCompany] = useState<any | null>(null)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      if (!grantId) {
        setMessage("Missing grant id.")
        setLoading(false)
        return
      }

      const { data: g, error: gErr } = await supabase
        .from("equity_grants")
        .select("*")
        .eq("id", grantId)
        .single()

      if (gErr) {
        setMessage(gErr.message)
        setLoading(false)
        return
      }

      setGrant(g)

      if (g?.company_id) {
        const { data: c } = await supabase
          .from("companies")
          .select("id,name,website,industry")
          .eq("id", g.company_id)
          .single()

        if (c) setCompany(c)
      }

      setLoading(false)
    })()
  }, [grantId])

  async function markSigned() {
    setMessage(null)
    setSigning(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Not signed in.")

      const res = await fetch("/api/grants/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grantId }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Failed to mark signed")

      setGrant((prev: any) => (prev ? { ...prev, status: "signed" } : prev))
      setMessage("Agreement signed and recorded.")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted">Loading…</div>
  }

  if (!grant) {
    return (
      <div className="max-w-xl mx-auto px-6 py-10 space-y-4">
        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}
        <Link className="underline text-sm" href="/dashboard/provider">
          Back to provider dashboard
        </Link>
      </div>
    )
  }

  const canSign = grant.status === "sent" && Boolean(grant.agreement_url)

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text">
            Equity Agreement
          </h1>
          <p className="text-sm text-muted">
            Grant #{String(grant.id).slice(0, 8)}
            {company?.name ? ` · ${company.name}` : ""}
            {company?.industry ? ` · ${company.industry}` : ""}
          </p>
        </div>

        <Link className="text-sm font-medium text-text hover:underline" href="/dashboard/provider">
          Back
        </Link>
      </div>

      {message && (
        <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
          {message}
        </div>
      )}

      {/* Equity Details */}
      <section className="rounded-lg border border-soft bg-white p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Equity Allocation
        </h2>

        <div className="rounded-md bg-accentSoft p-4">
          <div className="text-3xl font-semibold text-primary">
            {grant.equity_amount ?? "?"}{grant.equity_unit ? "%" : ""}
          </div>
          <p className="mt-1 text-sm text-text">
            Ownership in {company?.name ?? "the company"}
          </p>
        </div>

        {grant.vesting_terms && (
          <div className="text-sm text-muted">
            Vesting: {grant.vesting_terms}
          </div>
        )}
      </section>

      {/* Agreement */}
      <section className="rounded-lg border border-soft bg-white p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Agreement
        </h2>

        {grant.agreement_url ? (
          <a
            className="inline-block text-sm font-medium text-primary hover:underline"
            href={grant.agreement_url}
            target="_blank"
          >
            Open agreement document
          </a>
        ) : (
          <p className="text-sm text-muted">
            Agreement not sent yet.
          </p>
        )}

        <div className="pt-4 border-t border-soft">
          <button
            onClick={markSigned}
            disabled={!canSign || signing}
            className={`w-full sm:w-auto rounded-md px-6 py-3 text-sm font-semibold transition
              ${
                canSign
                  ? "bg-primary text-white hover:opacity-90"
                  : "bg-soft text-muted cursor-not-allowed"
              }`}
            title={!canSign ? "You can only sign after the agreement is sent." : undefined}
          >
            {grant.status === "signed"
              ? "Signed"
              : signing
              ? "Signing…"
              : "Sign Agreement"}
          </button>

          {!canSign && (
            <p className="mt-2 text-xs text-muted">
              You can sign once the agreement has been sent.
            </p>
          )}
        </div>

        <p className="text-xs text-muted">
          MVP note: Signing is currently recorded as an attestation. Final versions will be signed via an integrated agreement provider.
        </p>
      </section>
    </div>
  )
}
