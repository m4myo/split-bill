import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SplitBill — share expenses with a link",
  description: "Create a bill request, share a public link, and track who has paid.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Navbar />
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="mt-auto border-t border-[var(--border)] bg-white">
            <p className="mx-auto max-w-[960px] px-6 py-4 text-center text-xs text-[var(--text-muted)]">
              © {new Date().getFullYear()} Myo Pyae Sone. All rights reserved.
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
