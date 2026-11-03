"use client";

import { useState } from "react";

const garmentFields = {
  shirt: ["S", "M", "L", "B", "K"],
  trousers: ["B", "L", "C", "T", "K"],
};

export function CustomerMeasurementForm({
  businessId,
  customerId,
  action,
}: {
  businessId: string;
  customerId: string;
  action: (formData: FormData) => void;
}) {
  const [garment, setGarment] = useState<"shirt" | "trousers">("shirt");

  return (
    <form action={action} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="garment" value={garment} />

      <h2 className="text-lg font-bold text-[#122E40]">Cabir cusub</h2>

      <div className="mt-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Nooca dharka
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setGarment("shirt")}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              garment === "shirt"
                ? "bg-white text-[#122E40] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Shaati
          </button>
          <button
            type="button"
            onClick={() => setGarment("trousers")}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              garment === "trousers"
                ? "bg-white text-[#122E40] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Surwaal
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {garmentFields[garment].map((letter) => (
          <div key={`${garment}_${letter}`} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-bold text-[#122E40]">
              {letter}
            </span>
            <div className="relative flex-1">
              <input
                name={`cm_${letter}`}
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                inputMode="decimal"
                placeholder="0.0"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A] pr-10"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                cm
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-xl bg-[#0F6B7A] px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#0c5763] active:scale-[0.99]"
      >
        Keydi cabirkan
      </button>
    </form>
  );
}
