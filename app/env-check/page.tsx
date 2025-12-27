export default function EnvCheckPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Env Check</h1>

      <div className="bg-white border rounded p-4 space-y-2">
        <div>
          <div className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_URL</div>
          <pre className="text-xs overflow-auto">{String(url)}</pre>
        </div>

        <div>
          <div className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY (first 12)</div>
          <pre className="text-xs overflow-auto">
            {key ? key.slice(0, 12) + "..." : String(key)}
          </pre>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        If either value shows "undefined", your .env file is not being loaded.
      </p>
    </div>
  )
}
