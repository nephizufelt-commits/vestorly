"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Company = {
  id: string
  name: string
  created_by: string
}

type Person = {
  id: string
  company_id: string
  relationship_role: string
  ownership_percent: number | null
  linked_user_id: string | null
  legal_first_name: string | null
  legal_last_name: string | null
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country: string | null
  phone: string | null
  email: string | null
  kyc_status: string
  created_at: string
}

export default function CompanyKybPage() {
  const params = useParams()
  const companyId = useMemo(() => {
    const raw = (params as any)?.id
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  }, [params])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [company, setCompany] = useState<Company | null>(null)
  const [people, setPeople] = useState<Person[]>([])

  // Form
  const [role, setRole] = useState<"control_person" | "beneficial_owner">("control_person")
  const [ownershipPercent, setOwnershipPercent] = useState("")
  const [first, setFirst] = useState("")
  const [last, setLast] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("") // yyyy-mm-dd

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

      if (!companyId) {
        setMessage("Missing company id.")
        setLoading(false)
        return
      }

      const { data: c, error: cErr } = await supabase
        .from("companies")
        .select("id,name,created_by")
        .eq("id", companyId)
        .single()

      if (cErr) {
        setMessage(cErr.message)
        setLoading(false)
        return
      }
      setCompany(c as Company)

      const { data: p, error: pErr } = await supabase
        .from("company_persons")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      if (pErr) {
        setMessage(pErr.message)
        setLoading(false)
        return
      }
      setPeople((p ?? []) as Person[])

      setLoading(false)
    })()
  }, [companyId])

  async function addPerson(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      if (!companyId) throw new Error("Missing company id.")
      if (!first.trim()) throw new Error("First name is required.")
      if (!last.trim()) throw new Error("Last name is required.")
      if (!email.trim()) throw new Error("Email is required.")

      let ownership: number | null = null
      if (role === "beneficial_owner") {
        if (!ownershipPercent.trim()) throw new Error("Ownership percent is required for beneficial owners.")
        const n = Number(ownershipPercent)
        if (Number.isNaN(n) || n <= 0 || n > 100) throw new Error("Ownership percent must be between 0 and 100.")
        ownership = n
      }

      const insertObj: any = {
        company_id: companyId,
        relationship_role: role,
        ownership_percent: ownership,
        legal_first_name: first,
        legal_last_name: last,
        email,
        phone: phone || null,
        date_of_birth: dob || null,
        kyc_status: "unverified",
      }

      const { data: created, error } = await supabase
        .from("company_persons")
        .insert(insertObj)
        .select()
        .single()

      if (error) throw error

      setPeople((prev) => [created as Person, ...prev])

      // reset
      setOwnershipPercent("")
      setFirst("")
      setLast("")
      setEmail("")
      setPhone("")
      setDob("")

      setMessage("Person added.")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  async function removePerson(id: string) {
    setMessage(null)
    try {
      const { error } = await supabase.from("company_persons").delete().eq("id", id)
      if (error) throw error
      setPeople((prev) => prev.filter((p) => p.id !== id))
      setMessage("Removed.")
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  const controlPeople = people.filter((p) => p.relationship_role === "control_person")
  const owners = people.filter((p) => p.relationship_role === "beneficial_owner")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">KYB / Beneficial Ownership</h1>
          <p className="text-sm text-gray-600">
            {company?.name ?? "Company"} · Add control person and beneficial owners (KYC vendor comes later).
          </p>
        </div>
        <Link className="underline text-sm font-medium" href="/dashboard/founder">
          Back
        </Link>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <section className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add person</h2>

        <form onSubmit={addPerson} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Role *</span>
              <select
                className="w-full border rounded px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="control_person">Control person</option>
                <option value="beneficial_owner">Beneficial owner</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Ownership % {role === "beneficial_owner" ? "*" : ""}</span>
              <input
                className="w-full border rounded px-3 py-2"
                value={ownershipPercent}
                onChange={(e) => setOwnershipPercent(e.target.value)}
                placeholder={role === "beneficial_owner" ? "e.g., 30" : "N/A"}
                disabled={role !== "beneficial_owner"}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">DOB (optional)</span>
              <input
                className="w-full border rounded px-3 py-2"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Legal first name *" value={first} setValue={setFirst} />
            <Field label="Legal last name *" value={last} setValue={setLast} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email *" value={email} setValue={setEmail} />
            <Field label="Phone (optional)" value={phone} setValue={setPhone} />
          </div>

          <button
            disabled={submitting}
            className="bg-black text-white rounded px-4 py-2 font-medium disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Add person"}
          </button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Control person</h2>
        {controlPeople.length === 0 ? (
          <p className="text-sm text-gray-600">None added yet (you will typically need 1).</p>
        ) : (
          <PeopleList people={controlPeople} onRemove={removePerson} />
        )}
      </section>

      <section className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Beneficial owners</h2>
        {owners.length === 0 ? (
          <p className="text-sm text-gray-600">No owners added.</p>
        ) : (
          <PeopleList people={owners} onRemove={removePerson} />
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string
  value: string
  setValue: (v: string) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  )
}

function PeopleList({
  people,
  onRemove,
}: {
  people: Person[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="divide-y border rounded">
      {people.map((p) => (
        <div key={p.id} className="p-4 flex items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="font-semibold">
              {p.legal_first_name} {p.legal_last_name}{" "}
              <span className="text-sm text-gray-600">· {p.kyc_status}</span>
            </div>
            <div className="text-sm text-gray-600">
              {p.email} {p.phone ? `· ${p.phone}` : ""}
              {p.relationship_role === "beneficial_owner" && p.ownership_percent !== null
                ? ` · Ownership: ${p.ownership_percent}%`
                : ""}
            </div>
          </div>

          <button
            onClick={() => onRemove(p.id)}
            className="text-sm font-medium underline"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
