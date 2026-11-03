import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const messages: Record<string, string> = {
  missing: "Geli email-ka iyo password-ka.",
  credentials: "Email ama password sax ma aha.",
  session: "Xiriirka dib-u-dejintu wuu dhacay. Codso mid cusub.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const claims = claimsData?.claims;
    if (claims) redirect("/dashboard");
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-white">
      <section className="hidden lg:flex flex-col justify-between bg-[#122E40] p-14 text-white">
        <div className="text-sm font-bold tracking-[.2em]">HARQAANLE</div>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-teal-200">Digital Tailoring</p>
          <h1 className="text-5xl font-semibold leading-tight">Dalab kasta. Cabbir kasta. Hal meel.</h1>
          <p className="mt-6 max-w-md text-white/70">Maamul macaamiisha, shaqada tolidda iyo qaadashada dharka si fudud.</p>
        </div>
        <p className="text-xs text-white/50">Gelitaan ganacsi oo ammaan ah</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <p className="mb-2 text-sm font-bold tracking-[.18em] text-[#0F6B7A] lg:hidden">HARQAANLE</p>
          <h2 className="text-3xl font-semibold text-[#122E40]">Ku soo dhowow</h2>
          <p className="mt-2 text-sm text-slate-600">Ku gal email-ka iyo password-kaaga.</p>
          {(!url || !key) && <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ku dar Supabase URL iyo publishable key faylka deegaanka si Auth u shaqeeyo.</div>}
          {query.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{messages[query.error] ?? "Gelitaanku ma suurtagelin."}</p>}
          <form action={signIn} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-slate-700">Email
              <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0F6B7A] focus:ring-2 focus:ring-teal-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Password
              <input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0F6B7A] focus:ring-2 focus:ring-teal-100" />
            </label>
            <div className="text-right"><Link className="text-sm font-medium text-[#0F6B7A] hover:underline" href="/auth/recovery">Password ma illowday?</Link></div>
            <button className="w-full rounded-xl bg-[#0F6B7A] px-4 py-3 font-semibold text-white hover:bg-[#0b5865]">Gal</button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-500">Akoon cusub waxaa abuura maamulka ganacsiga. Isdiiwaangelin furan ma jirto.</p>
        </div>
      </section>
    </main>
  );
}
