import { Suspense } from "react";
import ReportsContent from "./ReportsContent";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}