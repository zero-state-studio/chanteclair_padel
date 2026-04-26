"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError("Credenziali non valide");
      setLoading(false);
    } else {
      router.push("/admin/torneo");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-court text-cream grain flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-5 flex items-center justify-between text-eyebrow text-cream/60">
          <Link href="/" className="hover:text-court-line transition-colors">
            ← Chanteclair
          </Link>
          <span>Area arbitri</span>
          <span className="hidden md:inline">accesso riservato</span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        {/* Left — editorial column */}
        <div className="relative hidden md:flex flex-col justify-between p-12 lg:p-16 border-r border-line bg-court-deep overflow-hidden">
          <div className="absolute inset-0 court-grid opacity-30 pointer-events-none" />

          <div className="relative text-eyebrow text-cream/50">
            01 / Accesso
          </div>

          <div className="relative">
            <div className="text-eyebrow text-court-line mb-4">
              — solo arbitri certificati
            </div>
            <h1 className="text-display-jumbo text-cream text-[7vw] leading-[0.85]">
              Sala
              <br />
              <span className="italic text-court-line">controllo</span>
            </h1>
            <p className="mt-8 max-w-md text-cream/70 text-base leading-relaxed">
              Da qui si registrano i risultati. Da qui parte la diretta. Ogni
              click apre un overlay sui tabelloni del club.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-4 text-eyebrow text-cream/40">
            <div>
              <div className="text-numeral text-court-line text-3xl leading-none mb-1">
                03
              </div>
              <div>Sezioni</div>
            </div>
            <div>
              <div className="text-numeral text-cream/60 text-3xl leading-none mb-1">
                ∞
              </div>
              <div>Match</div>
            </div>
            <div>
              <div className="text-numeral text-cream/60 text-3xl leading-none mb-1">
                1×
              </div>
              <div>Login</div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center p-8 md:p-12 lg:p-16">
          <div className="w-full max-w-md">
            <div className="text-eyebrow text-cream/50 mb-3">02 / Credenziali</div>
            <h2 className="font-display text-5xl text-cream leading-none">
              Accedi
            </h2>
            <p className="mt-3 text-cream/60 text-base">
              Email e password forniti dal coordinatore.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="text-eyebrow text-cream/50 block mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full bg-transparent border-b border-cream/30 focus:border-court-line outline-none py-3 text-cream font-body text-lg transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-eyebrow text-cream/50 block mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-transparent border-b border-cream/30 focus:border-court-line outline-none py-3 text-cream font-body text-lg transition-colors"
                />
              </div>

              {error && (
                <div className="border-l-2 border-clay pl-4 py-1">
                  <div className="text-eyebrow text-clay">errore</div>
                  <p className="text-cream/90 text-sm mt-1">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-10 group flex items-center justify-between gap-6 bg-court-line text-court px-6 py-4 rounded-sm hover:bg-[#e7ff75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-body font-semibold tracking-wider uppercase text-sm">
                  {loading ? "Accesso in corso..." : "Entra in sala"}
                </span>
                <span className="font-mono text-base group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </button>

              <p className="text-eyebrow text-cream/40 text-center pt-4">
                hai dimenticato? · contatta il coordinatore
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="accent-bar" />
    </main>
  );
}
