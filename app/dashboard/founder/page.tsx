"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Company = {
  id: string
  name: string
  website: string | null
  industry: string | null
  created_at: string
}

type Opportunity = {
  id: string
  company_id: string
  title: string
  status: string
  equity_type: string | null
  equity_amount: number | null
  equity_unit: string | null
  created_at: string
}

export default function FounderDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  )

  const [opps, setOpps] = useState<Opportunity[]>([])

  const [title, setTitle] = useState("")
  const [equityType, setEquityType] = useState("Advisory")
  const [equityAmount, setEquityAmount] = useState("")
  const [equityUnit, setEquityUnit] = useState("percent")
  const [description, setDescription] = useState("")

  useEffect(() => {
    ;(async () => {
      setMessage(null)
      setLoading(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      const userId = sessionData.session.user.id
      const { data: comps, error: compsErr } = await supabase
        .from("companies")
        .select("id,name,website,industry,created_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })

      if (compsErr) {
        setMessage(compsErr.message)
        setLoading(false)
        return
      }

      setCompanies(comps ?? [])
      setSelectedCompanyId((comps ?? [])[0]?.id || "")
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!selectedCompanyId) {
        setOpps([])
        return
      }
      const { data, error } = await supabase
        .from("opportunities")
        .select("id,company_id,title,status,equity_type,equity_amount,equity_unit,created_at")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false })

      if (error) {
        setMessage(error.message)
        return
      }
      setOpps(data ?? [])
    })()
  }, [selectedCompanyId])

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error("Not signed in.")
      const userId = sessionData.session.user.id

      if (!selectedCompanyId) throw new Error("Select a company first.")
      if (!title.trim()) throw new Error("Title is required.")
      if (!description.trim()) throw new Error("Description is required.")

      const equityAmountNum =
        equityAmount.trim().length > 0 ? Number(equityAmount) : null
      if (equityAmountNum !== null && Number.isNaN(equityAmountNum)) {
        throw new Error("Equity amount must be a number.")
      }

      const { data: created, error } = await supabase
        .from("opportunities")
        .insert({
          company_id: selectedCompanyId,
          created_by: userId,
          title,
          description,
          equity_type: equityType || null,
          equity_amount: equityAmountNum,
          equity_unit: equityUnit || null,
          status: "open",
        })
        .select()
        .single()

      if (error) throw error

      setOpps((prev) => [created as Opportunity, ...prev])
      setTitle("")
      setDescription("")
      setEquityAmount("")
      setMessage("Opportunity created.")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  return (
    <div className="bg-soft/40">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Hero */}
        <div className="rounded-xl bg-accentSoft p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              Founder Dashboard
            </h1>
            <p className="mt-1 text-sm text-text">
              Build your team using equity — not just cash.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            View marketplace
          </Link>
        </div>

        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}

        {/* Company Context */}
        <section className="rounded-lg border border-soft bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              Company Context
            </h2>
            {selectedCompany && (
              <span className="text-xs uppercase tracking-wide text-muted">
                Active
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="border border-soft rounded px-3 py-2 text-sm"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedCompany && (
              <div className="text-sm text-muted">
                {selectedCompany.industry ? `${selectedCompany.industry} · ` : ""}
                {selectedCompany.website ?? ""}
              </div>
            )}
          </div>

          {selectedCompanyId && (
            <div className="flex gap-4 pt-2">
              <Link
                href={`/dashboard/founder/company/${selectedCompanyId}/kyb`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Manage KYB / Owners
              </Link>
              <Link
                href={`/dashboard/founder/company/${selectedCompanyId}/cap-table`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View Cap Table
              </Link>
            </div>
          )}
        </section>

        {/* Create Opportunity */}
        <section className="rounded-xl border border-primary/20 bg-white p-6 space-y-5">
          <h2 className="text-lg font-semibold text-primary">
            Create a New Opportunity
          </h2>

          <form onSubmit={createOpportunity} className="space-y-4">
            <Field label="Title" value={title} setValue={setTitle} required />

            <label className="block space-y-1">
              <span className="text-sm font-medium text-text">
                Description <span className="text-red-600">*</span>
              </span>
              <textarea
                className="w-full border border-soft rounded px-3 py-2 min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Equity type" value={equityType} setValue={setEquityType} />
              <Field label="Equity amount" value={equityAmount} setValue={setEquityAmount} />
              <Field label="Equity unit" value={equityUnit} setValue={setEquityUnit} />
            </div>

            <button className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
              Create Opportunity
            </button>
          </form>
        </section>

        {/* Opportunities */}
        <section className="rounded-lg border border-soft bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              Your Opportunities
            </h2>
            <span className="text-sm text-muted">{opps.length} total</span>
          </div>

          {opps.length === 0 ? (
            <p className="text-sm text-muted">
              No opportunities yet. Create one above.
            </p>
          ) : (
            <div className="divide-y">
              {opps.map((o) => (
                <div
                  key={o.id}
                  className="py-4 flex items-start justify-between gap-6 transition hover:bg-soft/40 rounded-md px-2 -mx-2"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-text">
                      {o.title}
                    </div>
                    <div className="text-sm text-muted">
                      {o.equity_amount !== null && o.equity_unit
                        ? `Equity: ${o.equity_amount} ${o.equity_unit}`
                        : "Equity not specified"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        o.status === "open"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {o.status}
                    </span>

                    <Link
                      href={`/dashboard/founder/opportunity/${o.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Manage
                    </Link>
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

function Field({
  label,
  value,
  setValue,
  required,
}: {
  label: string
  value: string
  setValue: (v: string) => void
  required?: boolean
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-text">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <input
        className="w-full border border-soft rounded px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
      />
    </label>
  )
}
