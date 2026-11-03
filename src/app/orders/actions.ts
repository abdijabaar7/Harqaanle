"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const fieldsByGarment: Record<string, string[]> = {
  shirt: ["S", "M", "L", "B", "K"],
  trousers: ["B", "L", "C", "T", "K"],
};

const letterToDbKey: Record<string, Record<string, string>> = {
  shirt: {
    S: "shoulder",
    M: "body_length",
    L: "chest",
    B: "sleeve_length",
    K: "neck",
  },
  trousers: {
    B: "waist",
    L: "trouser_length",
    C: "hip",
    T: "thigh",
    K: "inseam",
  },
};

export async function createOrder(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  let customerId = String(formData.get("customer_id") ?? "").trim();
  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const garment = String(formData.get("garment") ?? "");
  const rawLabel = String(formData.get("category_label") ?? "").trim();
  const label = rawLabel || null;
  const pickup = String(formData.get("pickup_at") ?? "");
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("unit_price"));
  const paid = Number(formData.get("initial_payment") ?? 0);
  const staffId = String(formData.get("staff_id") ?? "").trim();
  const fabricFile = formData.get("fabric_file");
  const designFile = formData.get("design_file");

  if (!businessId || (!customerId && (!customerName || !customerPhone))) {
    redirect(`/orders/new?business=${businessId}&error=customer-validation`);
  }
  if (!fieldsByGarment[garment] || !pickup || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0 || !Number.isFinite(paid) || paid < 0) {
    redirect(`/orders/new?business=${businessId}&error=validation`);
  }

  const snapshot: Record<string, number> = {};
  for (const field of fieldsByGarment[garment]) {
    const raw = String(formData.get(`cm_${field}`) ?? "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0 || value > 500) redirect(`/orders/new?business=${businessId}&error=measurement`);
    snapshot[field] = value;
  }
  if (!Object.keys(snapshot).length) redirect(`/orders/new?business=${businessId}&error=measurement`);

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  if (!customerId && customerName && customerPhone) {
    const { data: newCustomer, error: custError } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        name: customerName,
        phone: customerPhone,
        created_by: claims.sub,
      })
      .select("id")
      .single();

    if (custError || !newCustomer) {
      redirect(`/orders/new?business=${businessId}&error=customer-create`);
    }
    customerId = newCustomer.id;
  }

  let rpcResult = await supabase.rpc("create_order_with_items", {
    target_business: businessId,
    target_customer: customerId,
    target_pickup: pickup,
    items: [{
      garment,
      quantity,
      unit_price: price,
      measurement_snapshot: snapshot,
      category_label_snapshot: label,
    }],
    initial_payment: paid,
  });

  if (rpcResult.error && rpcResult.error.message?.includes("Invalid measurement snapshot")) {
    const mappedSnapshot: Record<string, number> = {};
    const mapping = letterToDbKey[garment] ?? {};
    for (const [k, v] of Object.entries(snapshot)) {
      const targetKey = mapping[k] ?? k;
      mappedSnapshot[targetKey] = v;
    }

    rpcResult = await supabase.rpc("create_order_with_items", {
      target_business: businessId,
      target_customer: customerId,
      target_pickup: pickup,
      items: [{
        garment,
        quantity,
        unit_price: price,
        measurement_snapshot: mappedSnapshot,
        category_label_snapshot: label,
      }],
      initial_payment: paid,
    });
  }

  const { data: orderId, error } = rpcResult;
  if (error || !orderId) {
    console.error("Order create error details:", error);
    redirect(`/orders/new?business=${businessId}&error=save`);
  }

  // 1. Assign staff if selected
  if (staffId) {
    try {
      await supabase.rpc("assign_order_staff", {
        target_business: businessId,
        target_order: orderId,
        target_staff: staffId,
      });
    } catch (e) {
      console.error("Failed to assign staff upon order creation:", e);
    }
  }

  // 2. Upload Fabric and Design images if provided
  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    console.error("Admin client init error for order files:", e);
  }
  const storageClient = adminClient ?? supabase;

  if (fabricFile instanceof File && fabricFile.size > 0) {
    try {
      const fileId = crypto.randomUUID();
      const filePath = `${businessId}/${orderId}/${fileId}`;
      const buffer = Buffer.from(await fabricFile.arrayBuffer());

      const { error: uploadError } = await storageClient.storage
        .from("order-files")
        .upload(filePath, buffer, {
          contentType: fabricFile.type || "image/jpeg",
          upsert: false,
        });

      if (!uploadError) {
        await storageClient.from("order_files").insert({
          id: fileId,
          business_id: businessId,
          order_id: orderId,
          object_path: filePath,
          kind: "fabric",
          mime_type: fabricFile.type || "image/jpeg",
          size_bytes: fabricFile.size,
          upload_state: "uploaded",
          uploaded_by: claims.sub,
        });
      } else {
        console.error("Fabric upload error:", uploadError);
      }
    } catch (e) {
      console.error("Error processing fabric file:", e);
    }
  }

  if (designFile instanceof File && designFile.size > 0) {
    try {
      const fileId = crypto.randomUUID();
      const filePath = `${businessId}/${orderId}/${fileId}`;
      const buffer = Buffer.from(await designFile.arrayBuffer());

      const { error: uploadError } = await storageClient.storage
        .from("order-files")
        .upload(filePath, buffer, {
          contentType: designFile.type || "image/jpeg",
          upsert: false,
        });

      if (!uploadError) {
        await storageClient.from("order_files").insert({
          id: fileId,
          business_id: businessId,
          order_id: orderId,
          object_path: filePath,
          kind: "design",
          mime_type: designFile.type || "image/jpeg",
          size_bytes: designFile.size,
          upload_state: "uploaded",
          uploaded_by: claims.sub,
        });
      } else {
        console.error("Design upload error:", uploadError);
      }
    } catch (e) {
      console.error("Error processing design file:", e);
    }
  }

  redirect(`/orders/${orderId}?business=${businessId}&created=1`);
}

export async function advanceOrderStatus(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { error } = await supabase.rpc("transition_order_status", {
    target_business: businessId,
    target_order: orderId,
    next_status: nextStatus,
    transition_reason: null,
  });
  if (error) redirect(`/orders/${orderId}?business=${businessId}&error=status`);
  redirect(`/orders/${orderId}?business=${businessId}&updated=1`);
}

export async function recordPayment(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) redirect(`/orders/${orderId}?business=${businessId}&error=payment`);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");
  const { error } = await supabase.rpc("record_order_payment", {
    target_business: businessId,
    target_order: orderId,
    payment_amount: amount,
    payment_method: "cash",
    payment_reference: null,
  });
  if (error) redirect(`/orders/${orderId}?business=${businessId}&error=payment`);
  redirect(`/orders/${orderId}?business=${businessId}&paid=1`);
}
