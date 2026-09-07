/**
 * Shown when the Supabase environment variables are missing.
 *
 * The previous build faked auth, credits and audio in the browser, so it
 * "worked" with no backend at all. Failing loudly here is deliberate: there is
 * no offline mode that could be mistaken for the real product.
 */
export default function SetupRequiredPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold mb-4">Jamz needs its backend</h1>
        <p className="text-white/60 mb-6">
          Set the Supabase environment variables, then restart the dev server.
        </p>
        <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm overflow-x-auto mb-6">
          {`cp .env.example .env
# fill in:
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>`}
        </pre>
        <p className="text-white/40 text-sm">
          See <code className="text-white/70">README.md</code> for the full setup, including
          database migrations, edge functions and Stripe.
        </p>
      </div>
    </div>
  );
}
