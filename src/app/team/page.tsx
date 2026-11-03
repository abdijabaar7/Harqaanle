import Link from "next/link";
import { redirect } from "next/navigation";
import { inviteTailorStaff, suspendTailorStaff } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ business?: string; error?: string; invited?: string; suspended?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership || membership.role !== "business_admin") return <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Gelitaan lama oggola</h1><Link className="mt-4 inline-block text-[#0F6B7A]" href="/dashboard">Dashboard</Link></main>;
  const [{ data: business }, { data: members, error }, { data: events }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle(),
    supabase.from("business_members").select("user_id, role, status, created_at").eq("business_id", membership.business_id).order("created_at"),
    supabase.from("business_access_audit").select("target_email, action, occurred_at").eq("business_id", membership.business_id).order("occurred_at", { ascending: false }).limit(20),
  ]);
  const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name ?? p.user_id.slice(0, 8)]));
  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-7 sm:px-8"><Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link><header className="mt-5"><p className="text-sm text-slate-500">{business?.name}</p><h1 className="text-2xl font-semibold text-[#122E40]">Staff iyo gelitaan</h1></header>
    {query.invited && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Casuumaadda Tailor Staff waa la diray.</p>}
    {query.suspended && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Gelitaanka Tailor Staff waa la hakiyey oo waa la audit-gareeyey.</p>}
    {query.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{query.error === "server-config" ? "Server-ka service key ma habaysna." : query.error === "invite" ? "Casuumaadda ma dirmin; hubi in email-ku aanu hore ugu jirin Auth." : "Casuumaadda lama kaydin."}</p>}
    <form action={inviteTailorStaff} className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-end"><input type="hidden" name="business_id" value={membership.business_id} /><label className="flex-1 text-sm font-medium">Email-ka Tailor Staff<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" /></label><button className="rounded-xl bg-[#0F6B7A] px-4 py-3 text-sm font-semibold text-white">Casuumi staff</button></form>
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold">Xubnaha ganacsiga</h2>{error ? <p className="mt-4 text-sm text-red-700">Xubnaha lama soo qaadi karin.</p> : !members?.length ? <p className="mt-4 text-sm text-slate-500">Xubin ma jiro.</p> : <ul className="mt-3 divide-y divide-slate-100">{members.map((member: { user_id: string; role: string; status: string }) => <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{profileMap.get(member.user_id) ?? "Xubin"}</p><p className="text-xs text-slate-500">{member.user_id.slice(0, 8)}</p></div><div className="flex items-center gap-3"><span className="text-right text-xs text-slate-600">{member.role === "business_admin" ? "Business Admin" : "Tailor Staff"}<br />{member.status === "invited" ? "Casuumaad sugaysa" : member.status}</span>{member.role === "tailor_staff" && member.status === "active" && <form action={suspendTailorStaff}><input type="hidden" name="business_id" value={membership.business_id} /><input type="hidden" name="staff_id" value={member.user_id} /><button className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700">Hakiso</button></form>}</div></li>)}</ul>}</section>
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-semibold">Taariikhda gelitaanka</h2>{!events?.length ? <p className="mt-3 text-sm text-slate-500">Dhacdo hore ma jirto.</p> : <ul className="mt-3 divide-y divide-slate-100">{events.map((event: { target_email: string | null; action: string; occurred_at: string }, index: number) => <li key={`${event.occurred_at}-${index}`} className="flex justify-between gap-3 py-3 text-sm"><span>{event.target_email ?? "Xubin"} · {event.action === "owner_invited" ? "Admin la casuumay" : event.action === "staff_invited" ? "Staff la casuumay" : "Staff la hakiyey"}</span><span className="text-xs text-slate-500">{new Date(event.occurred_at).toLocaleString("so-SO")}</span></li>)}</ul>}</section>
  </main>;
}
