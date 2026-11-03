import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const query = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p>
        <h1 className="mt-5 text-2xl font-semibold text-[#122E40]">Password dib u deji</h1>
        <p className="mt-2 text-sm text-slate-600">Geli email-kaaga. Haddii akoonku jiro, waxaan kuu soo diraynaa link ammaan ah.</p>
        {query.sent && <p role="status" className="mt-5 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Haddii email-ku leeyahay akoon, link dib-u-dejin ah ayaa loo diray.</p>}
        <form action={requestPasswordReset} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Email
            <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#0F6B7A] focus:outline-none" />
          </label>
          <button className="w-full rounded-xl bg-[#0F6B7A] px-4 py-3 font-semibold text-white">Dir link-ga</button>
        </form>
        <Link href="/login" className="mt-6 inline-block text-sm text-[#0F6B7A]">← Ku noqo gelitaanka</Link>
      </section>
    </main>
  );
}
