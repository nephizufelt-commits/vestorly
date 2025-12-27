"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [opps, setOpps] = useState<any[]>([])
  const [apps, setApps] = useState<any[]>([])
  const [grants, setGrants] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setMessage(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signin"
        return
      }

      // Confirm admin via DB function (so UI can’t fake it)
      const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin")
      if (adminErr) {
        setMessage(adminErr.message)
        setLoading(false)
        return
      }
      if (!isAdmin) {
        setMessage("Access denied. You are not an admin.")
        setLoading(false)
        return
      }

      const [u, c, o, a, g] = await Promise.all([
        supabase.from("profiles").select("id,role,full_name,kyc_status,created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("companies").select("id,name,created_by,created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("opportunities").select("id,title,status,company_id,created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("applications").select("id,status,opportunity_id,provider_user_id,created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("equity_grants").select("id,status,company_id,recipient_user_id,granted_by_user_id,created_at").order("created_at", { ascending: false }).limit(50),
      ])

      if (u.error) throw u.error
      if (c.error) throw c.error
      if (o.error) throw o.error
      if (a.error) throw a.error
      if (g.error) throw g.error

      setUsers(u.data ?? [])
      setCompanies(c.data ?? [])
      setOpps(o.data ?? [])
      setApps(a.data ?? [])
      setGrants(g.data ?? [])

      setLoading(false)
    })().catch((err: any) => {
      setMessage(err?.message ?? "Something went wrong.")
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">System overview (last 50 records each).</p>
        </div>
        <Link className="underline text-sm font-medium" href="/">
          Home
        </Link>
      </div>

      {message && <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>}

      <Section title="Users (profiles)" rows={users} />
      <Section title="Companies" rows={companies} />
      <Section title="Opportunities" rows={opps} />
      <Section title="Applications" rows={apps} />
      <Section title="Equity grants" rows={grants} />
    </div>
  )
}

function Section({ title, rows }: { title: string; rows: any[] }) {
  return (
    <section className="bg-white border rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-gray-600">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">No records.</p>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(rows[0]).map((k) => (
                  <th key={k} className="text-left p-2 border-b">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  {Object.keys(rows[0]).map((k) => (
                    <td key={k} className="p-2 border-b">
                      {String(r[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
