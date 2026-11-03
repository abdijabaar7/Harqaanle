import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm sm:p-10">
        <h1 className="text-2xl font-semibold text-[#122E40]">Samee password cusub</h1>
        {query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Password-ku ha ahaado ugu yaraan 10 xaraf, labada meeloodna ha isku mid noqdaan.</p>}
        <form action={updatePassword} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Password cusub
            <input name="password" type="password" minLength={10} autoComplete="new-password" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
          </label>
          <label className="block text-sm font-medium">Ku celi password-ka
            <input name="confirmation" type="password" minLength={10} autoComplete="new-password" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
          </label>
          <button className="w-full rounded-xl bg-[#0F6B7A] px-4 py-3 font-semibold text-white">Cusboonaysii</button>
        </form>
        <Link href="/login" className="mt-6 inline-block text-sm text-[#0F6B7A]">Ku noqo login</Link>
      </section>
    </main>
  );
}
