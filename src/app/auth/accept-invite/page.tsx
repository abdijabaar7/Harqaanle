import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInvitations } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  return <main className="flex min-h-screen items-center justify-center px-5"><section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm"><p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p><h1 className="mt-5 text-2xl font-semibold text-[#122E40]">Aqbal casuumaadda</h1><p className="mt-2 text-sm text-slate-600">Markaad aqbasho, gelitaanka ganacsiga laguu casuumay ayaa firfircoonaanaya.</p>{query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Casuumaad sugaysa lama helin ama email-ka lama xaqiijin. Ka fur link-ga email-ka cusub.</p>}<form action={acceptInvitations} className="mt-6"><button className="w-full rounded-xl bg-[#0F6B7A] px-4 py-3 font-semibold text-white">Aqbal oo sii wad</button></form><Link href="/login" className="mt-5 inline-block text-sm text-[#0F6B7A]">Ka bax</Link></section></main>;
}
