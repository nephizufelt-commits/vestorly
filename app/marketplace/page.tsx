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

      // For MVP: require sign-in to view marketplace to avoid public RLS complexity
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      // Load open opportunities
      const { data: o, error: oErr } = await supabase
        .from("opportunities")
        .select("id,company_id,title,description,status,equity_type,equity_amount,equity_unit,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })

      if (oErr) {
        setMessage(oErr.message)
        setLoading(false)
        return
      }

      const oppsData = (o ?? []) as Opportunity[]
      setOpps(oppsData)

      // Fetch companies for display
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

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-sm text-gray-600">Browse open equity opportunities.</p>
        </div>

        <Link
          href="/dashboard/provider"
          className="text-sm font-medium px-4 py-2 rounded border bg-white hover:bg-gray-50"
        >
          Provider Dashboard
        </Link>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <div className="bg-white border rounded-lg p-4 flex items-center gap-3">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Search roles, companies, industries…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="text-sm text-gray-600 whitespace-nowrap">{filtered.length} results</div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-600">No opportunities found.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((o) => {
            const c = companiesById[o.company_id]
            return (
              <div key={o.id} className="bg-white border rounded-lg p-6 space-y-3">
                <div className="space-y-1">
                  <div className="text-lg font-semibold">{o.title}</div>
                  <div className="text-sm text-gray-600">
                    {c?.name ?? "Company"} {c?.industry ? `· ${c.industry}` : ""}
                  </div>
                </div>

                <p className="text-sm text-gray-700 line-clamp-3">{o.description}</p>

                <div className="text-sm text-gray-600">
                  {o.equity_amount !== null && o.equity_unit
                    ? `Equity: ${o.equity_amount} ${o.equity_unit}`
                    : "Equity: negotiable"}
                  {o.equity_type ? ` · Type: ${o.equity_type}` : ""}
                </div>

                <div className="pt-2">
                  <Link className="underline text-sm font-medium" href={`/marketplace/${o.id}`}>
                    View & Apply
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
