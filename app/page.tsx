export default function HomePage() {
  return (
    <div className="bg-soft/40">
      <section className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        {/* Hero */}
        <div className="text-center space-y-6">
          <span className="inline-block rounded-full bg-accentSoft px-4 py-1 text-sm font-medium text-primary">
            Equity-based hiring
          </span>

          <h1 className="text-5xl font-semibold text-text leading-tight">
            Build Your Company With Talent,
            <span className="text-primary"> Not Cash</span>
          </h1>

          <p className="text-xl text-muted max-w-2xl mx-auto">
            Connect with skilled professionals willing to work for equity.
            Hire designers, developers, marketers, and operators in exchange for ownership.
          </p>

          <div className="flex justify-center gap-6 pt-4">
            <a
              href="/founders"
              className="rounded-md bg-primary px-6 py-3 text-lg font-semibold text-white hover:opacity-90"
            >
              I’m a Founder
            </a>
            <a
              href="/providers"
              className="rounded-md border border-soft bg-white px-6 py-3 text-lg font-semibold text-text hover:bg-soft"
            >
              I’m a Service Provider
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-8 md:grid-cols-3">
          <Feature
            title="Equity-Based Hiring"
            description="Exchange ownership for high-quality work without burning cash."
            accent="primary"
          />
          <Feature
            title="Built-In Cap Tables"
            description="Track equity grants, vesting, and ownership in one place."
            accent="green"
          />
          <Feature
            title="Simple Legal Flow"
            description="Generate agreements and finalize them via DocuSign or Google Workspace."
            accent="amber"
          />
        </div>
      </section>
    </div>
  )
}

function Feature({
  title,
  description,
  accent,
}: {
  title: string
  description: string
  accent: "primary" | "green" | "amber"
}) {
  const accentMap = {
    primary: "bg-primary",
    green: "bg-green-500",
    amber: "bg-amber-500",
  }

  return (
    <div className="rounded-xl border border-soft bg-white p-6 space-y-3 transition hover:shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`h-3 w-3 rounded-full ${accentMap[accent]}`}
        />
        <h3 className="text-lg font-semibold text-text">
          {title}
        </h3>
      </div>
      <p className="text-muted">
        {description}
      </p>
    </div>
  )
}
