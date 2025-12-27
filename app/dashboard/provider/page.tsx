"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Application = {
  id: string
  opportunity_id: string
  provider_user_id: string
  proposal: string | null
  proposed_terms: string | null
  status: string
  created_at: string
}

type Opportunity = {
  id: string
  company_id: string
  title: string
  status: string
  created_at: string
}

type Company = {
  id: string
  name: string
  industry: string | null
  website: string | null
}

export default function ProviderDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [applications, setApplications] = useState<Application[]>([])
  const [oppsById, setOppsById] = useState<Record<string, Opportunity>>({})
  const [companiesById, setCompaniesById] = useState<Record<string, Company>>({})
  const [grants, setGrants] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      const userId = sessionData.session.user.id

      const { data: apps, error: appsErr } = await supabase
        .from("applications")
        .select("id,opportunity_id,provider_user_id,proposal,proposed_terms,status,created_at")
        .eq("provider_user_id", userId)
        .order("created_at", { ascending: false })

      if (appsErr) {
        setMessage(appsErr.message)
        setLoading(false)
        return
      }

      const appsData = (apps ?? []) as Application[]
      setApplications(appsData)

      const { data: g, error: gErr } = await supabase
        .from("equity_grants")
        .select("*")
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })

      if (gErr) {
        setMessage(gErr.message)
        setLoading(false)
        return
      }

      setGrants(g ?? [])

      const oppIds = Array.from(new Set(appsData.map((a) => a.opportunity_id)))
      if (oppIds.length) {
        const { data: opps, error: oppErr } = await supabase
          .from("opportunities")
          .select("id,company_id,title,status,created_at")
          .in("id", oppIds)

        if (oppErr) {
          setMessage(oppErr.message)
          setLoading(false)
          return
        }

        const oppMap: Record<string, Opportunity> = {}
        for (const o of opps ?? []) oppMap[o.id] = o as Opportunity
        setOppsById(oppMap)

        const companyIds = Array.from(new Set((opps ?? []).map((o: any) => o.company_id)))
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

          const compMap: Record<string, Company> = {}
          for (const c of comps ?? []) compMap[c.id] = c as Company
          setCompaniesById(compMap)
        }
      }

      setLoading(false)
    })()
  }, [])

  const submittedCount = useMemo(
    () => applications.filter((a) => a.status === "submitted").length,
    [applications]
  )
  const acceptedCount = useMemo(
    () => applications.filter((a) => a.status === "accepted").length,
    [applications]
  )

  if (loading) {
    return <div className="text-sm text-muted">Loading…</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Provider Dashboard
          </h1>

   <div className="bg-green-700 text-white p-4">
  Built-in green works
</div>

<div className="bg-primary text-white p-4 mt-2">
  Custom green works
</div>


          <p className="mt-1 text-sm text-muted">
            Track applications and equity agreements.
          </p>
        </div>

        <Link
          href="/marketplace"
          className="rounded-md border border-soft bg-white px-4 py-2 text-sm font-medium hover:bg-soft"
        >
          Browse marketplace
        </Link>
      </div>

      {message && (
        <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
          {message}
        </div>
      )}

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card title="Applications" value={String(applications.length)} />
        <Card title="Submitted" value={String(submittedCount)} />
        <Card title="Accepted" value={String(acceptedCount)} />
      </section>

      {/* Applications */}
      <section className="rounded-lg border border-soft bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text">
          My Applications
        </h2>

        {applications.length === 0 ? (
          <p className="text-sm text-muted">No applications yet.</p>
        ) : (
          <div className="divide-y">
            {applications.map((a) => {
              const opp = oppsById[a.opportunity_id]
              const comp = opp ? companiesById[opp.company_id] : null

              return (
                <div key={a.id} className="py-4 space-y-1">
                  <div className="font-medium text-text">
                    {opp?.title ?? "Opportunity"}{" "}
                    <span className="text-sm text-muted">· {a.status}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {comp?.name ?? ""}
                    {comp?.industry ? ` · ${comp.industry}` : ""}
                    {comp?.website ? ` · ${comp.website}` : ""}
                  </div>
                  {a.proposed_terms && (
                    <div className="text-sm text-muted">
                      Terms: {a.proposed_terms}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Grants */}
      <section className="rounded-lg border border-soft bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text">
          My Equity Grants
        </h2>

        {grants.length === 0 ? (
          <p className="text-sm text-muted">No grants yet.</p>
        ) : (
          <div className="divide-y">
            {grants.map((g) => (
              <div key={g.id} className="py-4 space-y-1">
                <div className="font-medium text-text">
                  <Link
                    className="underline"
                    href={`/dashboard/provider/grants/${g.id}`}
                  >
                    Grant #{g.id.slice(0, 8)}
                  </Link>{" "}
                  <span className="text-sm text-muted">· {g.status}</span>
                </div>
                <div className="text-sm text-muted">
                  Equity: {g.equity_amount ?? "?"} {g.equity_unit ?? ""}
                </div>
                <div className="text-sm">
                  Agreement:{" "}
                  {g.agreement_url ? (
                    <a
                      className="underline"
                      href={g.agreement_url}
                      target="_blank"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-muted">Not sent yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-soft bg-white p-5">
      <div className="text-sm text-muted">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-text">{value}</div>
    </div>
  )
}
