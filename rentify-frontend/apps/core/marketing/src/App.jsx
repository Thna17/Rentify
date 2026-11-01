import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Home";
import About from "./pages/About";
import FeaturesPage from "./pages/feature/Feature";
import Solutions from "./pages/solutions/Solutions";
// import Contact from "./pages/Contact";
import Pricing from "./pages/pricing/Pricing";
import Onboarding from "./pages/Onboarding/AdvancedOnboarding";

import LiveDemoPage from "./pages/live-demo/LiveDemo";
import ShowcasePage from "./pages/showcase/Showcase";
import SiteTour from "./components/site/SiteTour";
const ShowcaseWall = React.lazy(() => import("./pages/showcase-wall/ShowcaseWall"));
// import NotFound from "./pages/NotFound";
import BrowseTemplates from "./pages/template-browse";
import TemplateDetailPage from "./pages/template-detail";
import useMarketingAuth from "./hooks/useMarketingAuth";

// One onboarding only: every "create store" link lands on the sidebar flow.
// If the merchant is already signed in AND has a store, send them straight to their dashboard.
// If they have no store yet, allow them to complete onboarding.
function StartRedirect() {
  const { isAuthenticated, user, dashboardHref, isLoading } = useMarketingAuth();
  const { search } = useLocation();

  if (isLoading) return null;

  if (isAuthenticated && user?.hasStore) {
    window.location.replace(dashboardHref);
    return null;
  }

  const params = new URLSearchParams(search);
  const plan = (params.get("plan") || "starter").toLowerCase();
  params.delete("plan");
  const rest = params.toString();
  return <Navigate replace to={`/onboarding/${encodeURIComponent(plan)}${rest ? `?${rest}` : ""}`} />;
}
const App = () => (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <LanguageProvider>
        {/* <TooltipProvider> */}
          {/* <Toaster /> */}
          {/* <Sonner /> */}
          <BrowserRouter>
            {/* Website tour: any page opened with ?tour=1 scrolls itself */}
            <SiteTour />
            <Routes>
              <Route path="/" element={<Index />} />
  
              <Route path="/feature" element={<FeaturesPage />} />

              <Route path="/solutions" element={<Solutions />} />
              <Route path="/live-demo" element={<LiveDemoPage />} />
              <Route path="/showcase" element={<ShowcasePage />} />
              <Route path="/showcase/wall" element={<React.Suspense fallback={<div className="h-screen bg-[#f4f6fb]" />}><ShowcaseWall /></React.Suspense>} />

              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              {/* <Route path="/contact" element={<Contact />} /> */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/:packageId" element={<Onboarding />} />
              <Route path="/start" element={<StartRedirect />} />
              <Route path="/templates" element={<BrowseTemplates />} />
              <Route path="/templates/:id" element={<TemplateDetailPage />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              {/* <Route path="*" element={<NotFound />} /> */}
            </Routes>
          </BrowserRouter>
        {/* </TooltipProvider> */}
      </LanguageProvider>
    </ThemeProvider>
);

export default App;
