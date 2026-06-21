import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// export const metadata: Metadata = {
//   title: "SMS — Safety Management System",
//   description: "Yusen Logistics Safety Management System",
// };

export const metadata : Metadata = {
  title: "SMS - Safety Management System",
  icons: {
    // icon: "/branding/favicon.ico",
    // atau kalau pakai PNG:
    icon: "/logo.svg",
    apple: "/branding/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
