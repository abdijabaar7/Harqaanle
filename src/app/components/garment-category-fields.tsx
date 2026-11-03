"use client";

import { useState } from "react";

const categories: Record<string, string[]> = {
  shirt: ["S", "M", "L", "B", "K"],
  trousers: ["B", "L", "C", "T", "K"],
};

export function GarmentCategoryFields({ initialGarment = "shirt", initialCategory }: { initialGarment?: "shirt" | "trousers"; initialCategory?: string }) {
  const [garment, setGarment] = useState(initialGarment);
  const [category, setCategory] = useState(initialCategory && categories[initialGarment].includes(initialCategory) ? initialCategory : categories[initialGarment][0]);

  function changeGarment(value: "shirt" | "trousers") {
    setGarment(value);
    setCategory(categories[value][0]);
  }

  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-medium">Nooca dharka
      <select name="garment" value={garment} onChange={(event) => changeGarment(event.target.value as "shirt" | "trousers")} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"><option value="shirt">Shaati</option><option value="trousers">Surwaal</option></select>
    </label>
    <label className="block text-sm font-medium">Category / xaraf
      <select name="category_label" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3">{categories[garment].map((letter) => <option key={letter} value={letter}>{letter}</option>)}</select>
    </label>
  </div>;
}
