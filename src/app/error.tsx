"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center px-5"><section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm"><p className="text-sm font-bold tracking-[.18em] text-[#0F6B7A]">HARQAANLE</p><h1 className="mt-5 text-2xl font-semibold text-[#122E40]">Waxbaa khaldamay</h1><p className="mt-2 text-sm text-slate-600">Xogta lama soo qaadi karin. Isku day mar kale.</p><button onClick={() => reset()} className="mt-5 rounded-xl bg-[#122E40] px-4 py-3 text-sm font-semibold text-white">Dib u tijaabi</button></section></main>;
}
