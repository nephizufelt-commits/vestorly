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

      // Load opportunity
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

      // Load applications
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

      // Load provider profiles for display
      const providerIds = Array.from(new Set(appsData.map((a) => a.provider_user_id)))
      if (providerIds.length) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id,full_name,headline,skills,portfolio_url,linkedin_url,kyc_status")
          .in("id", providerIds)

        if (profErr) {
          setMessage(profErr.message)
          setLoading(false)
          return
        }

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

    if (!opportunity?.id || !opportunity?.company_id) throw new Error("Opportunity not loaded.")

    // Load the chosen application (need provider id)
    const chosen = applications.find((a) => a.id === appId)
    if (!chosen) throw new Error("Application not found in current list.")

    // Accept selected
    const { error: acceptErr } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", appId)
    if (acceptErr) throw acceptErr

    // Reject others (MVP behavior)
    const { error: rejectErr } = await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("opportunity_id", oppId!)
      .neq("id", appId)
    if (rejectErr) throw rejectErr

    // Create draft equity grant (placeholder agreement)
    const { data: grant, error: grantErr } = await supabase
  .from("equity_grants")
  .insert({
    company_id: opportunity.company_id,
    opportunity_id: opportunity.id,
    recipient_user_id: chosen.provider_user_id, // provider
    granted_by_user_id: founderId,               // founder

    status: "draft",                             // your table uses "status"
    equity_amount: opportunity.equity_amount ?? null,
    equity_unit: opportunity.equity_unit || null,
    vesting_terms: "TBD",

    agreement_provider: "docusign",
    agreement_url: null,

    // optional defaults (leave null for MVP)
    vesting_start_date: null,
    vesting_months: null,
    cliff_months: null,
  })
  .select()
  .single()

if (grantErr) throw grantErr


    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, status: "accepted" } : { ...a, status: "rejected" }
      )
    )

    setMessage(`Accepted. Draft equity grant created: ${grant.id}`)
  } catch (err: any) {
    setMessage(err?.message ?? "Something went wrong.")
  }
}


  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Manage Opportunity</h1>
          <div className="text-sm text-gray-600">{opportunity?.title ?? ""}</div>
        </div>
        <Link className="underline text-sm font-medium" href="/dashboard/founder">
          Back to dashboard
        </Link>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <div className="bg-white border rounded-lg p-6 space-y-2">
        <div className="font-semibold">Description</div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap">{opportunity?.description}</div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Applicants</h2>
          <span className="text-sm text-gray-600">{applications.length} total</span>
        </div>

        {applications.length === 0 ? (
          <p className="text-sm text-gray-600">No applications yet.</p>
        ) : (
          <div className="divide-y">
            {applications.map((a) => {
              const p = profilesById[a.provider_user_id]
              return (
                <div key={a.id} className="py-5 space-y-3">
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {p?.full_name ?? "Provider"}{" "}
                        <span className="text-sm text-gray-600">· {a.status}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {p?.headline ?? ""}
                        {p?.kyc_status ? ` · KYC: ${p.kyc_status}` : ""}
                      </div>
                      {p?.skills?.length ? (
                        <div className="text-sm text-gray-600">
                          Skills: {p.skills.slice(0, 8).join(", ")}
                          {p.skills.length > 8 ? "…" : ""}
                        </div>
                      ) : null}
                      <div className="text-sm">
                        {p?.portfolio_url ? (
                          <a className="underline mr-3" href={p.portfolio_url} target="_blank">
                            Portfolio
                          </a>
                        ) : null}
                        {p?.linkedin_url ? (
                          <a className="underline" href={p.linkedin_url} target="_blank">
                            LinkedIn
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => acceptApplication(a.id)}
                      disabled={a.status === "accepted"}
                      className="bg-black text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
                    >
                      {a.status === "accepted" ? "Accepted" : "Accept"}
                    </button>
                  </div>

                  <div className="bg-gray-50 border rounded p-4">
                    <div className="text-sm font-medium mb-1">Proposal</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{a.proposal}</div>

                    {a.proposed_terms ? (
                      <>
                        <div className="text-sm font-medium mt-3 mb-1">Proposed terms</div>
                        <div className="text-sm text-gray-700">{a.proposed_terms}</div>
                      </>
                    ) : null}
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
