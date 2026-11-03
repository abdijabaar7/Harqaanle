import Link from "next/link";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center px-5"><section className="rounded-2xl bg-white p-8 text-center shadow-sm"><p className="text-sm font-bold text-[#0F6B7A]">404</p><h1 className="mt-3 text-xl font-semibold text-[#122E40]">Bogga ama dalabka lama helin</h1><Link href="/dashboard" className="mt-5 inline-block rounded-lg bg-[#122E40] px-4 py-2.5 text-sm font-medium text-white">Dashboard</Link></section></main>;
}
