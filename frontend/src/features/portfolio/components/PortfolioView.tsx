import React from 'react';
import { BlurText } from '@/components/react-bits/BlurText';
import { ShinyText } from '@/components/react-bits/ShinyText';
import { SpotlightCard } from '@/components/react-bits/SpotlightCard';
import { DecryptedText } from '@/components/react-bits/DecryptedText';
import { Squares } from '@/components/react-bits/Squares';
import { InfiniteMarquee } from '@/components/react-bits/InfiniteMarquee';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github, Mail, User, Calendar, Sparkles, ArrowRight, Code, BookOpen } from 'lucide-react';

interface PortfolioViewProps {
  activeTab: 'practice' | 'about';
  setActiveTab: (tab: 'practice' | 'about') => void;
}

export function PortfolioView({ activeTab, setActiveTab }: PortfolioViewProps): React.ReactElement {
  const skillsRow1 = ['React', 'TypeScript', 'Node.js', 'Express', 'Tailwind CSS', 'Vite'];
  const skillsRow2 = ['Socket.io', 'PostgreSQL', 'Prisma ORM', 'Docker', 'AI Prompt Engineering', 'Web Audio API'];

  return (
    <div className="relative w-full min-h-screen font-sans text-neutral-200 overflow-x-hidden">

      {/* Background Animating Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.35]">
        <Squares
          direction="diagonal"
          speed={0.25}
          squareSize={48}
          borderColor="rgba(255, 255, 255, 0.025)"
          hoverFillColor="rgba(255, 255, 255, 0.04)"
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col min-h-screen px-4 sm:px-6 md:px-8 py-4 sm:py-6">

        {/* 1. Header Area */}
        <header className="flex justify-between items-center py-4 border-b border-neutral-800 shrink-0 gap-4 mb-8">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="font-bold tracking-tight text-white text-base sm:text-lg whitespace-nowrap">
              <DecryptedText text="Developer Hub" animateOn="load" speed={50} maxIterations={5} />
            </span>
          </div>

          {/* Navigation Switcher */}
          <div className="flex shrink-0 bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-3 py-1.5 rounded-md transition-colors duration-200 cursor-pointer ${activeTab === 'practice'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              Practice
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-3 py-1.5 rounded-md transition-colors duration-200 cursor-pointer ${activeTab === 'about'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              About Me
            </button>
          </div>

          {/* Right Spacer for balanced centering */}
          <div className="flex-1 flex items-center justify-end" />
        </header>

        {/* 2. Main Profile Content */}
        <div className="flex-1 flex flex-col gap-8 animate-fade-in pb-12">

          {/* Hero Section */}
          <section className="text-center space-y-3 py-4">
            <div className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              <BlurText text="Hi, I am Dat Nguyen" delay={45} animateBy="words" />
            </div>
            <div className="text-sm sm:text-base text-neutral-400 font-mono">
              <ShinyText text="Fullstack Software Engineer & AI Builder" speed={4} />
            </div>
          </section>

          {/* Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">

            {/* Biography Spotlight Card */}
            <SpotlightCard className="md:col-span-3 flex flex-col justify-between hover:border-neutral-700 transition-all duration-300 shadow-lg bg-neutral-950/40 backdrop-blur-md">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4 text-neutral-400 animate-pulse" />
                  <CardTitle className="text-lg">
                    <DecryptedText text="Biography" animateOn="hover" />
                  </CardTitle>
                </div>
                <CardDescription className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  I am a passionate software developer specializing in building modern web applications, integrating AI capabilities, and designing real-time interactive systems. This AI English Roleplay web application is one of my projects built to explore Web Audio streaming, WebSockets, and LLM orchestration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-0.5">Project Overview</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      This platform allows IELTS learners to practice speaking English dynamically. It processes real-time voice, evaluates band score requirements, suggests optimal replies, and synthesizes speech seamlessly using advanced LLM prompts.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-neutral-900/80 pt-4 mt-2">
                <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
                  <DecryptedText text="Crafting robust and elegant codebases" animateOn="hover" speed={30} />
                </div>
              </CardFooter>
            </SpotlightCard>

            {/* Quick Info & Contacts Spotlight Card */}
            <SpotlightCard className="md:col-span-2 flex flex-col justify-between hover:border-neutral-700 transition-all duration-300 shadow-lg bg-neutral-950/40 backdrop-blur-md">
              <CardHeader className="space-y-1.5">
                <CardTitle className="text-lg text-white">
                  <DecryptedText text="Personal Profile" animateOn="hover" />
                </CardTitle>
                <CardDescription className="text-neutral-500 text-xs">Reach out or checkout my work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-neutral-400" />
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider">
                      <DecryptedText text="Full Name" animateOn="hover" speed={25} />
                    </div>
                    <div className="text-neutral-200 font-medium">Nguyễn Thành Đạt (Đạt Nguyễn)</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider">
                      <DecryptedText text="Focus Areas" animateOn="hover" speed={25} />
                    </div>
                    <div className="text-neutral-200 font-medium">Web App Architecture, AI Tooling</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider">
                      <DecryptedText text="Email Address" animateOn="hover" speed={25} />
                    </div>
                    <a href="mailto:datnguyen9240@gmail.com" className="text-white hover:underline transition-colors">
                      datnguyen9240@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Github className="w-4 h-4 text-neutral-400" />
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider">
                      <DecryptedText text="Github Username" animateOn="hover" speed={25} />
                    </div>
                    <a href="https://github.com/datnguyen9240" target="_blank" rel="noreferrer" className="text-white hover:underline transition-colors">
                      github.com/datnguyen9240
                    </a>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <a
                  href="https://github.com/datnguyen9240/AI-English-Roleplay-Web-App"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all duration-200"
                >
                  <Github className="w-4 h-4 animate-bounce" style={{ animationDuration: '3s' }} />
                  <span>Star on GitHub</span>
                </a>
              </CardFooter>
            </SpotlightCard>
          </div>

          {/* Tech Stack Section with Opposing Inf Marquee Carousels */}
          <section className="space-y-4 relative">
            <div className="flex items-center gap-2 text-white px-1">
              <Code className="w-4 h-4 text-neutral-400" />
              <h3 className="text-base font-bold uppercase tracking-wider font-mono">
                <DecryptedText text="Tech Stack & Tools" animateOn="hover" />
              </h3>
            </div>
            <div className="flex flex-col gap-2 overflow-hidden py-1">
              <InfiniteMarquee items={skillsRow1} direction="left" speed={22} />
              <InfiniteMarquee items={skillsRow2} direction="right" speed={26} />
            </div>
          </section>

          {/* Call to Action to Practice */}
          <section className="pt-6 border-t border-neutral-900 flex justify-center">
            <Button
              onClick={() => setActiveTab('practice')}
              className="group h-11 px-6 rounded-lg font-bold bg-white hover:bg-neutral-200 text-black transition-colors duration-200 text-sm flex items-center gap-2 shadow cursor-pointer animate-pulse-neutral"
            >
              <span>Start Practice Speaking</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </section>

        </div>
      </div>
    </div>
  );
}
