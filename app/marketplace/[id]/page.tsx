"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function OpportunityDetailPage() {
  const params = useParams()
  const oppId = useMemo(() => {
    const raw = (params as any)?.id
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  }, [params])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [opportunity, setOpportunity] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)

  const [proposal, setProposal] = useState("")
  const [proposedTerms, setProposedTerms] = useState("")
  const [submitting, setSubmitting] = useState(false)

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
        setMessage("Missing opportunity id in route.")
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

      const { data: comp, error: compErr } = await supabase
        .from("companies")
        .select("id,name,industry,website,description")
        .eq("id", opp.company_id)
        .single()

      if (compErr) {
        setMessage(compErr.message)
        setLoading(false)
        return
      }

      setCompany(comp)
      setLoading(false)
    })()
  }, [oppId])

  async function apply() {
    setMessage(null)
    setSubmitting(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error("Not signed in.")
      const userId = sessionData.session.user.id

      if (!opportunity?.id) throw new Error("Opportunity not loaded yet.")
      if (!proposal.trim()) throw new Error("Proposal is required.")

      const { error } = await supabase.from("applications").insert({
        opportunity_id: opportunity.id,
        provider_user_id: userId,
        proposal,
        proposed_terms: proposedTerms || null,
        status: "submitted",
      })

      if (error) throw error

      setMessage("Application submitted successfully.")
      setProposal("")
      setProposedTerms("")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  return (
    <div className="bg-soft/40">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}

        {/* Opportunity */}
        <section className="rounded-xl border border-soft bg-white p-8 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              {opportunity?.title ?? "Opportunity"}
            </h1>
            <div className="mt-1 text-sm text-muted">
              {company?.name ?? "Company"}
              {company?.industry ? ` · ${company.industry}` : ""}
              {company?.website ? ` · ${company.website}` : ""}
            </div>
          </div>

          <div className="pt-2 text-sm text-text whitespace-pre-wrap">
            {opportunity?.description}
          </div>

          <div className="flex flex-wrap gap-4 pt-3">
            <div className="rounded-md bg-accentSoft px-3 py-1 text-sm text-text">
              {opportunity?.equity_amount !== null && opportunity?.equity_unit
                ? `${opportunity.equity_amount} ${opportunity.equity_unit}`
                : "Equity negotiable"}
            </div>
            {opportunity?.equity_type && (
              <div className="rounded-md bg-soft px-3 py-1 text-sm text-muted">
                {opportunity.equity_type}
              </div>
            )}
          </div>
        </section>

        {/* Apply */}
        <section className="rounded-xl border border-soft bg-white p-8 space-y-6">
          <h2 className="text-lg font-semibold text-text">
            Apply for this role
          </h2>

          <div className="text-sm text-muted">
            Your proposal is shared directly with the founder. Be specific about
            scope, timeline, and why you’re a good fit.
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-text">
              Proposal *
            </span>
            <textarea
              className="
                w-full
                rounded-md
                border border-soft
                px-4 py-3
                min-h-[160px]
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-primary/40
              "
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="What will you deliver? Timeline? Prior experience?"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-text">
              Proposed terms (optional)
            </span>
            <input
              className="
                w-full
                rounded-md
                border border-soft
                px-4 py-2
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-primary/40
              "
              value={proposedTerms}
              onChange={(e) => setProposedTerms(e.target.value)}
              placeholder="e.g. 0.25% vested over 12 months"
            />
          </label>

          <div className="pt-2">
            <button
              onClick={apply}
              disabled={submitting}
              className="
                rounded-md
                bg-primary
                px-5 py-2.5
                text-sm font-semibold text-white
                hover:opacity-90
                disabled:opacity-50
              "
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
