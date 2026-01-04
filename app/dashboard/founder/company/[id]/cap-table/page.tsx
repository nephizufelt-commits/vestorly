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
  equity_unit: string | null
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

      const { data: g, error: gErr } = await supabase
        .from("equity_grants")
        .select("id,company_id,recipient_user_id,granted_by_user_id,opportunity_id,equity_amount,equity_unit,status,created_at")
        .eq("company_id", companyId)
        .in("status", ["signed"])
        .order("created_at", { ascending: true })

      if (gErr) {
        setMessage(gErr.message)
        setLoading(false)
        return
      }

      const rows = (g ?? []) as Grant[]
      setGrants(rows)

      const recipientIds = Array.from(
        new Set(rows.map((x) => x.recipient_user_id).filter(Boolean))
      )
      if (recipientIds.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id,full_name,legal_first_name,legal_last_name,email")
          .in("id", recipientIds)

        if (ps) {
          const map: Record<string, any> = {}
          for (const p of ps) map[p.id] = p
          setProfilesById(map)
        }
      }

      setLoading(false)
    })()
  }, [companyId])

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  const fdShares = company?.fully_diluted_shares
    ? Number(company.fully_diluted_shares)
    : null

  const byRecipient: Record<
    string,
    { recipient_user_id: string; percentTotal: number; shareTotal: number; grants: Grant[] }
  > = {}

  let totalPercent = 0
  let totalShares = 0

  for (const g of grants) {
    const rid = g.recipient_user_id
    if (!byRecipient[rid])
      byRecipient[rid] = { recipient_user_id: rid, percentTotal: 0, shareTotal: 0, grants: [] }

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
    <div className="bg-soft/40">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-text">Cap Table</h1>
            <p className="text-sm text-muted">
              {company?.name ?? "Company"} · Signed grants only
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              className="text-sm font-medium text-primary hover:underline"
              href={`/dashboard/founder/company/${companyId}/kyb`}
            >
              KYB / Owners
            </Link>
            <Link
              className="text-sm font-medium text-primary hover:underline"
              href="/dashboard/founder"
            >
              Back
            </Link>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}

        {/* Summary Cards */}
        <section className="grid sm:grid-cols-3 gap-4">
          <MetricCard title="Signed grants" value={String(grants.length)} />
          <MetricCard title="Total % granted" value={`${totalPercent.toFixed(4)}%`} />
          <MetricCard title="Total shares granted" value={String(totalShares)} />
        </section>

        {/* Warnings */}
        {percentWarning && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            ⚠ Percent-based grants sum to <b>{totalPercent.toFixed(4)}%</b> (over 100%).
            This may indicate dilution or over-issuance.
          </div>
        )}

        {fdShares ? (
          <div className="rounded-lg border border-soft bg-white p-4 text-sm text-text">
            Fully diluted shares: <b>{fdShares}</b> · Share-based grants imply{" "}
            <b>{(sharesPercentTotal ?? 0).toFixed(4)}%</b> ownership.
          </div>
        ) : (
          <div className="text-sm text-muted">
            Set <b>companies.fully_diluted_shares</b> to compute % from shares.
          </div>
        )}

        {/* Ownership */}
        <TableSection
          title="Ownership by recipient"
          headers={[
            "Recipient",
            "% total",
            "Shares total",
            "Implied % from shares",
            "Grant count",
          ]}
          rows={rows.map((r) => {
            const p = profilesById[r.recipient_user_id]
            const display =
              p?.full_name ||
              [p?.legal_first_name, p?.legal_last_name].filter(Boolean).join(" ") ||
              p?.email ||
              r.recipient_user_id

            const impliedFromShares =
              fdShares && fdShares > 0 ? (r.shareTotal / fdShares) * 100 : null

            return [
              display,
              `${r.percentTotal.toFixed(4)}%`,
              String(r.shareTotal),
              impliedFromShares === null ? "—" : `${impliedFromShares.toFixed(4)}%`,
              String(r.grants.length),
            ]
          })}
        />

        {/* Raw Grants */}
        <TableSection
          title="Signed grants (raw)"
          headers={["Grant", "Recipient", "Amount", "Unit", "Status", "Created"]}
          rows={grants.map((g) => [
            String(g.id).slice(0, 8),
            profilesById[g.recipient_user_id]?.full_name ?? g.recipient_user_id,
            String(g.equity_amount ?? "—"),
            String(g.equity_unit ?? "—"),
            g.status,
            new Date(g.created_at).toLocaleString(),
          ])}
        />
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-soft bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-primary">{value}</div>
    </div>
  )
}

function TableSection({
  title,
  headers,
  rows,
}: {
  title: string
  headers: string[]
  rows: (string | number)[][]
}) {
  return (
    <section className="rounded-lg border border-soft bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        {title}
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No records.</p>
      ) : (
        <div className="overflow-auto rounded border border-soft">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-soft/60">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 border-b border-soft text-xs uppercase tracking-wide text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="odd:bg-white even:bg-soft/40 hover:bg-soft transition"
                >
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      className="px-3 py-2 border-b border-soft whitespace-nowrap text-text"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
