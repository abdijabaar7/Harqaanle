import Link from "next/link";
import { redirect } from "next/navigation";
import { createOrder } from "@/app/orders/actions";
import { OrderCreateForm } from "@/app/components/order-create-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; error?: string; customer?: string }>;
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
    memberships?.find((item: { business_id: string; role: string }) => item.business_id === query.business) ??
    memberships?.[0];

  if (!membership || membership.role !== "business_admin") {
    return (
      <main className="mx-auto mt-16 max-w-xl rounded-2xl bg-white p-8">
        <h1 className="text-xl font-semibold">Dalab cusub lama oggola</h1>
        <p className="mt-2 text-sm text-slate-600">Business Admin oo keliya ayaa abuuri kara dalab.</p>
      </main>
    );
  }

  const [{ data: customers }, { data: staffMemberships }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("business_id", membership.business_id)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("business_members")
      .select("user_id, role")
      .eq("business_id", membership.business_id)
      .eq("status", "active"),
  ]);

  const staffUserIds = staffMemberships?.map((s: { user_id: string }) => s.user_id) ?? [];
  const { data: staffProfiles } = staffUserIds.length
    ? await supabase.from("profiles").select("user_id, display_name").in("user_id", staffUserIds)
    : { data: [] };

  const staffProfileMap = new Map(
    (staffProfiles ?? []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name])
  );

  const staffList = (staffMemberships ?? []).map((m: { user_id: string; role: string }) => ({
    id: m.user_id,
    name: staffProfileMap.get(m.user_id) ?? (m.role === "business_admin" ? "Admin" : "Toliye"),
    role: m.role,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href={`/dashboard?business=${membership.business_id}`} className="text-sm font-semibold text-[#0F6B7A]">
        ← Dashboard
      </Link>
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-[#122E40]">Dalab cusub</h1>
        <p className="mt-1 text-sm text-slate-600">
          Diiwaangeli macmiilka, cabbirrada, sawirka marada/naqshadda, iyo toliyaha.
        </p>
      </div>

      {query.error && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-100">
          {query.error === "measurement"
            ? "Fadlan geli ugu yaraan hal cabbir oo cm ah."
            : query.error === "customer-validation"
            ? "Fadlan geli magaca iyo telefoonka macmiilka cusub."
            : query.error === "customer-create"
            ? "Macmiilka lama diiwaangelin karin. Hubi xogta."
            : query.error === "validation"
            ? "Hubi nooca dharka, tirada, qiimaha iyo taariikhda."
            : "Dalabka lama kaydin. Fadlan isku day mar kale."}
        </div>
      )}

      <OrderCreateForm
        businessId={membership.business_id}
        customers={customers ?? []}
        staffMembers={staffList}
        initialCustomerId={query.customer}
        action={createOrder}
      />
    </main>
  );
}
