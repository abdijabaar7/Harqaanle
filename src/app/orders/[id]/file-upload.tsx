"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function FileUpload({
  businessId,
  orderId,
  userId,
}: {
  businessId: string;
  orderId: string;
  userId: string;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [kind, setKind] = useState<"fabric" | "design">("fabric");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
        setStatus("Fadlan dooro sawir noociisu yahay JPEG, PNG ama WebP.");
        setPreview(null);
        return;
      }
      setStatus("");
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  async function upload(formData: FormData) {
    const file = formData.get("file");
    const selectedKind = String(formData.get("kind") ?? kind);

    if (!(file instanceof File) || !file.size) {
      setStatus("Fadlan marka hore dooro sawir.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      setStatus("Dooro sawir JPEG, PNG, WebP ama HEIC ah.");
      return;
    }

    setBusy(true);
    setStatus("Sawirka waa la diyaarinayaa…");
    const id = crypto.randomUUID();
    const path = `${businessId}/${orderId}/${id}`;
    const supabase = createClient();

    const { error: metadataError } = await supabase.from("order_files").insert({
      id,
      business_id: businessId,
      order_id: orderId,
      object_path: path,
      kind: selectedKind,
      mime_type: file.type || null,
      size_bytes: file.size,
      upload_state: "pending",
      uploaded_by: userId,
    });

    if (metadataError) {
      setStatus("Faylka looma oggola inuu ku xirmo dalabkan.");
      setBusy(false);
      return;
    }

    setStatus("Sawirka wuu soo gelayaa…");
    const { error: uploadError } = await supabase.storage.from("order-files").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      await supabase.from("order_files").update({ upload_state: "failed" }).eq("id", id).eq("business_id", businessId);
      setStatus("Upload-ku wuu fashilmay. Dib u dooro sawirka oo isku day mar kale.");
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("order_files")
      .update({ upload_state: "uploaded" })
      .eq("id", id)
      .eq("business_id", businessId);

    setStatus(updateError ? "Sawirka waa la geliyey, fadlan dib u cusboonaysii bogga." : "Sawirka si guul leh ayaa loo geliyey!");
    setBusy(false);
    if (!updateError) {
      window.location.reload();
    }
  }

  return (
    <form action={upload} className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Preview or Icon */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
          {preview ? (
            <img src={preview} alt="Sawirka la doortay" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <span className="text-2xl">📸</span>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">Sawir ma jiro</p>
            </div>
          )}
        </div>

        {/* Input & Kind */}
        <div className="flex-1 space-y-3 w-full">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Dooro sawirka marada ama naqshadda
            </label>
            <input
              ref={fileInputRef}
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileChange}
              required
              disabled={busy}
              className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-[#0F6B7A] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[#0c5763] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Nooca:</span>
            <div className="flex rounded-xl bg-slate-200/60 p-0.5">
              <button
                type="button"
                onClick={() => setKind("fabric")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  kind === "fabric" ? "bg-white text-[#122E40] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Maro
              </button>
              <button
                type="button"
                onClick={() => setKind("design")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  kind === "design" ? "bg-white text-[#122E40] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Naqshad
              </button>
            </div>
            <input type="hidden" name="kind" value={kind} />
          </div>
        </div>
      </div>

      {status && (
        <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-white p-3 text-xs font-medium text-slate-700 shadow-sm border border-slate-100">
          <p>{status}</p>
          {busy && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#0F6B7A]" />
            </div>
          )}
        </div>
      )}

      <button
        disabled={busy || !preview}
        className="mt-4 w-full rounded-xl bg-[#122E40] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a3c53] disabled:opacity-40"
      >
        {busy ? "Wuu soo gelayaa…" : "Soo geli sawirka"}
      </button>
    </form>
  );
}
