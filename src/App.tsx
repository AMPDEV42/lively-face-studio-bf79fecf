import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";

const Settings = lazy(() => import("./pages/Settings.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const AdminAnimations = lazy(() => import("./pages/AdminAnimations.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const Gallery = lazy(() => import("./pages/Gallery.tsx"));
const Docs = lazy(() => import("./pages/Docs.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const UsageDashboard = lazy(() => import("./pages/UsageDashboard.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
      retry: (failureCount, error: unknown) => {
        // Do not retry for 4xx client errors
        const status = (error as { status?: number })?.status;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const PageFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auth"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Auth />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/admin/animations"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProtectedRoute>
                    <AdminAnimations />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/pricing" element={<Suspense fallback={<PageFallback />}><Pricing /></Suspense>} />
            <Route path="/gallery" element={<Suspense fallback={<PageFallback />}><Gallery /></Suspense>} />
            <Route path="/docs" element={<Suspense fallback={<PageFallback />}><Docs /></Suspense>} />
            <Route path="/legal" element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
            <Route
              path="/usage"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProtectedRoute>
                    <UsageDashboard />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
