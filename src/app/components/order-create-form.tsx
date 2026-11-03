"use client";

import { useState } from "react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

const garmentFields = {
  shirt: ["S", "M", "L", "B", "K"],
  trousers: ["B", "L", "C", "T", "K"],
};

export function OrderCreateForm({
  businessId,
  customers,
  initialCustomerId,
  action,
}: {
  businessId: string;
  customers: Customer[];
  initialCustomerId?: string;
  action: (formData: FormData) => void;
}) {
  const hasExistingCustomers = customers.length > 0;
  const [customerMode, setCustomerMode] = useState<"new" | "existing">(
    initialCustomerId || !hasExistingCustomers ? (initialCustomerId ? "existing" : "new") : "new"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustomerId || (hasExistingCustomers ? customers[0].id : "")
  );

  const [garment, setGarment] = useState<"shirt" | "trousers">("shirt");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [initialPayment, setInitialPayment] = useState<number | "">(0);

  // Default pickup date to 7 days from now
  const [pickupDate, setPickupDate] = useState(() => {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  });

  const totalPrice = (Number(unitPrice) || 0) * (Number(quantity) || 1);
  const paid = Number(initialPayment) || 0;
  const remaining = Math.max(0, totalPrice - paid);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="garment" value={garment} />

      {/* 1. MACMIILKA (CUSTOMER) */}
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#122E40]">1. Macmiilka</h2>
            <p className="text-xs text-slate-500">Dooro macmiil hore u jiray ama diiwaangeli macmiil cusub.</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCustomerMode("new")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                customerMode === "new"
                  ? "bg-white text-[#122E40] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Macmiil cusub
            </button>
            <button
              type="button"
              disabled={!hasExistingCustomers}
              onClick={() => setCustomerMode("existing")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                customerMode === "existing"
                  ? "bg-white text-[#122E40] shadow-sm"
                  : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
              }`}
            >
              🔍 Macmiil jira ({customers.length})
            </button>
          </div>
        </div>

        {customerMode === "new" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="customer_id" value="" />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Magaca macmiilka <span className="text-red-500">*</span>
              </label>
              <input
                name="customer_name"
                required
                minLength={2}
                placeholder="Tusaale: Maxamed Cali"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Telefoonka macmiilka <span className="text-red-500">*</span>
              </label>
              <input
                name="customer_phone"
                required
                type="tel"
                placeholder="061XXXXXXX"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Dooro macmiilka jira <span className="text-red-500">*</span>
            </label>
            <select
              name="customer_id"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* 2. NOOCA DHARKA IYO CABBIRRADA (GARMENT & MEASUREMENTS) */}
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#122E40]">2. Dharka iyo Cabbirrada</h2>
            <p className="text-xs text-slate-500">Dooro nooca dharka iyo cabbirrada sida buuggaaga tolidda.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Tirada:</span>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100"
              >
                -
              </button>
              <input
                name="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center text-sm font-bold text-[#122E40] bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Garment Selector */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Nooca dharka
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
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

        {/* Compact 5-column letter measurements grid */}
        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Cabbirrada ({garment === "shirt" ? "S, M, L, B, K" : "B, L, C, T, K"})
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {garmentFields[garment].map((letter) => (
              <div
                key={`${garment}_${letter}`}
                className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-center focus-within:border-[#0F6B7A] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0F6B7A]"
              >
                <span className="text-base font-extrabold text-[#122E40]">{letter}</span>
                <div className="relative mt-1.5 w-full">
                  <input
                    name={`cm_${letter}`}
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="500"
                    inputMode="decimal"
                    placeholder="0.0"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-2 pr-6 text-center text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    cm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TAARIIKHDA IYO LACAGTA (DATE & PAYMENT) */}
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#122E40] border-b border-slate-100 pb-4">
          3. Taariikhda iyo Lacagta
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Taariikhda qaadashada <span className="text-red-500">*</span>
            </label>
            <input
              name="pickup_at"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Qiimaha xabbadiiba ($ USD) <span className="text-red-500">*</span>
            </label>
            <input
              name="unit_price"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
              required
              placeholder="0.00"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Lacagta hadda la bixiyey ($ USD)
            </label>
            <input
              name="initial_payment"
              type="number"
              min="0"
              step="0.01"
              value={initialPayment}
              onChange={(e) => setInitialPayment(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="0.00"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0F6B7A] focus:outline-none focus:ring-1 focus:ring-[#0F6B7A]"
            />
          </div>
        </div>

        {/* Live Balance Summary */}
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
          <div>
            <p className="text-xs text-slate-500 font-medium">Wadarta Dalabka</p>
            <p className="mt-1 text-lg font-bold text-[#122E40]">
              ${totalPrice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Hadda La Bixiyey</p>
            <p className="mt-1 text-lg font-bold text-teal-700">
              ${paid.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Hadhaaga Dhiman</p>
            <p className="mt-1 text-lg font-bold text-amber-600">
              ${remaining.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      {/* 4. SUBMIT BUTTON */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="submit"
          className="w-full sm:flex-1 rounded-xl bg-[#0F6B7A] py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#0c5763] active:scale-[0.99]"
        >
          Kaydi Dalabka
        </button>
        <Link
          href={`/dashboard?business=${businessId}`}
          className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-4 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Ka bax
        </Link>
      </div>
    </form>
  );
}
