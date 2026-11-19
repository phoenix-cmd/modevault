import { AgentOrchestration } from "@/components/landing/AgentOrchestration"
import { CollaborationSection } from "@/components/landing/CollaborationSection"
import { DevelopmentStudio } from "@/components/landing/DevelopmentStudio"
import { FinalCTA } from "@/components/landing/FinalCTA"
import { Footer } from "@/components/landing/Footer"
import { Hero } from "@/components/landing/Hero"
import { Navbar } from "@/components/landing/Navbar"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { ResourceIntelligence } from "@/components/landing/ResourceIntelligence"
import { VerificationSection } from "@/components/landing/VerificationSection"
import { WorkflowShowcase } from "@/components/landing/WorkflowShowcase"

export default function LandingPage() {
  return (
    <div className="mkt min-h-screen">
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProblemSection />
        <AgentOrchestration />
        <WorkflowShowcase />
        <DevelopmentStudio />
        <VerificationSection />
        <ResourceIntelligence />
        <CollaborationSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
