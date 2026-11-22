import { AgentOrchestration } from "@/components/landing/AgentOrchestration"
import { BenefitsSection } from "@/components/landing/BenefitsSection"
import { DevelopmentStudio } from "@/components/landing/DevelopmentStudio"
import { FaqSection } from "@/components/landing/FaqSection"
import { FinalCTA } from "@/components/landing/FinalCTA"
import { Footer } from "@/components/landing/Footer"
import { Hero } from "@/components/landing/Hero"
import { IntegrationsSection } from "@/components/landing/IntegrationsSection"
import { IntroducingSection } from "@/components/landing/IntroducingSection"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { ResourceIntelligence } from "@/components/landing/ResourceIntelligence"
import { VerificationSection } from "@/components/landing/VerificationSection"
import { WorkflowShowcase } from "@/components/landing/WorkflowShowcase"

export default function LandingPage() {
  return (
    <div className="rig-page min-h-screen">
      {/* Lightweight CRT & technical framing overlays (pure CSS/SVG, zero JS loops) */}
      <div className="rig-scanlines" aria-hidden="true" />
      <div className="rig-rgb-fringe" aria-hidden="true" />
      <div className="rig-grain" aria-hidden="true" />
      <div className="rig-content-lines" aria-hidden="true" />

      <Hero />

      {/* Pixel-dithered transition from Electric Blue Hero to Deep Charcoal */}
      <div className="rig-pixel-transition" aria-hidden="true" />

      <main id="main-content" className="relative z-10">
        <ProblemSection />
        <IntroducingSection />
        <AgentOrchestration />
        <VerificationSection />
        <WorkflowShowcase />
        <DevelopmentStudio />
        <ResourceIntelligence />
        <BenefitsSection />
        <IntegrationsSection />
        <FaqSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  )
}
