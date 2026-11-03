import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createBusinessAndInviteOwner, setBusinessStatus } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

type Membership = { business_id: string; role: "business_admin" | "tailor_staff"; status: string };
type Business = { id: string; name: string; status: string };

function shortDate(value: string) {
  return new Intl.DateTimeFormat("so-SO", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ business?: string; notice?: string; error?: string; invited?: string; "created-business"?: string; "status-updated"?: string }> }) {
  const query = await searchParams;
  const requestedBusiness = query.business;
  const notice = query.notice;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return <main className="mx-auto mt-20 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-2xl font-semibold">Supabase lama habayn</h1><p className="mt-3 text-slate-600">Ku samee faylka <code>.env.local</code> adigoo ka duulaya <code>.env.example</code>.</p><Link href="/login" className="mt-5 inline-block text-[#0F6B7A]">Tag login</Link></main>;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name, platform_role").eq("user_id", claims.sub).maybeSingle(),
    supabase.from("business_members").select("business_id, role, status").eq("user_id", claims.sub).eq("status", "active"),
  ]);
  const isSuperAdmin = profile?.platform_role === "super_admin";

  if (isSuperAdmin) {
    const { data: businesses, error } = await supabase.from("businesses").select("id, name, status, created_at").order("created_at", { ascending: false });
    return (
      <main className="min-h-screen">
        <header className="flex items-center justify-between bg-[#122E40] px-5 py-4 text-white sm:px-8">
          <div><p className="text-xs tracking-[.18em] text-white/60">HARQAANLE</p><p className="mt-1 font-semibold">Super Admin</p></div>
          <form action={signOut}><button className="rounded-lg border border-white/30 px-3 py-2 text-sm">Ka bax</button></form>
        </header>
        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <h1 className="text-2xl font-semibold text-[#122E40]">Ganacsiyada</h1>
          <p className="mt-2 text-sm text-slate-600">Maamulka ganacsiyada iyo xaaladdooda. Macaamiisha, cabbirrada, dalabyada iyo lacagaha tenant-ka halkan lagama heli karo.</p>
          {query["created-business"] && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Ganacsiga waa la diiwaangeliyey, casuumaadda Business Admin-na waa la diray.</p>}
          {query["status-updated"] && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Xaaladda ganacsiga waa la cusboonaysiiyey; dhacdada waa la audit-gareeyey.</p>}
          {query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{query.error === "server-config" ? "Server-ka service key ma habaysna." : query.error === "invite" ? "Casuumaadda email-ka ma dirmin; hubi in email-ku aanu hore ugu jirin Auth." : query.error === "audit" ? "Xaaladda waa la beddelay balse audit-ku wuu fashilmay; la xiriir maamulka nidaamka." : "Ganacsiga ama casuumaadda lama kaydin. Hubi xogta oo isku day mar kale."}</p>}
          <form action={createBusinessAndInviteOwner} className="mt-5 grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-medium">Magaca ganacsiga<input name="name" required minLength={2} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" /></label>
            <label className="text-sm font-medium">Email-ka Business Admin-ka<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" /></label>
            <button className="rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">Diiwaangeli oo casuun</button>
          </form>
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
            {error ? <p className="p-5 text-sm text-red-700">Liiska ganacsiyada lama soo qaadi karin.</p> : businesses?.length ? <ul className="divide-y divide-slate-100">{businesses.map((business: Business) => <li key={business.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">{business.name}</p><p className="mt-1 text-xs text-slate-500">{business.id}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs ${business.status === "active" ? "bg-teal-50 text-teal-900" : "bg-amber-50 text-amber-900"}`}>{business.status}</span>{business.status !== "closed" && <form action={setBusinessStatus}><input type="hidden" name="business_id" value={business.id} /><input type="hidden" name="status" value={business.status === "active" ? "suspended" : "active"} /><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium">{business.status === "active" ? "Hakiso" : "Dib u hawlgeli"}</button></form>}</div></li>)}</ul> : <p className="p-6 text-sm text-slate-600">Ganacsi weli lama diiwaangelin.</p>}
          </div>
        </section>
      </main>
    );
  }

  const activeMemberships = (memberships ?? []) as Membership[];
  if (!activeMemberships.length) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p>
          <h1 className="mt-5 text-2xl font-semibold text-[#122E40]">Ganacsi laguma xidhin</h1>
          <p className="mt-2 text-sm text-slate-600">Gelitaankaagu wuu shaqeeyey, laakiin weli ma jiro ganacsi firfircoon oo laguu oggolaaday. La xidhiidh maamulaha ganacsiga.</p>
          <form action={signOut} className="mt-6"><button className="rounded-lg bg-[#122E40] px-4 py-2.5 text-sm font-medium text-white">Ka bax</button></form>
        </section>
      </main>
    );
  }

  const selected = activeMemberships.find((m) => m.business_id === requestedBusiness) ?? activeMemberships[0];
  const { data: business } = await supabase.from("businesses").select("id, name, status").eq("id", selected.business_id).maybeSingle();
  if (!business || business.status !== "active") return <main className="flex min-h-screen items-center justify-center px-5"><section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm"><p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p><h1 className="mt-5 text-2xl font-semibold text-[#122E40]">Ganacsiga lama geli karo</h1><p className="mt-2 text-sm text-slate-600">{business?.status === "suspended" ? "Ganacsigan waa la hakiyey. La xiriir Super Admin-ka." : "Ganacsigan hadda ma shaqaynayo."}</p><form action={signOut} className="mt-6"><button className="rounded-lg bg-[#122E40] px-4 py-2.5 text-sm font-medium text-white">Ka bax</button></form></section></main>;
  const isAdmin = selected.role === "business_admin";
  const ordersQuery = supabase.from("orders").select("id, customer_id, status, pickup_at", { count: "exact" }).eq("business_id", selected.business_id).neq("status", "delivered").order("pickup_at", { ascending: true }).limit(8);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [{ data: orders, count }, { count: todayCount }, { count: overdueCount }, financeResult] = await Promise.all([
    ordersQuery,
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", selected.business_id).eq("pickup_at", today).neq("status", "delivered"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", selected.business_id).lt("pickup_at", today).neq("status", "delivered"),
    isAdmin ? supabase.rpc("get_business_financial_summary", { target_business: selected.business_id }) : Promise.resolve({ data: [] }),
  ]);
  const finance = Array.isArray(financeResult.data) ? financeResult.data[0] : null;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between bg-[#122E40] px-5 py-4 text-white sm:px-8">
        <div><p className="text-xs tracking-[.18em] text-white/60">HARQAANLE</p><p className="mt-1 font-semibold">{business?.name ?? "Ganacsigayga"}</p></div>
        <div className="flex items-center gap-4"><span className="hidden text-sm text-white/75 sm:inline">{isAdmin ? "Business Admin" : "Tailor Staff"}</span><form action={signOut}><button className="rounded-lg border border-white/30 px-3 py-2 text-sm">Ka bax</button></form></div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm text-slate-500">{profile?.display_name ? `Salaan, ${profile.display_name}` : "Shaqooyinka ganacsiga"}</p><h1 className="mt-1 text-2xl font-semibold text-[#122E40]">{isAdmin ? "Guudmar" : "Shaqooyinkayga"}</h1></div>
          {isAdmin ? <div className="flex flex-wrap gap-2"><Link href={`/customers?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Macaamiil</Link><Link href={`/measurements?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Cabbirro</Link><Link href={`/files?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Sawirro</Link><Link href={`/payments?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Lacag</Link><Link href={`/team?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Staff</Link><Link href={`/settings/business?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Ganacsiga</Link><Link href={`/orders?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Dalabyada</Link><Link href={`/orders/new?business=${selected.business_id}`} className="rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">+ Dalab cusub</Link></div> : <div className="flex gap-2"><Link href={`/files?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Sawirrada</Link><Link href={`/orders?business=${selected.business_id}`} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#122E40]">Shaqooyinkayga</Link></div>}
        </div>
        {notice === "password-updated" && <p role="status" className="mt-5 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Password-ka waa la cusboonaysiiyey.</p>}
        {activeMemberships.length > 1 && <nav aria-label="Ganacsiyadaada" className="mt-6 flex gap-2 overflow-x-auto">{activeMemberships.map((membership) => <Link key={membership.business_id} href={`/dashboard?business=${membership.business_id}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${membership.business_id === selected.business_id ? "bg-[#122E40] text-white" : "bg-white text-slate-700"}`}>Ganacsi {membership.business_id.slice(0, 6)}</Link>)}</nav>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Dalabyo furan</p><p className="mt-2 text-3xl font-semibold text-[#122E40]">{count ?? 0}</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Qaadasho maanta</p><p className="mt-2 text-3xl font-semibold text-[#122E40]">{todayCount ?? 0}</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Dib u dhacay</p><p className="mt-2 text-3xl font-semibold text-amber-700">{overdueCount ?? 0}</p></article>
          {isAdmin && <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Hadhaaga guud (USD)</p><p className="mt-2 text-3xl font-semibold text-[#122E40]">${Number(finance?.outstanding_balance ?? 0).toFixed(2)}</p></article>}
        </div>
        <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-[#122E40]">{isAdmin ? "Dalabyada dhow" : "Shaqooyinka laguu qoondeeyey"}</h2><Link href="/orders" className="text-sm font-medium text-[#0F6B7A]">Dhammaan</Link></div>
          {!orders?.length ? <p className="py-10 text-center text-sm text-slate-500">Shaqooyin lama hayo.</p> : <div className="mt-4 divide-y divide-slate-100">{orders.map((order: { id: string; status: string; pickup_at: string }) => <Link key={order.id} href={`/orders/${order.id}?business=${selected.business_id}`} className="flex items-center justify-between gap-3 py-4"><div><p className="font-medium text-slate-800">Dalab #{order.id.slice(0, 8)}</p><p className="mt-1 text-xs text-slate-500">Qaadasho: {shortDate(order.pickup_at)}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">{order.status}</span></Link>)}</div>}
        </section>
      </section>
    </main>
  );
}
