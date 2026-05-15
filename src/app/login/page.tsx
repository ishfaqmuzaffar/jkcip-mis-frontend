"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api";
import { Eye, EyeOff, Leaf, Shield } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Read directly from DOM — handles browser autofill correctly
    const email = emailRef.current?.value?.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a3a2a 0%, #2d6b4e 60%, #15803d 100%)" }}
      >
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Government of J&K</p>
              <p className="text-white/60 text-xs">Agriculture & Allied Sectors</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 bg-saffron-600/20 border border-saffron-400/30 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-saffron-400 animate-pulse" />
            <span className="text-saffron-200 text-xs font-medium">IFAD-Funded Project</span>
          </div>
          <h1 className="text-4xl font-bold text-white font-display leading-tight">
            JKCIP Management<br />
            <span className="text-saffron-300">Information System</span>
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Monitoring & evaluation platform for the Competitiveness Improvement of Agriculture
            and Allied Sectors Project in Jammu & Kashmir.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Outcomes", value: "5" },
              { label: "Indicators", value: "40+" },
              { label: "Districts", value: "20" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white font-display">{s.value}</p>
                <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <p className="text-white/40 text-xs">
            JKCIP · IFAD · Government of Jammu & Kashmir<br />
            Project Period: 2024 – 2031
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">JKCIP MIS</p>
              <p className="text-slate-500 text-xs">Government of J&K</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 font-display">Sign in</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the MIS</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                className="form-input"
                placeholder="you@jk.gov.in"
                autoComplete="email"
                defaultValue=""
              />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPass ? "text" : "password"}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  defaultValue=""
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in to MIS"
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Access Roles</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>· <strong>Admin</strong> — Full system access</p>
              <p>· <strong>Dept. Officer</strong> — Review & approve</p>
              <p>· <strong>Data Entry</strong> — Enter & update data</p>
              <p>· <strong>Viewer</strong> — Read-only access</p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            JKCIP MIS · Agriculture Production & Farmers Welfare Dept.
          </p>
        </div>
      </div>
    </div>
  );
}
