import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "bixike · 夜樱庭院",
 description: "夜樱下的一处小庭院，收藏作品、日常和慢慢生长的想法。",
 icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
 return <html lang="zh-CN"><body>{children}</body></html>;
}