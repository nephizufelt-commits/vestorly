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

  const [role, setRole] = useState<"control_person" | "beneficial_owner">("control_person")
  const [ownershipPercent, setOwnershipPercent] = useState("")
  const [first, setFirst] = useState("")
  const [last, setLast] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")

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
        if (!ownershipPercent.trim()) throw new Error("Ownership percent is required.")
        const n = Number(ownershipPercent)
        if (Number.isNaN(n) || n <= 0 || n > 100) {
          throw new Error("Ownership percent must be between 0 and 100.")
        }
        ownership = n
      }

      const { data: created, error } = await supabase
        .from("company_persons")
        .insert({
          company_id: companyId,
          relationship_role: role,
          ownership_percent: ownership,
          legal_first_name: first,
          legal_last_name: last,
          email,
          phone: phone || null,
          date_of_birth: dob || null,
          kyc_status: "unverified",
        })
        .select()
        .single()

      if (error) throw error

      setPeople((prev) => [created as Person, ...prev])
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

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  const controlPeople = people.filter((p) => p.relationship_role === "control_person")
  const owners = people.filter((p) => p.relationship_role === "beneficial_owner")

  return (
    <div className="bg-soft/40">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              KYB / Beneficial Ownership
            </h1>
            <p className="text-sm text-muted">
              {company?.name} · Required for compliance and payouts
            </p>
          </div>

          <Link
            className="text-sm font-medium text-primary hover:underline"
            href="/dashboard/founder"
          >
            Back
          </Link>
        </div>

        {message && (
          <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
            {message}
          </div>
        )}

        {/* Add Person */}
        <section className="rounded-xl border border-soft bg-white p-6 space-y-5">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Add person
          </h2>

          <form onSubmit={addPerson} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <SelectField label="Role *" value={role} setValue={setRole}>
                <option value="control_person">Control person</option>
                <option value="beneficial_owner">Beneficial owner</option>
              </SelectField>

              <Field
                label={`Ownership % ${role === "beneficial_owner" ? "*" : ""}`}
                value={ownershipPercent}
                setValue={setOwnershipPercent}
                disabled={role !== "beneficial_owner"}
              />

              <Field label="DOB (optional)" value={dob} setValue={setDob} />
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
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Add person"}
            </button>
          </form>
        </section>

        {/* Lists */}
        <PeopleSection
          title="Control person"
          people={controlPeople}
          onRemove={removePerson}
          emptyText="None added yet (usually required)."
        />

        <PeopleSection
          title="Beneficial owners"
          people={owners}
          onRemove={removePerson}
          emptyText="No owners added."
        />
      </div>
    </div>
  )
}

/* ---------- Shared UI ---------- */

function Field({
  label,
  value,
  setValue,
  disabled,
}: {
  label: string
  value: string
  setValue: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-text">{label}</span>
      <input
        disabled={disabled}
        className="w-full border border-soft rounded px-3 py-2 disabled:bg-soft/50"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  setValue,
  children,
}: {
  label: string
  value: string
  setValue: (v: any) => void
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-text">{label}</span>
      <select
        className="w-full border border-soft rounded px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function PeopleSection({
  title,
  people,
  onRemove,
  emptyText,
}: {
  title: string
  people: Person[]
  onRemove: (id: string) => void
  emptyText: string
}) {
  return (
    <section className="rounded-lg border border-soft bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        {title}
      </h2>

      {people.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="divide-y border border-soft rounded">
          {people.map((p) => (
            <div
              key={p.id}
              className="p-4 flex items-start justify-between gap-6 hover:bg-soft/40 transition"
            >
              <div className="space-y-1">
                <div className="font-medium text-text">
                  {p.legal_first_name} {p.legal_last_name}{" "}
                  <span className="text-xs uppercase tracking-wide text-muted">
                    · {p.kyc_status}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {p.email}
                  {p.phone ? ` · ${p.phone}` : ""}
                  {p.relationship_role === "beneficial_owner" && p.ownership_percent !== null
                    ? ` · Ownership: ${p.ownership_percent}%`
                    : ""}
                </div>
              </div>

              <button
                onClick={() => onRemove(p.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
