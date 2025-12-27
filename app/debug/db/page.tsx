"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function DbDebugPage() {
  const [out, setOut] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setOut({ error: "Not signed in. Go to /signin first." })
        return
      }

      const { data, error } = await supabase.from("_env_fingerprint").select("*").single()
      setOut(error ? { error } : { data })
    })()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">DB Fingerprint</h1>
      <pre className="text-xs bg-gray-50 border rounded p-4 overflow-auto">
        {JSON.stringify(out, null, 2)}
      </pre>
    </div>
  )
}
