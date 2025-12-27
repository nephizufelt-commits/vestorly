"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Grant = {
  id: string
  company_id: string
  recipient_user_id: string
  granted_by_user_id: string
  opportunity_id: string
  equity_amount: number | null
  equity_unit: string | null // 'percent' | 'shares' | etc
  status: string
  created_at: string
}

export default function CapTablePage() {
  const params = useParams()
  const companyId = useMemo(() => {
    const raw = (params as any)?.id
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  }, [params])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [company, setCompany] = useState<any | null>(null)
  const [grants, setGrants] = useState<Grant[]>([])
  const [profilesById, setProfilesById] = useState<Record<string, any>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      if (!companyId) {
        setMessage("Missing company id.")
        setLoading(false)
        return
      }

      // Company info (for shares math)
      const { data: c, error: cErr } = await supabase
        .from("companies")
        .select("id,name,industry,website,fully_diluted_shares,authorized_shares")
        .eq("id", companyId)
        .single()

      if (cErr) {
        setMessage(cErr.message)
        setLoading(false)
        return
      }
      setCompany(c)

      // Signed grants only (cap table should reflect “real” ownership)
      const { data: g, error: gErr } = await supabase
        .from("equity_grants")
        .select("id,company_id,recipient_user_id,granted_by_user_id,opportunity_id,equity_amount,equity_unit,status,created_at")
        .eq("company_id", companyId)
        .in("status", ["signed"]) // if you later add 'active', add it here
        .order("created_at", { ascending: true })

      if (gErr) {
        setMessage(gErr.message)
        setLoading(false)
        return
      }

      const rows = (g ?? []) as Grant[]
      setGrants(rows)

      // Fetch recipient profiles for names (optional but nicer)
      const recipientIds = Array.from(new Set(rows.map((x) => x.recipient_user_id).filter(Boolean)))
      if (recipientIds.length) {
        const { data: ps, error: pErr } = await supabase
          .from("profiles")
          .select("id,full_name,legal_first_name,legal_last_name,email")
          .in("id", recipientIds)

        if (!pErr && ps) {
          const map: Record<string, any> = {}
          for (const p of ps) map[p.id] = p
          setProfilesById(map)
        }
      }

      setLoading(false)
    })()
  }, [companyId])

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  const fdShares = company?.fully_diluted_shares ? Number(company.fully_diluted_shares) : null

  // Aggregate by recipient
  const byRecipient: Record<
    string,
    { recipient_user_id: string; percentTotal: number; shareTotal: number; grants: Grant[] }
  > = {}

  let totalPercent = 0
  let totalShares = 0

  for (const g of grants) {
    const rid = g.recipient_user_id
    if (!byRecipient[rid]) byRecipient[rid] = { recipient_user_id: rid, percentTotal: 0, shareTotal: 0, grants: [] }
    byRecipient[rid].grants.push(g)

    const unit = (g.equity_unit ?? "").toLowerCase()
    const amt = Number(g.equity_amount ?? 0)

    if (unit === "percent" || unit === "%") {
      byRecipient[rid].percentTotal += amt
      totalPercent += amt
    } else if (unit === "shares" || unit === "share") {
      byRecipient[rid].shareTotal += amt
      totalShares += amt
    }
  }

  const rows = Object.values(byRecipient).sort((a, b) => b.percentTotal - a.percentTotal)

  const percentWarning = totalPercent > 100.0001
  const sharesPercentTotal =
    fdShares && fdShares > 0 ? (totalShares / fdShares) * 100 : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Cap Table</h1>
          <p className="text-sm text-gray-600">
            {company?.name ?? "Company"} · Signed grants only
          </p>
        </div>

        <div className="flex gap-4">
          <Link className="underline text-sm font-medium" href={`/dashboard/founder/company/${companyId}/kyb`}>
            KYB / Owners
          </Link>
          <Link className="underline text-sm font-medium" href="/dashboard/founder">
            Back
          </Link>
        </div>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <section className="grid sm:grid-cols-3 gap-4">
        <Card title="Signed grants" value={String(grants.length)} />
        <Card title="Total % granted" value={`${totalPercent.toFixed(4)}%`} />
        <Card title="Total shares granted" value={String(totalShares)} />
      </section>

      {percentWarning ? (
        <div className="text-sm border rounded p-3 bg-gray-50">
          ⚠ Your **percent** grants sum to <b>{totalPercent.toFixed(4)}%</b> (over 100%). That’s either dilution math you
          aren’t tracking, or you’re over-issuing.
        </div>
      ) : null}

      {fdShares ? (
        <div className="text-sm border rounded p-3 bg-gray-50">
          Fully diluted shares: <b>{fdShares}</b> · Shares-based grants imply about{" "}
          <b>{(sharesPercentTotal ?? 0).toFixed(4)}%</b> of FD ownership.
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          Note: set <b>companies.fully_diluted_shares</b> to compute % for share-based grants.
        </div>
      )}

      <section className="bg-white border rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Ownership by recipient</h2>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">No signed grants yet.</p>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b">Recipient</th>
                  <th className="text-left p-2 border-b">% total</th>
                  <th className="text-left p-2 border-b">Shares total</th>
                  <th className="text-left p-2 border-b">Implied % from shares</th>
                  <th className="text-left p-2 border-b">Grant count</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = profilesById[r.recipient_user_id]
                  const display =
                    p?.full_name ||
                    [p?.legal_first_name, p?.legal_last_name].filter(Boolean).join(" ") ||
                    p?.email ||
                    r.recipient_user_id

                  const impliedFromShares =
                    fdShares && fdShares > 0 ? (r.shareTotal / fdShares) * 100 : null

                  return (
                    <tr key={r.recipient_user_id} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border-b">{display}</td>
                      <td className="p-2 border-b">{r.percentTotal.toFixed(4)}%</td>
                      <td className="p-2 border-b">{r.shareTotal}</td>
                      <td className="p-2 border-b">
                        {impliedFromShares === null ? "—" : `${impliedFromShares.toFixed(4)}%`}
                      </td>
                      <td className="p-2 border-b">{r.grants.length}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Signed grants (raw)</h2>

        {grants.length === 0 ? (
          <p className="text-sm text-gray-600">No signed grants yet.</p>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b">Grant</th>
                  <th className="text-left p-2 border-b">Recipient</th>
                  <th className="text-left p-2 border-b">Amount</th>
                  <th className="text-left p-2 border-b">Unit</th>
                  <th className="text-left p-2 border-b">Status</th>
                  <th className="text-left p-2 border-b">Created</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">{String(g.id).slice(0, 8)}</td>
                    <td className="p-2 border-b">{profilesById[g.recipient_user_id]?.full_name ?? g.recipient_user_id}</td>
                    <td className="p-2 border-b">{g.equity_amount ?? "—"}</td>
                    <td className="p-2 border-b">{g.equity_unit ?? "—"}</td>
                    <td className="p-2 border-b">{g.status}</td>
                    <td className="p-2 border-b">{new Date(g.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}
