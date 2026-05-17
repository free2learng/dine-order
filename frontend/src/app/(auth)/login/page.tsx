import { LoginForm } from '@/components/staff/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ background: '#0f172a' }}>
      {/* Left panel — hero (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=900&fit=crop"
          alt="Restaurant"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="relative flex flex-col justify-end p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">DineOrder Platform</p>
          <h2 className="text-4xl font-bold text-white leading-snug" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
            Smarter ordering.<br />Happier guests.
          </h2>
          <p className="text-white/60 text-base mt-3 max-w-sm">
            Manage orders, track tables, and serve faster — all from one dashboard.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:max-w-md lg:flex-none lg:w-[420px]">
        {/* Logo */}
        <div className="w-full max-w-sm mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: '#c8a96e' }}>
              D
            </div>
            <span className="text-white font-bold text-lg tracking-tight">DineOrder</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your staff account</p>
        </div>

        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
