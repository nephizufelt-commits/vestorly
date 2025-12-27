export default function HomePage() {
  return (
    <section className="space-y-16">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold">
          Build Your Company With Talent, Not Cash
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Connect with skilled professionals willing to work for equity.
          Hire designers, developers, marketers, and operators in exchange for ownership.
        </p>

        <div className="flex justify-center gap-6">
          <a
            href="/founders"
            className="px-6 py-3 rounded bg-black text-white text-lg font-medium"
          >
            I’m a Founder
          </a>
          <a
            href="/providers"
            className="px-6 py-3 rounded border border-gray-300 text-lg font-medium"
          >
            I’m a Service Provider
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Feature
          title="Equity-Based Hiring"
          description="Exchange ownership for high-quality work without burning cash."
        />
        <Feature
          title="Built-In Cap Tables"
          description="Track equity grants, vesting, and ownership in one place."
        />
        <Feature
          title="Simple Legal Flow"
          description="Generate agreements and finalize them via DocuSign or Google Workspace."
        />
      </div>
    </section>
  )
}

function Feature({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
