import Link from "next/link";
import { redirect } from "next/navigation";
import {
  inviteTailorStaff,
  createTailorStaffDirect,
  resetStaffPassword,
  suspendTailorStaff,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    business?: string;
    error?: string;
    invited?: string;
    "created-staff"?: string;
    "password-reset"?: string;
    suspended?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", claims.sub)
    .eq("status", "active");

  const membership =
    memberships?.find((item: { business_id: string }) => item.business_id === query.business) ??
    memberships?.[0];

  if (!membership || membership.role !== "business_admin") {
    return (
      <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8">
        <h1 className="text-xl font-semibold">Gelitaan lama oggola</h1>
        <Link className="mt-4 inline-block text-[#0F6B7A]" href="/dashboard">
          Dashboard
        </Link>
      </main>
    );
  }

  const [{ data: business }, { data: members, error }, { data: events }] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", membership.business_id).maybeSingle(),
    supabase
      .from("business_members")
      .select("user_id, role, status, created_at")
      .eq("business_id", membership.business_id)
      .order("created_at"),
    supabase
      .from("business_access_audit")
      .select("target_email, action, occurred_at")
      .eq("business_id", membership.business_id)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);

  const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p: { user_id: string; display_name: string | null }) => [
      p.user_id,
      p.display_name ?? p.user_id.slice(0, 8),
    ])
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-7 sm:px-8">
      <Link href={`/dashboard?business=${membership.business_id}`} className="text-sm font-semibold text-[#0F6B7A]">
        ← Dashboard
      </Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{business?.name}</p>
        <h1 className="text-2xl font-bold text-[#122E40]">Staff iyo Maamulka Gelitaanka</h1>
      </header>

      {query["created-staff"] && (
        <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-100">
          Shaqaalaha cusub si toos ah ayaa loo abuuray oo waa firfircoon yahay!
        </p>
      )}
      {query.invited && (
        <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-100">
          Casuumaadda Tailor Staff waa la diray email-ka.
        </p>
      )}
      {query["password-reset"] && (
        <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900 border border-teal-100">
          Password-ka shaqaalaha waa la cusboonaysiiyey oo akoonku hadda waa firfircoon yahay!
        </p>
      )}
      {query.suspended && (
        <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 border border-amber-100">
          Gelitaanka Tailor Staff waa la hakiyey.
        </p>
      )}
      {query.error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-100">
          {query.error === "validation"
            ? "Fadlan xaqiiji magaca, email-ka iyo password-ka (ugu yaraan 6 xaraf)."
            : query.error === "password-validation"
            ? "Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf."
            : query.error === "server-config"
            ? "Server-ka service key ma habaysna."
            : query.error === "invite"
            ? "Casuumaadda ma dirmin; hubi email-ka."
            : "Khalad ayaa dhacay. Fadlan isku day mar kale."}
        </p>
      )}

      {/* SECTION 1: DIRECT ADD OR INVITE */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Quick Direct Add */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#122E40]">⚡ Ku dar Shaqaale Toos ah (Lagama maarmaan ma aha Email Link)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Geli magaca, email-ka iyo password-ka shaqaalaha si uu hadda toos ugu galo.
            </p>
          </div>
          <form action={createTailorStaffDirect} className="mt-4 space-y-3">
            <input type="hidden" name="business_id" value={membership.business_id} />
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Magaca Shaqaalaha</label>
              <input
                name="name"
                required
                placeholder="Tusaale: Axmed Taliye"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0F6B7A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Email-ka</label>
              <input
                name="email"
                type="email"
                required
                placeholder="shaqaale@gmail.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0F6B7A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Password-ka Gelitaanka</label>
              <input
                name="password"
                type="text"
                required
                minLength={6}
                defaultValue="12345678"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-[#0F6B7A] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-[#0F6B7A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0c5763]"
            >
              + Samee oo Hawlgeli
            </button>
          </form>
        </div>

        {/* Invite by Email */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#122E40]">✉️ Ku Casuum Email</h2>
              <p className="mt-1 text-xs text-slate-500">
                U dir link casuumaad ah email-ka shaqaalaha si uu isagu password-kiisa u samaysto.
              </p>
            </div>
            <form action={inviteTailorStaff} className="mt-4 space-y-3">
              <input type="hidden" name="business_id" value={membership.business_id} />
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Email-ka Tailor Staff</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="tailor@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0F6B7A] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl border border-[#0F6B7A] bg-teal-50/50 px-4 py-2.5 text-sm font-semibold text-[#0F6B7A] hover:bg-teal-100/50"
              >
                Dir Casuumaadda Email
              </button>
            </form>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            💡 <strong>Talo:</strong> Haddii shaqaaluhu ku dhibtoodo furitaanka email-ka, waxaad isticmaali kartaa foomka hore ee <em>Ku dar Shaqaale Toos ah</em>.
          </div>
        </div>
      </div>

      {/* SECTION 2: MEMBERS LIST & PASSWORD SETTING */}
      <section className="mt-8 rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-[#122E40]">Xubnaha Ganacsiga Wiilhoog</h2>
        {error ? (
          <p className="mt-4 text-sm text-red-700">Xubnaha lama soo qaadi karin.</p>
        ) : !members?.length ? (
          <p className="mt-4 text-sm text-slate-500">Xubin ma jiro.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {members.map(
              (member: { user_id: string; role: string; status: string }) => (
                <li
                  key={member.user_id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {profileMap.get(member.user_id) ?? "Xubin"}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          member.status === "active"
                            ? "bg-teal-50 text-teal-800 border border-teal-200"
                            : member.status === "invited"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {member.status === "active"
                          ? "✓ Firfircoon (Active)"
                          : member.status === "invited"
                          ? "⏳ Casuumaad sugaysa"
                          : "Hakiyey"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Doorka: {member.role === "business_admin" ? "Business Admin (Mulkiile)" : "Tailor Staff (Toliye)"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* If tailor staff, allow setting new password or activating directly */}
                    {member.role === "tailor_staff" && (
                      <form
                        action={resetStaffPassword}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
                      >
                        <input type="hidden" name="business_id" value={membership.business_id} />
                        <input type="hidden" name="staff_id" value={member.user_id} />
                        <input
                          name="new_password"
                          type="text"
                          placeholder="Password cusub"
                          minLength={6}
                          required
                          className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-[#0F6B7A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0c5763]"
                        >
                          Deji Password
                        </button>
                      </form>
                    )}

                    {member.role === "tailor_staff" && member.status === "active" && (
                      <form action={suspendTailorStaff}>
                        <input type="hidden" name="business_id" value={membership.business_id} />
                        <input type="hidden" name="staff_id" value={member.user_id} />
                        <button className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                          Hakiso
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>

      {/* SECTION 3: AUDIT HISTORY */}
      <section className="mt-8 rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100">
        <h2 className="text-base font-bold text-[#122E40]">Taariikhda Gelitaanka iyo Hawlgelinta</h2>
        {!events?.length ? (
          <p className="mt-3 text-sm text-slate-500">Dhacdo hore ma jirto.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {events.map(
              (
                event: { target_email: string | null; action: string; occurred_at: string },
                index: number
              ) => (
                <li
                  key={`${event.occurred_at}-${index}`}
                  className="flex justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="text-slate-700">
                    <strong className="text-slate-900">{event.target_email ?? "Xubin"}</strong> ·{" "}
                    {event.action === "owner_invited"
                      ? "Admin la casuumay"
                      : event.action === "staff_invited"
                      ? "Staff email lagu casuumay"
                      : event.action === "staff_created_direct"
                      ? "Staff toos loo hawlgeliyey"
                      : "Staff la hakiyey"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(event.occurred_at).toLocaleString("so-SO")}
                  </span>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </main>
  );
}
