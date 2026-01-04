"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Role = "FOUNDER" | "PROVIDER"

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState<Role>("PROVIDER")

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [legalFirst, setLegalFirst] = useState("")
  const [legalLast, setLegalLast] = useState("")
  const [address1, setAddress1] = useState("")
  const [address2, setAddress2] = useState("")
  const [city, setCity] = useState("")
  const [stateRegion, setStateRegion] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("US")

  const [companyName, setCompanyName] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [companyIndustry, setCompanyIndustry] = useState("")

  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }
      setLoading(false)
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error("No active session.")

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) throw new Error("Not signed in.")

      const { data: who } = await supabase.rpc("whoami")
      if (!who) {
        throw new Error(
          "You are not authenticated at the database layer. Please sign out and sign back in."
        )
      }

      if (!fullName.trim()) throw new Error("Full name is required.")
      if (!legalFirst.trim()) throw new Error("Legal first name is required.")
      if (!legalLast.trim()) throw new Error("Legal last name is required.")
      if (!address1.trim()) throw new Error("Address line 1 is required.")
      if (!city.trim()) throw new Error("City is required.")
      if (!stateRegion.trim()) throw new Error("State/Region is required.")
      if (!postalCode.trim()) throw new Error("Postal code is required.")
      if (!country.trim()) throw new Error("Country is required.")
      if (role === "FOUNDER" && !companyName.trim()) {
        throw new Error("Company name is required for founders.")
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          role,
          full_name: fullName,
          phone: phone || null,
          legal_first_name: legalFirst,
          legal_last_name: legalLast,
          address_line1: address1,
          address_line2: address2 || null,
          city,
          state_region: stateRegion,
          postal_code: postalCode,
          country,
        })
        .eq("id", user.id)

      if (profileErr) throw profileErr

      if (role === "FOUNDER") {
        const { data: company, error: companyErr } = await supabase
          .from("companies")
          .insert({
            created_by: user.id,
            name: companyName,
            website: companyWebsite || null,
            industry: companyIndustry || null,
          })
          .select()
          .single()

        if (companyErr) throw companyErr

        const { error: memberErr } = await supabase
          .from("company_members")
          .insert({
            company_id: company.id,
            user_id: user.id,
            member_role: "OWNER",
          })

        if (memberErr) throw memberErr

        window.location.href = "/dashboard/founder"
        return
      }

      window.location.href = "/dashboard/provider"
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading…</div>

  return (
    <div className="bg-soft/40 min-h-screen py-12">
      <div className="max-w-2xl mx-auto px-6">
        <div className="rounded-xl border border-soft bg-white p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              Finish setting up your account
            </h1>
            <p className="mt-1 text-sm text-muted">
              This information is required for equity agreements and future verification.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Role */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide">
                Your role
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <RoleButton
                  active={role === "FOUNDER"}
                  onClick={() => setRole("FOUNDER")}
                  title="Founder"
                  subtitle="Hiring with equity"
                />
                <RoleButton
                  active={role === "PROVIDER"}
                  onClick={() => setRole("PROVIDER")}
                  title="Service Provider"
                  subtitle="Working for equity"
                />
              </div>
            </section>

            {/* Personal */}
            <Section title="Basic information">
              <Field label="Full name" value={fullName} setValue={setFullName} required />
              <Field label="Phone" value={phone} setValue={setPhone} />
            </Section>

            {/* Legal */}
            <Section title="Legal identity">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Legal first name" value={legalFirst} setValue={setLegalFirst} required />
                <Field label="Legal last name" value={legalLast} setValue={setLegalLast} required />
              </div>

              <Field label="Address line 1" value={address1} setValue={setAddress1} required />
              <Field label="Address line 2" value={address2} setValue={setAddress2} />
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="City" value={city} setValue={setCity} required />
                <Field label="State / Region" value={stateRegion} setValue={setStateRegion} required />
                <Field label="Postal code" value={postalCode} setValue={setPostalCode} required />
              </div>
              <Field label="Country" value={country} setValue={setCountry} required />
            </Section>

            {/* Company */}
            {role === "FOUNDER" && (
              <Section title="Company">
                <Field label="Company name" value={companyName} setValue={setCompanyName} required />
                <Field label="Website" value={companyWebsite} setValue={setCompanyWebsite} />
                <Field label="Industry" value={companyIndustry} setValue={setCompanyIndustry} />
              </Section>
            )}

            {message && (
              <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
                {message}
              </div>
            )}

            <button
              disabled={submitting}
              className="
                w-full
                rounded-md
                bg-primary
                py-3
                text-sm font-semibold text-white
                hover:opacity-90
                disabled:opacity-50
              "
            >
              {submitting ? "Saving…" : "Continue"}
            </button>
          </form>

          <div className="text-xs text-muted">
            This information is stored securely and used only for legal agreements.
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  )
}

function RoleButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-lg border px-4 py-3 text-left transition
        ${active
          ? "border-primary bg-accentSoft"
          : "border-soft bg-white hover:bg-soft"}
      `}
    >
      <div className="font-semibold text-text">{title}</div>
      <div className="text-sm text-muted">{subtitle}</div>
    </button>
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
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        className="
          w-full
          rounded-md
          border border-soft
          px-3 py-2
          text-sm
          focus:outline-none
          focus:ring-2
          focus:ring-primary/40
        "
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
      />
    </label>
  )
}
