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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/signin`,
          },
        })
        if (error) throw error

        setMessage(
          "Check your email to confirm your account. After confirming, return here to sign in."
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        window.location.href = "/onboarding"
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-soft/40 min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-soft bg-white p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-text">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted">
              {mode === "signin"
                ? "Sign in to continue to your dashboard."
                : "Get started with equity-based collaboration."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-text">Email</span>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-text">Password</span>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted">
                  Minimum 8 characters.
                </p>
              )}
            </label>

            <button
              disabled={loading}
              className="
                w-full
                rounded-md
                bg-primary
                py-2.5
                text-sm font-semibold text-white
                hover:opacity-90
                disabled:opacity-50
              "
            >
              {loading
                ? "Working…"
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div className="rounded-lg border border-soft bg-soft p-4 text-sm text-text">
              {message}
            </div>
          )}

          {/* Mode switch */}
          <div className="text-sm text-muted">
            {mode === "signin" ? (
              <>
                Don’t have an account?{" "}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already confirmed your email?{" "}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer trust note */}
        <div className="mt-4 text-center text-xs text-muted">
          Secure authentication · Email confirmation required
        </div>
      </div>
    </div>
  )
}
