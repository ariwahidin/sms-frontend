// page.tsx
import { Suspense } from "react";
import LoginContent from "./LoginPage";

export const metadata = {
  title: "SMS - Safety Management System",
  icons: {
    // icon: "/branding/favicon.ico",
    // atau kalau pakai PNG:
    icon: "/logo.svg",
    apple: "/branding/apple-icon.png",
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}