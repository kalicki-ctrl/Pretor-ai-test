import { Loader2 } from "lucide-react";

// Optimized loading component for Suspense fallbacks
export function LoadingFallback({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}