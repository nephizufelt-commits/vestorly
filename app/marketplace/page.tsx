"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Opportunity = {
  id: string
  company_id: string
  title: string
  description: string
  status: string
  equity_type: string | null
  equity_amount: number | null
  equity_unit: string | null
  created_at: string
}

type Company = {
  id: string
  name: string
  industry: string | null
  website: string | null
}

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const [opps, setOpps] = useState<Opportunity[]>([])
  const [companiesById, setCompaniesById] = useState<Record<string, Company>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      const { data: o, error: oErr } = await supabase
        .from("opportunities")
        .select(
          "id,company_id,title,description,status,equity_type,equity_amount,equity_unit,created_at"
        )
        .eq("status", "open")
        .order("created_at", { ascending: false })

      if (oErr) {
        setMessage(oErr.message)
        setLoading(false)
        return
      }

      const oppsData = (o ?? []) as Opportunity[]
      setOpps(oppsData)

      const companyIds = Array.from(new Set(oppsData.map((x) => x.company_id)))
      if (companyIds.length) {
        const { data: comps, error: cErr } = await supabase
          .from("companies")
          .select("id,name,industry,website")
          .in("id", companyIds)

        if (cErr) {
          setMessage(cErr.message)
          setLoading(false)
          return
        }

        const map: Record<string, Company> = {}
        for (const c of comps ?? []) map[c.id] = c as Company
        setCompaniesById(map)
      }

      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return opps
    return opps.filter((o) => {
      const c = companiesById[o.company_id]
      return (
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        (c?.name?.toLowerCase().includes(q) ?? false) ||
        (c?.industry?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [opps, query, companiesById])

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  return (
    <div className="bg-soft/40">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              Marketplace
            </h1>
            <p className="text-sm text-muted">
              Browse open equity opportunities and apply directly.
            </p>
          </div>

          <Link
            href="/dashboard/provider"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Provider Dashboard
          </Link>
        </div>

        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}

        {/* Search */}
        <div className="rounded-xl border border-soft bg-white p-4 flex items-center gap-4">
          <input
            className="w-full rounded-md border border-soft px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Search roles, companies, or industries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-sm text-muted whitespace-nowrap">
            {filtered.length} results
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No opportunities found.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filtered.map((o) => {
              const c = companiesById[o.company_id]
              return (
                <div
                  key={o.id}
                  className="
                    group
                    rounded-xl
                    border border-soft
                    bg-white
                    p-6
                    space-y-4
                    transition
                    hover:shadow-md
                  "
                >
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-text">
                      {o.title}
                    </div>
                    <div className="text-sm text-muted">
                      {c?.name ?? "Company"}
                      {c?.industry ? ` · ${c.industry}` : ""}
                    </div>
                  </div>

                  <p className="text-sm text-text/80 line-clamp-3">
                    {o.description}
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted">
                      {o.equity_amount !== null && o.equity_unit
                        ? `${o.equity_amount} ${o.equity_unit}`
                        : "Equity negotiable"}
                      {o.equity_type ? ` · ${o.equity_type}` : ""}
                    </div>

                    <Link
                      href={`/marketplace/${o.id}`}
                      className="
                        text-sm font-semibold
                        text-primary
                        group-hover:underline
                      "
                    >
                      View & Apply →
                    </Link>
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
