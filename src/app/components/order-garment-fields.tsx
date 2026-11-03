"use client";

import { useState } from "react";

const garmentFields = {
  shirt: ["S", "M", "L", "B", "K"],
  trousers: ["B", "L", "C", "T", "K"],
};

export function OrderGarmentAndMeasurements() {
  const [garment, setGarment] = useState<"shirt" | "trousers">("shirt");

  return (
    <>
      <input type="hidden" name="garment" value={garment} />
      
      <div className="space-y-4">
        <div>
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

        <label className="block text-sm font-medium">
          Tirada (Quantity)
          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue="1"
            required
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-medium"
          />
        </label>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#122E40]">Cabbirrada (cm)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Geli cabbirrada sida buugga tolidda ({garment === "shirt" ? "S, M, L, B, K" : "B, L, C, T, K"}).
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            Snapshot
          </span>
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
      </section>
    </>
  );
}
