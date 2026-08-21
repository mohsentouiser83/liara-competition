import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liara Copilot",
  description: "دستیار مستندات و عیب‌یابی لیارا"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
