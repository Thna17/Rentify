import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Home";
import About from "./pages/About";
import FeaturesPage from "./pages/feature/Feature";
import Solutions from "./pages/solutions/Solutions";
// import Contact from "./pages/Contact";
import Pricing from "./pages/pricing/Pricing";
import Onboarding from "./pages/Onboarding/AdvancedOnboarding";
import StartSelling from "./pages/Onboarding/StartSelling";
import LiveDemoPage from "./pages/live-demo/LiveDemo";
// import NotFound from "./pages/NotFound";
import BrowseTemplates from "./pages/template-browse";
import TemplateDetailPage from "./pages/template-detail";
const App = () => (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <LanguageProvider>
        {/* <TooltipProvider> */}
          {/* <Toaster /> */}
          {/* <Sonner /> */}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
  
              <Route path="/feature" element={<FeaturesPage />} />

              <Route path="/solutions" element={<Solutions />} />
              <Route path="/live-demo" element={<LiveDemoPage />} />

              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              {/* <Route path="/contact" element={<Contact />} /> */}
              <Route path="/onboarding/:packageId" element={<Onboarding />} />
              <Route path="/start" element={<StartSelling />} />
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
