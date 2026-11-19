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
          ? "bg-[#08090A]/90 backdrop-blur-md border-b border-[#1E2024] py-3"
          : "bg-transparent border-b border-white/[0.06] py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#16171A] border border-[#2D3036] text-white group-hover:border-[#F5A623] transition-colors">
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
              MODEL<span className="text-[#F5A623]">VAULT</span>
            </span>
            <span className="text-[9px] font-mono tracking-wider text-[#6F6C64] uppercase leading-none">
              Command Center
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-[#A5A29A]">
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
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
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
            className="px-3.5 py-2 text-xs font-semibold text-[#C9C5BC] hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/overview"
            className="flex items-center gap-2 rounded-md bg-[#F5A623] px-4 py-2 text-xs font-semibold text-[#08090A] hover:bg-[#D98A12] active:scale-[0.98] transition-all group"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#08090A] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-[#A5A29A] hover:text-white rounded-md border border-[#2D3036]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#1E2024] bg-[#08090A] px-6 py-5 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-[#A5A29A]">
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
          <div className="pt-3 border-t border-[#1E2024] flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full text-center py-2.5 text-xs font-semibold text-[#C9C5BC] hover:text-white border border-[#2D3036] rounded-md"
            >
              Sign In
            </Link>
            <Link
              href="/overview"
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#F5A623] py-2.5 text-xs font-semibold text-[#08090A]"
            >
              <span>Launch Command Center</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#08090A]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
