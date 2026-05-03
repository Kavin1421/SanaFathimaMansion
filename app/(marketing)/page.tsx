import { CTASection } from "@/components/marketing/cta-section";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { HeroSection } from "@/components/marketing/hero-section";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TrustSection } from "@/components/marketing/trust-section";

export default function MarketingPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <HeroSection />
        <FeatureCards />
        <DashboardPreview />
        <TrustSection />
        <CTASection />
      </main>
    </>
  );
}
