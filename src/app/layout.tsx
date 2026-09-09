import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "오늘 할 일", icons: { icon: "data:," } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
