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

  // New opportunity form
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

      // Load companies for this founder:
      // simplest: companies created_by me
      // (later: show companies where I’m a member)
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
      const firstId = (comps ?? [])[0]?.id
      setSelectedCompanyId(firstId || "")
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

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Founder Dashboard</h1>
          <p className="text-sm text-gray-600">
            Create opportunities and manage equity-based hires.
          </p>
        </div>

        <Link
          href="/"
          className="text-sm font-medium px-4 py-2 rounded border bg-white hover:bg-gray-50"
        >
          View marketplace
        </Link>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <section className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Company</h2>

        {companies.length === 0 ? (
          <p className="text-sm text-gray-600">
            No companies found. (You should have one from onboarding.)
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="border rounded px-3 py-2"
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
              <div className="text-sm text-gray-600">
                {selectedCompany.industry ? `${selectedCompany.industry} · ` : ""}
                {selectedCompany.website ?? ""}
              </div>
            )}

            {selectedCompanyId ? (
              <div className="pt-2 flex gap-4">
                <Link
                  href={`/dashboard/founder/company/${selectedCompanyId}/kyb`}
                  className="text-sm font-medium underline"
                >
                  Manage KYB / Owners
                </Link>

                <Link
                  href={`/dashboard/founder/company/${selectedCompanyId}/cap-table`}
                  className="text-sm font-medium underline"
                >
                  View Cap Table
                </Link>
              </div>
            ) : null}

          </div>
        )}
      </section>

      <section className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create an Opportunity</h2>

        <form onSubmit={createOpportunity} className="space-y-4">
          <Field label="Title" value={title} setValue={setTitle} required />

          <label className="block space-y-1">
            <span className="text-sm font-medium">Description *</span>
            <textarea
              className="w-full border rounded px-3 py-2 min-h-[120px]"
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

          <button className="bg-black text-white rounded px-4 py-2 font-medium">
            Create Opportunity
          </button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Opportunities</h2>
          <span className="text-sm text-gray-600">{opps.length} total</span>
        </div>

        {opps.length === 0 ? (
          <p className="text-sm text-gray-600">No opportunities yet. Create one above.</p>
        ) : (
          <div className="divide-y">
            {opps.map((o) => (
              <div key={o.id} className="py-4 flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <div className="font-semibold">{o.title}</div>
                  <div className="text-sm text-gray-600">
                    Status: {o.status}
                    {o.equity_amount !== null && o.equity_unit
                      ? ` · Equity: ${o.equity_amount} ${o.equity_unit}`
                      : ""}
                    {o.equity_type ? ` · Type: ${o.equity_type}` : ""}
                  </div>
                </div>

                <Link
                  href={`/dashboard/founder/opportunity/${o.id}`}
                  className="text-sm font-medium underline"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
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
      <span className="text-sm font-medium">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <input
        className="w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
      />
    </label>
  )
}
