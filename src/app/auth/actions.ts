"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  return value.replace(/\/$/, "");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=credentials");

  redirect("/dashboard");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/auth/recovery?sent=1");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/update-password`,
  });
  // Deliberately do not reveal whether an account exists.
  redirect("/auth/recovery?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 10 || password !== confirmation) {
    redirect("/auth/update-password?error=validation");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims) redirect("/login?error=session");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/auth/update-password?error=failed");
  redirect("/dashboard?notice=password-updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
