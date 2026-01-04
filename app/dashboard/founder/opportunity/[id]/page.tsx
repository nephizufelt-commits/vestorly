"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
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

type Profile = {
  id: string
  full_name: string | null
  headline: string | null
  skills: string[] | null
  portfolio_url: string | null
  linkedin_url: string | null
  kyc_status: string
}

export default function ManageOpportunityPage() {
  const params = useParams()
  const oppId = useMemo(() => {
    const raw = (params as any)?.id
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  }, [params])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [opportunity, setOpportunity] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({})

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }
      if (!oppId) {
        setMessage("Missing opportunity id.")
        setLoading(false)
        return
      }

      const { data: opp, error: oppErr } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", oppId)
        .single()

      if (oppErr) {
        setMessage(oppErr.message)
        setLoading(false)
        return
      }
      setOpportunity(opp)

      const { data: apps, error: appsErr } = await supabase
        .from("applications")
        .select("id,opportunity_id,provider_user_id,proposal,proposed_terms,status,created_at")
        .eq("opportunity_id", oppId)
        .order("created_at", { ascending: false })

      if (appsErr) {
        setMessage(appsErr.message)
        setLoading(false)
        return
      }

      const appsData = (apps ?? []) as Application[]
      setApplications(appsData)

      const providerIds = Array.from(new Set(appsData.map((a) => a.provider_user_id)))
      if (providerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,headline,skills,portfolio_url,linkedin_url,kyc_status")
          .in("id", providerIds)

        const map: Record<string, Profile> = {}
        for (const p of profs ?? []) map[p.id] = p as Profile
        setProfilesById(map)
      }

      setLoading(false)
    })()
  }, [oppId])

  async function acceptApplication(appId: string) {
    setMessage(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error("Not signed in.")
      const founderId = sessionData.session.user.id

      if (!opportunity?.id || !opportunity?.company_id) {
        throw new Error("Opportunity not loaded.")
      }

      const chosen = applications.find((a) => a.id === appId)
      if (!chosen) throw new Error("Application not found.")

      await supabase.from("applications").update({ status: "accepted" }).eq("id", appId)
      await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("opportunity_id", oppId!)
        .neq("id", appId)

      const { data: grant, error: grantErr } = await supabase
        .from("equity_grants")
        .insert({
          company_id: opportunity.company_id,
          opportunity_id: opportunity.id,
          recipient_user_id: chosen.provider_user_id,
          granted_by_user_id: founderId,
          status: "draft",
          equity_amount: opportunity.equity_amount ?? null,
          equity_unit: opportunity.equity_unit || null,
          vesting_terms: "TBD",
          agreement_provider: "docusign",
          agreement_url: null,
        })
        .select()
        .single()

      if (grantErr) throw grantErr

      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId ? { ...a, status: "accepted" } : { ...a, status: "rejected" }
        )
      )

      setMessage(`Accepted. Draft equity grant created.`)
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
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
              Manage Opportunity
            </h1>
            <p className="text-sm text-muted">{opportunity?.title}</p>
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

        {/* Description */}
        <section className="rounded-lg border border-soft bg-white p-6 space-y-2">
          <h2 className="text-sm font-semibold text-text">Description</h2>
          <p className="text-sm text-muted whitespace-pre-wrap">
            {opportunity?.description}
          </p>
        </section>

        {/* Applicants */}
        <section className="rounded-xl border border-soft bg-white p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              Applicants
            </h2>
            <span className="text-sm text-muted">
              {applications.length} total
            </span>
          </div>

          {applications.length === 0 ? (
            <p className="text-sm text-muted">No applications yet.</p>
          ) : (
            <div className="divide-y">
              {applications.map((a) => {
                const p = profilesById[a.provider_user_id]
                const isAccepted = a.status === "accepted"

                return (
                  <div
                    key={a.id}
                    className={`py-6 space-y-4 transition ${
                      isAccepted ? "bg-accentSoft/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-1">
                        <div className="font-semibold text-text">
                          {p?.full_name ?? "Provider"}{" "}
                          <span className="text-xs uppercase tracking-wide text-muted">
                            · {a.status}
                          </span>
                        </div>

                        <div className="text-sm text-muted">
                          {p?.headline}
                          {p?.kyc_status ? ` · KYC: ${p.kyc_status}` : ""}
                        </div>

                        {p?.skills?.length ? (
                          <div className="text-sm text-muted">
                            Skills: {p.skills.slice(0, 8).join(", ")}
                            {p.skills.length > 8 ? "…" : ""}
                          </div>
                        ) : null}

                        <div className="text-sm">
                          {p?.portfolio_url && (
                            <a
                              className="text-primary underline mr-4"
                              href={p.portfolio_url}
                              target="_blank"
                            >
                              Portfolio
                            </a>
                          )}
                          {p?.linkedin_url && (
                            <a
                              className="text-primary underline"
                              href={p.linkedin_url}
                              target="_blank"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => acceptApplication(a.id)}
                        disabled={isAccepted}
                        className="
                          rounded-md
                          bg-primary
                          px-4 py-2
                          text-sm font-semibold text-white
                          hover:opacity-90
                          disabled:opacity-50
                        "
                      >
                        {isAccepted ? "Accepted" : "Accept"}
                      </button>
                    </div>

                    {/* Proposal */}
                    <div className="rounded-lg border border-soft bg-soft/40 p-4 space-y-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                          Proposal
                        </div>
                        <p className="text-sm text-text whitespace-pre-wrap">
                          {a.proposal}
                        </p>
                      </div>

                      {a.proposed_terms && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                            Proposed terms
                          </div>
                          <p className="text-sm text-text">
                            {a.proposed_terms}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
