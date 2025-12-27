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
        setMessage("Missing opportunity id in route. (URL should look like /marketplace/<id>)")
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

      setMessage("Application submitted.")
      setProposal("")
      setProposedTerms("")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <div className="bg-white border rounded-lg p-6 space-y-2">
        <h1 className="text-2xl font-bold">{opportunity?.title ?? "Opportunity"}</h1>
        <div className="text-sm text-gray-600">
          {company?.name ?? "Company"} {company?.industry ? `· ${company.industry}` : ""}
          {company?.website ? ` · ${company.website}` : ""}
        </div>

        <div className="text-sm text-gray-700 whitespace-pre-wrap pt-2">
          {opportunity?.description}
        </div>

        <div className="text-sm text-gray-600 pt-2">
          {opportunity?.equity_amount !== null && opportunity?.equity_unit
            ? `Equity: ${opportunity.equity_amount} ${opportunity.equity_unit}`
            : "Equity: negotiable"}
          {opportunity?.equity_type ? ` · Type: ${opportunity.equity_type}` : ""}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Apply</h2>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Proposal *</span>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[140px]"
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Explain what you’ll deliver, timeline, and why you’re a fit."
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Proposed terms (optional)</span>
          <input
            className="w-full border rounded px-3 py-2"
            value={proposedTerms}
            onChange={(e) => setProposedTerms(e.target.value)}
            placeholder="e.g., 0.25% vested over 12 months, milestone-based"
          />
        </label>

        <button
          onClick={apply}
          disabled={submitting}
          className="bg-black text-white rounded px-4 py-2 font-medium disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </div>
  )
}
