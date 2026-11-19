import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { AgentOrchestration } from "@/components/landing/AgentOrchestration"
import { WorkflowShowcase } from "@/components/landing/WorkflowShowcase"
import { DevelopmentStudio } from "@/components/landing/DevelopmentStudio"
import { VerificationSection } from "@/components/landing/VerificationSection"
import { ResourceIntelligence } from "@/components/landing/ResourceIntelligence"
import { CollaborationSection } from "@/components/landing/CollaborationSection"
import { FinalCTA } from "@/components/landing/FinalCTA"
import { Footer } from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#08090A] text-white selection:bg-[#F5A623]/20 selection:text-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <AgentOrchestration />
      <WorkflowShowcase />
      <DevelopmentStudio />
      <VerificationSection />
      <ResourceIntelligence />
      <CollaborationSection />
      <FinalCTA />
      <Footer />
    </main>
  )
}
