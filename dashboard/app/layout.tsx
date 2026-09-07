import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "عقل أمير التطويري — مجلس الذكاء الاصطناعي",
  description: "لوحة عربية حيّة لنقاش النماذج، كشف التعارضات، ومراجعة خلاصة المجلس.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
