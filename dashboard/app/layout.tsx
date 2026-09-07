import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amir Dev Brain — Council Dashboard",
  description: "Live architectural debate, conflict review and synthesis approval console.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
