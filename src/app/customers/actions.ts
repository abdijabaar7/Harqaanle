"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!businessId || !name || !phone) redirect("/customers?error=validation");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const { error } = await supabase.from("customers").insert({
    business_id: businessId,
    name,
    phone,
    created_by: claims.sub,
  });
  if (error) redirect(`/customers?business=${businessId}&error=save`);
  redirect(`/customers?business=${businessId}&created=1`);
}

export async function saveMeasurement(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const customerId = String(formData.get("customer_id") ?? "");
  const garment = String(formData.get("garment") ?? "");
  const categoryLabel = String(formData.get("category_label") ?? "").trim() || null;

  if (!businessId || !customerId || !garment) {
    redirect(`/customers/${customerId}?business=${businessId}&error=validation`);
  }

  const valuesCm: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cm_")) {
      const fieldKey = key.replace("cm_", "");
      const valStr = String(value).trim();
      if (valStr !== "") {
        const num = parseFloat(valStr);
        if (!isNaN(num) && num > 0) {
          valuesCm[fieldKey] = num;
        }
      }
    }
  }

  if (Object.keys(valuesCm).length === 0) {
    redirect(`/customers/${customerId}?business=${businessId}&error=empty`);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const { error } = await supabase.from("measurements").insert({
    business_id: businessId,
    customer_id: customerId,
    garment,
    category_label: categoryLabel,
    values_cm: valuesCm,
    created_by: claims.sub,
  });

  if (error) redirect(`/customers/${customerId}?business=${businessId}&error=save`);
  redirect(`/customers/${customerId}?business=${businessId}&saved=1`);
}
