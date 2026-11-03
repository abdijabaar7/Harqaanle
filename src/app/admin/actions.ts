"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  return value.replace(/\/$/, "");
}

export async function createBusinessAndInviteOwner(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/dashboard?error=business-validation");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("user_id", claims.sub).maybeSingle();
  if (profile?.platform_role !== "super_admin") redirect("/dashboard?error=denied");

  let admin: SupabaseClient;
  try { admin = createAdminClient(); } catch { redirect("/dashboard?error=server-config"); }
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/accept-invite`,
  });
  if (inviteError || !invited.user) redirect("/dashboard?error=invite");
  const { data: business, error: businessError } = await admin.from("businesses").insert({ name, created_by: claims.sub }).select("id").single();
  if (businessError || !business) redirect("/dashboard?error=business-save");
  const { error: memberError } = await admin.from("business_members").insert({ business_id: business.id, user_id: invited.user.id, role: "business_admin", status: "invited" });
  if (memberError) redirect("/dashboard?error=membership-save");
  await admin.from("business_access_audit").insert({ business_id: business.id, actor_user_id: claims.sub, target_user_id: invited.user.id, target_email: email, action: "owner_invited" });
  redirect("/dashboard?created-business=1");
}

export async function inviteTailorStaff(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!businessId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/team?business=${businessId}&error=validation`);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: membership } = await supabase.from("business_members").select("role, status").eq("business_id", businessId).eq("user_id", claims.sub).eq("status", "active").maybeSingle();
  if (membership?.role !== "business_admin") redirect("/dashboard?error=denied");

  let admin: SupabaseClient;
  try { admin = createAdminClient(); } catch { redirect(`/team?business=${businessId}&error=server-config`); }
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/accept-invite`,
  });
  if (inviteError || !invited.user) redirect(`/team?business=${businessId}&error=invite`);
  const { error: memberError } = await admin.from("business_members").insert({ business_id: businessId, user_id: invited.user.id, role: "tailor_staff", status: "invited" });
  if (memberError) redirect(`/team?business=${businessId}&error=membership-save`);
  await admin.from("business_access_audit").insert({ business_id: businessId, actor_user_id: claims.sub, target_user_id: invited.user.id, target_email: email, action: "staff_invited" });
  redirect(`/team?business=${businessId}&invited=1`);
}

export async function acceptInvitations() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { error } = await supabase.rpc("accept_pending_business_memberships");
  if (error) redirect("/auth/accept-invite?error=accept");
  redirect("/dashboard?notice=invitation-accepted");
}

export async function assignStaffToOrder(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const staffId = String(formData.get("staff_id") ?? "") || null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { error } = await supabase.rpc("assign_order_staff", { target_business: businessId, target_order: orderId, target_staff: staffId });
  if (error) redirect(`/orders/${orderId}?business=${businessId}&error=assignment`);
  redirect(`/orders/${orderId}?business=${businessId}&assigned=1`);
}

export async function setBusinessStatus(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  if (!businessId || !["active", "suspended"].includes(nextStatus)) redirect("/dashboard?error=validation");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("user_id", claims.sub).maybeSingle();
  if (profile?.platform_role !== "super_admin") redirect("/dashboard?error=denied");
  const { error } = await supabase.rpc("set_business_status_as_super_admin", { target_business: businessId, next_status: nextStatus });
  if (error) redirect("/dashboard?error=status");
  redirect("/dashboard?status-updated=1");
}

export async function updateBusinessName(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!businessId || name.length < 2 || name.length > 120) redirect(`/settings/business?business=${businessId}&error=validation`);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { error } = await supabase.rpc("update_business_metadata", { target_business: businessId, new_name: name });
  if (error) redirect(`/settings/business?business=${businessId}&error=save`);
  redirect(`/settings/business?business=${businessId}&saved=1`);
}

export async function suspendTailorStaff(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const staffId = String(formData.get("staff_id") ?? "");
  if (!businessId || !staffId) redirect(`/team?business=${businessId}&error=member`);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: membership } = await supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", claims.sub).eq("status", "active").maybeSingle();
  if (membership?.role !== "business_admin") redirect("/dashboard?error=denied");
  const { error } = await supabase.rpc("suspend_business_staff", { target_business: businessId, target_staff: staffId });
  if (error) redirect(`/team?business=${businessId}&error=member`);
  redirect(`/team?business=${businessId}&suspended=1`);
}
