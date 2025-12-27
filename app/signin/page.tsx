"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      if (mode === "signup") {
        // Send confirmation email. Do NOT assume user is signed in.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // After confirming, send them back to your app.
            // This route exists in Next automatically; Supabase uses it for auth redirects.
            emailRedirectTo: `${window.location.origin}/signin`,
          },
        })
        if (error) throw error

        setMessage(
          "Check your email to confirm your account. After confirming, come back here and sign in."
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        // Only after a real sign-in do we send them into onboarding.
        window.location.href = "/onboarding"
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded-lg p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        {mode === "signin" ? "Sign In" : "Create Account"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
          />
        </label>

        <button
          disabled={loading}
          className="w-full bg-black text-white rounded px-3 py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Working..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      {message && (
        <div className="text-sm bg-gray-50 border rounded p-3">{message}</div>
      )}

      <div className="text-sm">
        {mode === "signin" ? (
          <>
            Don’t have an account?{" "}
            <button className="underline" onClick={() => setMode("signup")}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Already confirmed your email?{" "}
            <button className="underline" onClick={() => setMode("signin")}>
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}
