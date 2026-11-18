"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Menu, X, ShieldCheck, Terminal, Cpu } from "lucide-react"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-[#08090C]/90 backdrop-blur-md border-b border-[#1E222A] py-3"
          : "bg-transparent border-b border-white/[0.06] py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#161920] border border-[#2B313D] text-white shadow-xs group-hover:border-[#D5222D] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.75 14 4.5 8 7.25 2 4.5 8 1.75Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M2 8 8 10.75 14 8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 11.5 8 14.25 14 11.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-[0.08em] text-white">
              MODEL<span className="text-[#D5222D]">VAULT</span>
            </span>
            <span className="text-[9px] font-mono tracking-wider text-[#737982] uppercase leading-none">
              Command Center
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-[#A0A6AF]">
          <Link href="#problem" className="hover:text-white transition-colors">
            The Problem
          </Link>
          <Link href="#orchestration" className="hover:text-white transition-colors">
            Multi-Agent
          </Link>
          <Link href="#workflows" className="hover:text-white transition-colors">
            Workflows
          </Link>
          <Link href="#studio" className="hover:text-white transition-colors">
            Dev Studio
          </Link>
          <Link href="#verification" className="hover:text-white transition-colors flex items-center gap-1.5">
            <span>Verification</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#D5222D]/15 text-[#D5222D] border border-[#D5222D]/30">
              AST
            </span>
          </Link>
          <Link href="#intelligence" className="hover:text-white transition-colors">
            Resource Intel
          </Link>
          <Link href="#governance" className="hover:text-white transition-colors">
            Governance
          </Link>
        </nav>

        {/* CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="px-3.5 py-2 text-xs font-semibold text-[#C2C1C9] hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/overview"
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-[#08090C] hover:bg-[#E8EAED] active:scale-[0.98] transition-all shadow-sm group"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#D5222D] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-[#A0A6AF] hover:text-white rounded-md border border-[#26282E]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#1E222A] bg-[#08090C] px-6 py-5 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-[#A0A6AF]">
            <Link
              href="#problem"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              The Problem
            </Link>
            <Link
              href="#orchestration"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              Multi-Agent Orchestration
            </Link>
            <Link
              href="#workflows"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              Visual Workflows
            </Link>
            <Link
              href="#studio"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              Live Dev Studio
            </Link>
            <Link
              href="#verification"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              Independent Verification
            </Link>
            <Link
              href="#intelligence"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              Resource Intelligence
            </Link>
            <Link
              href="#governance"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white transition-colors py-1"
            >
              Team Governance
            </Link>
          </nav>
          <div className="pt-3 border-t border-[#1E222A] flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full text-center py-2.5 text-xs font-semibold text-[#C2C1C9] hover:text-white border border-[#26282E] rounded-md"
            >
              Sign In
            </Link>
            <Link
              href="/overview"
              className="w-full flex items-center justify-center gap-2 rounded-md bg-white py-2.5 text-xs font-semibold text-[#08090C]"
            >
              <span>Launch Command Center</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#D5222D]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
