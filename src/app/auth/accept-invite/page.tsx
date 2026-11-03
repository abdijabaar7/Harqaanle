import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInvitations } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", claims.sub)
    .maybeSingle();

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 bg-slate-50">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 sm:p-8 shadow-sm">
        <p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p>
        <h1 className="mt-4 text-2xl font-bold text-[#122E40]">Aqbal casuumaadda</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Ku soo dhowow nidaamka. Deji magacaaga iyo password-ka aad ku geli doonto.
        </p>

        {query.error && (
          <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3.5 text-sm text-red-800 border border-red-100">
            Casuumaadda lama dhammaystirin. Hubi inaad ka furtay link-gii email-kaaga.
          </div>
        )}

        <form action={acceptInvitations} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Magacaaga
            </label>
            <input
              name="display_name"
              type="text"
              defaultValue={profile?.display_name ?? ""}
              placeholder="Tusaale: Axmed Cali"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Samee Password cusub
            </label>
            <input
              name="password"
              type="password"
              minLength={6}
              placeholder="Ugu yaraan 6 xaraf"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5763] active:scale-[0.99]"
          >
            Aqbal oo Gal Nidaamka
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-slate-500 hover:text-slate-800">
            Hore ma u leedahay akoon? Gal halkan
          </Link>
        </div>
      </section>
    </main>
  );
}
