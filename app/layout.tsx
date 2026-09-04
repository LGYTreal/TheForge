import BanGuard from "@/components/BanGuard";
import type { Metadata } from "next";
import "./globals.css";
import ForgePreferences from "@/components/ForgePreferences";

export const metadata: Metadata = {
  title: "Forge",
  description: "Build something together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ForgePreferences />
        <BanGuard>{children}</BanGuard>
      </body>
    </html>
  );
}