import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harqaanle | Digital Tailoring",
  description: "Maamulka ganacsiga tolidda iyo dalabyada.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="so"><body>{children}</body></html>;
}
