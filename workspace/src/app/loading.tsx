
import { Flame } from "lucide-react";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex flex-col items-center justify-center flex-1 bg-background text-foreground">
      <div className="relative">
        <Flame className="w-20 h-20 text-primary animate-pulse" style={{ animationDuration: '1.5s' }} />
      </div>
      <p className="mt-4 text-lg font-medium tracking-wider">
        Loading...
      </p>
    </div>
  );
}
