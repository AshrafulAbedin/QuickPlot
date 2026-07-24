import { AuthButton } from './features/auth'
import { WorkspacePanel } from './features/workspace'

const VB_W = 460
const VB_H = 300
const X_MIN = -6
const X_MAX = 6
const Y_MIN = -3.2
const Y_MAX = 3.2

function toPath(fn: (x: number) => number, samples = 160): string {
  const pts: string[] = []
  for (let i = 0; i <= samples; i++) {
    const x = X_MIN + ((X_MAX - X_MIN) * i) / samples
    const y = fn(x)
    if (!Number.isFinite(y)) continue
    const px = ((x - X_MIN) / (X_MAX - X_MIN)) * VB_W
    const py = VB_H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * VB_H
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
}

function HeroPlot() {
  const gridLines = []
  for (let gx = 0; gx <= VB_W; gx += VB_W / 12) gridLines.push(<line key={`v${gx}`} x1={gx} y1={0} x2={gx} y2={VB_H} />)
  for (let gy = 0; gy <= VB_H; gy += VB_H / 8) gridLines.push(<line key={`h${gy}`} x1={0} y1={gy} x2={VB_W} y2={gy} />)

  const axisY = VB_H - ((0 - Y_MIN) / (Y_MAX - Y_MIN)) * VB_H
  const axisX = ((0 - X_MIN) / (X_MAX - X_MIN)) * VB_W

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto rounded-xl bg-neutral-950/60" role="img" aria-label="Example plot of sine and a parabola">
      <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">{gridLines}</g>
      <line x1={0} y1={axisY} x2={VB_W} y2={axisY} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <line x1={axisX} y1={0} x2={axisX} y2={VB_H} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <path d={toPath((x) => 2 * Math.sin(x))} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      <path d={toPath((x) => 0.25 * x * x - 2)} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
      <path d={toPath((x) => 1.6 * Math.cos(x * 1.5))} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
    </svg>
  )
}

const FEATURES = [
  { title: '2D Graphing', body: 'Cartesian, polar, parametric and implicit curves rendered on a fast canvas.' },
  { title: 'Parameters & Sliders', body: 'Auto-detected variables become sliders you can animate in real time.' },
  { title: 'Save & Share', body: 'Save workspaces to the cloud and share a read-only link with anyone.' },
  { title: 'Import & Export', body: 'Move graphs between machines as portable JSON files.' },
]

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 hover:border-neutral-700 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-3">
        <span className="text-amber-400 font-mono text-sm">f(x)</span>
      </div>
      <h3 className="text-neutral-100 font-semibold text-sm mb-1">{title}</h3>
      <p className="text-neutral-400 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="6" fill="#0a0a0f" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M3 20 Q9 4 13 13 T23 6" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-semibold tracking-tight text-neutral-100">
        Quick<span className="text-amber-400">Plot</span>
      </span>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <Logo />
          <nav className="hidden sm:flex items-center gap-6 text-sm text-neutral-400">
            <a href="#features" className="hover:text-neutral-100 transition-colors">Features</a>
            <a href="#workspaces" className="hover:text-neutral-100 transition-colors">Workspaces</a>
          </nav>
          <AuthButton />
        </div>
      </header>

      <section className="relative grid-bg border-b border-neutral-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_0%,rgba(251,191,36,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-400 mb-5">
              A graphing calculator for the web
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-50 leading-[1.1]">
              Plot anything.{' '}
              <span className="text-amber-400">Instantly.</span>
            </h1>
            <p className="mt-4 text-neutral-400 text-lg leading-relaxed max-w-md">
              Type an equation and watch it come to life. Cartesian, polar,
              parametric, and implicit curves — with sliders, sharing, and cloud save.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#workspaces" className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-300 transition-colors">
                Get started
              </a>
              <a href="#features" className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 transition-colors">
                See features
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 shadow-2xl">
            <HeroPlot />
            <div className="flex items-center gap-4 px-2 py-2 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-amber-400"><span className="w-3 h-0.5 bg-amber-400 inline-block" /> y = 2·sin(x)</span>
              <span className="flex items-center gap-1.5 text-cyan-400"><span className="w-3 h-0.5 bg-cyan-400 inline-block" /> y = ¼x² − 2</span>
              <span className="flex items-center gap-1.5 text-violet-400"><span className="w-3 h-0.5 bg-violet-400 inline-block" /> y = 1.6·cos(1.5x)</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 py-16 w-full">
        <h2 className="text-2xl font-bold text-neutral-100 mb-1">Everything you need to visualize math</h2>
        <p className="text-neutral-400 mb-8">Built as a fast, shareable graphing tool.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      <section id="workspaces" className="border-t border-neutral-800 bg-neutral-950/50">
        <div className="mx-auto max-w-6xl px-5 py-16 w-full">
          <h2 className="text-2xl font-bold text-neutral-100 mb-1">Your workspaces</h2>
          <p className="text-neutral-400 mb-6">Sign in with Google to save, load, and share your graphs.</p>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 max-w-md">
            <WorkspacePanel />
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-neutral-800">
        <div className="mx-auto max-w-6xl px-5 py-6 flex items-center justify-between text-xs text-neutral-500">
          <Logo />
          <span>If you like QuickPlot, Please share with your friends</span>
        </div>
      </footer>
    </div>
  )
}
