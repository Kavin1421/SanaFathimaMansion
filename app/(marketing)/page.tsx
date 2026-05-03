import { CTASection } from "@/components/marketing/cta-section";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LivePreviewSection } from "@/components/marketing/live-preview-section";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TrustSection } from "@/components/marketing/trust-section";
import { TrustStrip } from "@/components/marketing/trust-strip";

export default function MarketingPage() {
  return (
    <>
      <MarketingHeader />
      <main className="animate-in fade-in duration-700 fill-mode-both">
        <HeroSection />
        <TrustStrip />
        <FeatureCards />
        <HowItWorks />
        <LivePreviewSection />
        <TrustSection />
        <CTASection />
      </main>
    </>
  );
}
