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

  // Founder-only
  const [companyName, setCompanyName] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [companyIndustry, setCompanyIndustry] = useState("")

  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      // Require a real session (not just a user object)
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) {
        console.error("getSession error:", sessionErr)
        setMessage(sessionErr.message)
        setLoading(false)
        return
      }

      const sessionUserId = sessionData.session?.user?.id
      console.log("SESSION user id:", sessionUserId)

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
      // 1) Hard session check
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) throw sessionErr
      if (!sessionData.session) {
        throw new Error("No active session. Confirm your email, then sign in again.")
      }
      console.log("SESSION user id (submit):", sessionData.session.user.id)

      // 2) Get user
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      const user = userData.user
      if (!user) throw new Error("Not signed in.")

      // 3) DB-layer identity proof (THIS is the key debug)
      const { data: who, error: whoErr } = await supabase.rpc("whoami")
      console.log("DB auth.uid():", who, "client user.id:", user.id)
      if (whoErr) console.log("whoami error:", whoErr)

      // If DB auth.uid() is null, you are effectively anon at the database layer.
      if (!who) {
        throw new Error(
          "DB auth.uid() is null. You are not authenticated at the database layer (RLS will block inserts). " +
            "Sign out, sign in again, and ensure email confirmation is complete."
        )
      }

      // 4) Validate required fields
      if (!fullName.trim()) throw new Error("Full name is required.")
      if (!legalFirst.trim()) throw new Error("Legal first name is required.")
      if (!legalLast.trim()) throw new Error("Legal last name is required.")
      if (!address1.trim()) throw new Error("Address line 1 is required.")
      if (!city.trim()) throw new Error("City is required.")
      if (!stateRegion.trim()) throw new Error("State/Region is required.")
      if (!postalCode.trim()) throw new Error("Postal code is required.")
      if (!country.trim()) throw new Error("Country is required.")
      if (role === "FOUNDER" && !companyName.trim()) throw new Error("Company name is required for founders.")

      // 5) Update profile
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

      // 6) Founder path: create company + membership
      if (role === "FOUNDER") {
        // IMPORTANT: created_by must match auth.uid() for your policy
        const insertObj = {
          created_by: user.id,
          name: companyName,
          website: companyWebsite || null,
          industry: companyIndustry || null,
        }
        console.log("Inserting company:", insertObj)

        const { data: company, error: companyErr } = await supabase
          .from("companies")
          .insert(insertObj)
          .select()
          .single()

        if (companyErr) throw companyErr
        console.log("Created company:", company)

        const { error: memberErr } = await supabase.from("company_members").insert({
          company_id: company.id,
          user_id: user.id,
          member_role: "OWNER",
        })

        if (memberErr) throw memberErr

        window.location.href = "/dashboard/founder"
        return
      }

      // 7) Provider path
      window.location.href = "/dashboard/provider"
    } catch (err: any) {
      console.error("Onboarding error:", err)
      setMessage(err?.message ?? "Something went wrong.")
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded-lg p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Finish setting up your account</h1>
        <p className="text-sm text-gray-600">
          We need this info for agreements and future KYC at the grant stage.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Role</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRole("FOUNDER")}
              className={`px-4 py-2 rounded border ${
                role === "FOUNDER" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Founder
            </button>
            <button
              type="button"
              onClick={() => setRole("PROVIDER")}
              className={`px-4 py-2 rounded border ${
                role === "PROVIDER" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Service Provider
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basic info</h2>
          <Field label="Full name" value={fullName} setValue={setFullName} required />
          <Field label="Phone" value={phone} setValue={setPhone} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Legal identity</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Legal first name" value={legalFirst} setValue={setLegalFirst} required />
            <Field label="Legal last name" value={legalLast} setValue={setLegalLast} required />
          </div>

          <Field label="Address line 1" value={address1} setValue={setAddress1} required />
          <Field label="Address line 2" value={address2} setValue={setAddress2} />
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City" value={city} setValue={setCity} required />
            <Field label="State/Region" value={stateRegion} setValue={setStateRegion} required />
            <Field label="Postal code" value={postalCode} setValue={setPostalCode} required />
          </div>
          <Field label="Country" value={country} setValue={setCountry} required />
        </section>

        {role === "FOUNDER" && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Company</h2>
            <Field label="Company name" value={companyName} setValue={setCompanyName} required />
            <Field label="Website" value={companyWebsite} setValue={setCompanyWebsite} />
            <Field label="Industry" value={companyIndustry} setValue={setCompanyIndustry} />
          </section>
        )}

        {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

        <button
          disabled={submitting}
          className="w-full bg-black text-white rounded px-4 py-3 font-medium disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </form>

      <div className="text-xs text-gray-500">
        Open DevTools Console to see debug logs for session + DB auth.uid().
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
