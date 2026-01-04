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
    <div className="bg-soft/40">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-text">
              Provider Dashboard
            </h1>
            <p className="text-sm text-muted">
              Track applications and equity agreements.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
          <MetricCard title="Applications" value={String(applications.length)} />
          <MetricCard title="Submitted" value={String(submittedCount)} />
          <MetricCard title="Accepted" value={String(acceptedCount)} />
        </section>

        {/* Applications */}
        <section className="rounded-lg border border-soft bg-white p-6 space-y-5">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
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
                  <div
                    key={a.id}
                    className="py-4 space-y-1 transition hover:bg-soft/40 rounded-md px-2 -mx-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-text">
                        {opp?.title ?? "Opportunity"}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-muted">
                        {a.status}
                      </div>
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
        <section className="rounded-lg border border-soft bg-white p-6 space-y-5">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            My Equity Grants
          </h2>

          {grants.length === 0 ? (
            <p className="text-sm text-muted">No grants yet.</p>
          ) : (
            <div className="divide-y">
              {grants.map((g) => (
                <div
                  key={g.id}
                  className="py-4 space-y-2 transition hover:bg-soft/40 rounded-md px-2 -mx-2"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/dashboard/provider/grants/${g.id}`}
                    >
                      Grant #{g.id.slice(0, 8)}
                    </Link>

                    <div
                      className={`text-xs uppercase tracking-wide font-medium ${
                        g.status === "signed"
                          ? "text-green-700"
                          : g.status === "sent"
                          ? "text-amber-700"
                          : "text-muted"
                      }`}
                    >
                      {g.status}
                    </div>
                  </div>

                  <div className="text-sm text-muted">
                    Equity: {g.equity_amount ?? "?"} {g.equity_unit ?? ""}
                  </div>

                  <div className="text-sm">
                    Agreement:{" "}
                    {g.agreement_url ? (
                      <a
                        className="font-medium text-primary hover:underline"
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
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-soft bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-muted">
        {title}
      </div>
      <div className="mt-2 text-3xl font-semibold text-primary">
        {value}
      </div>
    </div>
  )
}
