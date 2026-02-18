import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { PublicLayout } from "./components/PublicLayout";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LandingPage, ChatPage } from "./pages";
import { Loader2 } from "lucide-react";

const IfcPage = lazy(() => import("./pages/IfcPage").then((m) => ({ default: m.IfcPage })));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <Toaster />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>
          <Route path="/chat" element={<ChatPage />} />
          <Route
            path="/ifc"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <IfcPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
