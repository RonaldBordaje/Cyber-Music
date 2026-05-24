/**
 * IntroScreen – Cinematic splash/loading screen for Cyber Music
 * Full-screen boot sequence with animated logo and glitch effects
 */
import { useState, useEffect } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<'boot' | 'logo' | 'loading' | 'exit'>('boot');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'), 400);
    const t2 = setTimeout(() => setPhase('loading'), 1800);
    const t3 = setTimeout(() => setPhase('exit'), 3000);
    const t4 = setTimeout(() => onComplete(), 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #0f0f0f 0%, #0a0a0a 50%, #050505 100%)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
          zIndex: 10,
        }}
      />

      {/* Moving scan line */}
      {(phase === 'logo' || phase === 'loading') && (
        <div
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, var(--red) 50%, transparent 100%)',
            boxShadow: '0 0 20px var(--red-glow)',
            zIndex: 20,
            animation: 'intro-scanline 2.5s linear infinite',
          }}
        />
      )}

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 5 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: i % 4 === 0 ? 'var(--red)' : 'rgba(255,255,255,0.2)',
              left: `${5 + Math.random() * 90}%`,
              bottom: `${-5 + Math.random() * 30}%`,
              animation: `intro-particle ${2 + Math.random() * 3}s ease-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: i % 4 === 0 ? '0 0 8px var(--red-glow)' : 'none',
              opacity: phase === 'boot' ? 0 : 1,
              transition: 'opacity 0.5s',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center" style={{ zIndex: 30 }}>
        {/* Logo */}
        <div className="relative mb-10">
          {/* Pulse rings */}
          {phase !== 'boot' && (
            <>
              <div
                className="absolute rounded-full"
                style={{
                  inset: '-8px',
                  animation: 'intro-ring-pulse 2s ease-out infinite',
                  border: '2px solid var(--red)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  inset: '-8px',
                  animation: 'intro-ring-pulse 2s ease-out infinite 0.7s',
                  border: '2px solid var(--red)',
                }}
              />
            </>
          )}

          {/* Disc */}
          <div
            className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #2a0003 0%, #0a0a0a 60%)',
              border: '3px solid var(--red)',
              boxShadow: phase !== 'boot'
                ? '0 0 50px var(--red-glow), 0 0 100px rgba(232,0,13,0.2)'
                : 'none',
              animation: phase !== 'boot' ? 'intro-logo-appear 0.8s ease-out forwards' : 'none',
              opacity: phase === 'boot' ? 0 : 1,
            }}
          >
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-full relative overflow-hidden disc-spin"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #222 0%, #111 50%, #0a0a0a 100%)',
                animationDuration: '4s',
              }}
            >
              <div className="absolute inset-2 rounded-full border border-white/5" />
              <div className="absolute inset-4 rounded-full border border-white/5" />
              <div className="absolute inset-6 rounded-full border border-white/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, var(--red) 0%, #8b0000 100%)',
                    boxShadow: '0 0 15px var(--red-glow)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div
          style={{
            opacity: phase === 'boot' ? 0 : 1,
            animation: phase !== 'boot' ? 'intro-text-reveal 0.6s ease-out forwards' : 'none',
            animationDelay: '0.2s',
          }}
        >
          <h1
            className="glitch-text text-4xl md:text-5xl lg:text-6xl font-black tracking-[0.1em] text-text-primary mb-3"
            style={{ fontFamily: 'var(--font-heading)' }}
            data-text="CYBER MUSIC"
          >
            <span className="glitch-text-color">CYBER MUSIC</span>
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="text-xs md:text-sm tracking-[0.5em] uppercase mb-10"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--red)',
            opacity: phase === 'boot' ? 0 : 1,
            transition: 'opacity 0.5s ease 0.6s',
          }}
        >
          ▸ OFFLINE PLAYER ◂
        </p>

        {/* Loading bar */}
        <div className="w-64 md:w-80 h-[3px] rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--red), #ff4444, var(--red))',
              boxShadow: '0 0 15px var(--red-glow)',
              width: phase === 'loading' || phase === 'exit' ? '100%' : '0%',
              transition: 'width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        </div>

        {/* Status */}
        <p
          className="text-[10px] md:text-xs mt-4 tracking-[0.2em] uppercase"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-dim)',
            opacity: phase === 'boot' ? 0 : 0.6,
          }}
        >
          {phase === 'boot' && 'INITIALIZING...'}
          {phase === 'logo' && 'BOOTING SYSTEM...'}
          {phase === 'loading' && 'LOADING...'}
          {phase === 'exit' && 'READY'}
        </p>
      </div>

      {/* Version */}
      <div className="absolute bottom-6" style={{ zIndex: 30 }}>
        <p
          className="text-[9px] tracking-[0.3em] uppercase"
          style={{ fontFamily: 'var(--font-heading)', color: '#333' }}
        >
          v1.0 ─ WEB EDITION
        </p>
      </div>
    </div>
  );
}
