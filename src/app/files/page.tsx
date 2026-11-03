import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ business?: string; kind?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: memberships } = await supabase.from("business_members").select("business_id, role").eq("user_id", claims.sub).eq("status", "active");
  const membership = memberships?.find((item: { business_id: string }) => item.business_id === query.business) ?? memberships?.[0];
  if (!membership) redirect("/dashboard");
  let filesRequest = supabase.from("order_files").select("id, order_id, object_path, kind, upload_state, created_at").eq("business_id", membership.business_id).order("created_at", { ascending: false }).limit(100);
  if (query.kind === "fabric" || query.kind === "design") filesRequest = filesRequest.eq("kind", query.kind);
  const { data: files, error } = await filesRequest;
  const images = await Promise.all((files ?? []).map(async (file: { id: string; order_id: string; object_path: string; kind: string; upload_state: string; created_at: string }) => {
    if (file.upload_state !== "uploaded") return { ...file, url: null };
    const { data } = await supabase.storage.from("order-files").createSignedUrl(file.object_path, 900);
    return { ...file, url: data?.signedUrl ?? null };
  }));
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8"><Link href={`/dashboard?business=${membership.business_id}`} className="text-sm text-[#0F6B7A]">← Dashboard</Link><header className="mt-5"><h1 className="text-2xl font-semibold text-[#122E40]">Sawirrada marada iyo naqshadaha</h1><p className="mt-2 text-sm text-slate-600">Faylasha waa private; link-ga la saxeexay wuxuu dhacayaa 15 daqiiqo gudahood.</p></header>
    <nav className="mt-5 flex gap-2"><Link href={`/files?business=${membership.business_id}`} className="rounded-full bg-white px-4 py-2 text-sm">Dhammaan</Link><Link href={`/files?business=${membership.business_id}&kind=fabric`} className="rounded-full bg-white px-4 py-2 text-sm">Maro</Link><Link href={`/files?business=${membership.business_id}&kind=design`} className="rounded-full bg-white px-4 py-2 text-sm">Naqshad</Link></nav>
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">{error ? <p role="alert" className="text-sm text-red-700">Sawirrada lama soo qaadi karin.</p> : !images.length ? <div className="py-12 text-center"><p className="font-medium">Sawir ma jiro</p><p className="mt-2 text-sm text-slate-500">Sawir ku dar markaad furto dalab.</p><Link href={`/orders?business=${membership.business_id}`} className="mt-4 inline-block text-sm text-[#0F6B7A]">Dalabyada</Link></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{images.map((file: { id: string; order_id: string; kind: string; upload_state: string; url: string | null; created_at: string }) => <article key={file.id} className="overflow-hidden rounded-xl border border-slate-100">{file.url ? <a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.kind === "fabric" ? "Maro" : "Naqshad"} className="aspect-square w-full object-cover" /></a> : <div className="grid aspect-square place-items-center bg-slate-100 text-xs text-slate-500">{file.upload_state === "failed" ? "Upload-ku wuu fashilmay" : "Upload wuu socdaa"}</div>}<div className="p-3"><p className="text-sm font-medium">{file.kind === "fabric" ? "Maro" : "Naqshad"}</p><Link href={`/orders/${file.order_id}?business=${membership.business_id}`} className="mt-1 block text-xs text-[#0F6B7A]">Dalab #{file.order_id.slice(0, 8)}</Link><p className="mt-1 text-xs text-slate-400">{new Date(file.created_at).toLocaleDateString("so-SO")}</p></div></article>)}</div>}</section>
  </main>;
}
