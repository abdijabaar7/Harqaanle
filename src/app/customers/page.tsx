import Link from "next/link";
import { redirect } from "next/navigation";
import { createCustomer } from "@/app/customers/actions";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ business?: string; error?: string; created?: string; q?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string; role: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership || membership.role !== "business_admin") return <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Gelitaan lama oggola</h1><p className="mt-2 text-sm text-slate-600">Maamulka macaamiisha waxaa heli kara Business Admin-ka ganacsiga.</p><Link className="mt-5 inline-block text-[#0F6B7A]" href="/dashboard">Dashboard</Link></main>;

  const [{ data: business }, { data: customers, error }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle(),
    (() => {
      const term = (query.q ?? "").replace(/[^a-zA-Z0-9 +\-]/g, "").trim();
      const request = supabase.from("customers").select("id, name, phone, created_at").eq("business_id", membership.business_id).is("archived_at", null).order("name").limit(100);
      return term ? request.or(`name.ilike.%${term}%,phone.ilike.%${term}%`) : request;
    })(),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8">
      <Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-slate-500">{business?.name}</p><h1 className="text-2xl font-semibold text-[#122E40]">Macaamiisha</h1></div><Link href={`/orders/new?business=${membership.business_id}`} className="rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">+ Dalab cusub</Link></div>
      {query.created && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Macmiilka waa la diiwaangeliyey.</p>}
      {(query.error || error) && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Xogta lama kaydin ama lama soo qaadi karin.</p>}
      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-[#122E40]">Liiska macaamiisha</h2><Link href={`/measurements?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">Cabbirrada</Link></div>
          <form className="mt-4 flex gap-2"><input type="hidden" name="business" value={membership.business_id} /><input name="q" defaultValue={query.q} placeholder="Raadi magac ama telefoon" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><button className="rounded-xl bg-slate-100 px-4 text-sm font-medium">Raadi</button></form>
          {!customers?.length ? <div className="py-12 text-center"><p className="font-medium">Macmiil weli ma jiro</p><p className="mt-2 text-sm text-slate-500">Ka diiwaangeli macmiilka koowaad foomka dhinaca.</p></div> : <ul className="mt-4 divide-y divide-slate-100">{customers.map((customer: { id: string; name: string; phone: string }) => <li key={customer.id} className="py-4"><Link href={`/customers/${customer.id}?business=${membership.business_id}`} className="block"><p className="font-medium text-slate-800">{customer.name}</p><p className="mt-1 text-sm text-slate-500">{customer.phone}</p></Link></li>)}</ul>}
        </div>
        <form action={createCustomer} className="h-fit rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#122E40]">Macmiil cusub</h2>
          <input type="hidden" name="business_id" value={membership.business_id} />
          <label className="mt-5 block text-sm font-medium">Magaca
            <input name="name" required maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" />
          </label>
          <label className="mt-4 block text-sm font-medium">Telefoon
            <input name="phone" required type="tel" autoComplete="tel" maxLength={40} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" />
          </label>
          <button className="mt-5 w-full rounded-xl bg-[#122E40] px-4 py-3 text-sm font-semibold text-white">Kaydi macmiilka</button>
        </form>
      </section>
    </main>
  );
}
