import { lazy, Suspense, useEffect, useState } from "react";
import { scheduleIdleWork } from "@/lib/idle";

const CustomCursor = lazy(() =>
  import("@/components/CustomCursor").then((module) => ({ default: module.CustomCursor })),
);

export function DeferredCustomCursor() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return scheduleIdleWork(() => setReady(true), 1200);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <CustomCursor />
    </Suspense>
  );
}
