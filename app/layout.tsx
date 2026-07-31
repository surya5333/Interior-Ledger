import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import Sidebar from "../components/sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ledger",
  description: "A premium ledger for interior projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="flex min-h-screen bg-background text-text font-sans antialiased">
        <Providers>
          <Sidebar />
          <main className="flex-1 min-w-0 ">
            <div className="w-full max-w-[1800px] p-6 lg:p-10">
              {children}
            </div>
          </main>
          <Toaster position="top-right" richColors />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
