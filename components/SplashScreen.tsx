
import React, { useEffect, useState, useMemo } from 'react';

interface SplashProps {
  onFinish: () => void;
}

const SYMBOLS = ['Σ', 'μ', 'σ', 'x̄', 'r', 'π', '∫', '∞', '∆', 'θ', 'λ', '0', '1'];

const AmbientDataCascade = () => {
  // Generate random floating elements for the periphery (Left 0-20%, Right 80-100%)
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const isLeft = Math.random() > 0.5;
      // Position strictly in left 25% or right 25% for better visibility
      const leftPos = isLeft 
        ? Math.random() * 25 
        : 75 + Math.random() * 25; 
      
      const isSymbol = Math.random() > 0.4;
      const content = isSymbol 
        ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        : null; // null implies a data dot/node

      return {
        id: i,
        content,
        left: `${leftPos}%`,
        top: `${Math.random() * 120 - 10}%`, // Start slightly off-screen to spread them out
        delay: `${Math.random() * -10}s`, // Negative delay to start mid-animation
        duration: `${6 + Math.random() * 8}s`,
        size: isSymbol ? `${0.8 + Math.random()}rem` : `${4 + Math.random() * 4}px`,
        opacity: 0.1 + Math.random() * 0.3, // Slightly increased base opacity for visibility
        swayDuration: `${3 + Math.random() * 4}s`
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none w-full h-full z-0">
      {/* Vertical Data Guidelines */}
      <div className="absolute left-[15%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-skin-accent/20 to-transparent opacity-50" />
      <div className="absolute right-[15%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-skin-accent/20 to-transparent opacity-50" />

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute flex flex-col items-center justify-center will-change-transform"
          style={{
            left: p.left,
            top: p.top,
            opacity: p.opacity,
            animation: `floatUp ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        >
          <div 
            className="text-skin-accent font-mono font-bold"
            style={{
              fontSize: p.size,
              animation: `sway ${p.swayDuration} ease-in-out infinite alternate`,
            }}
          >
            {p.content ? (
              p.content
            ) : (
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-skin-accent shadow-[0_0_8px_rgba(var(--color-accent),0.8)]" />
                {/* Random faint connection line for nodes */}
                {p.id % 3 === 0 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-skin-accent/40 to-transparent" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const SplashScreen: React.FC<SplashProps> = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Total animation duration timeline
    // 0.0s - 1.2s: Drawing Sigma
    // 1.2s - 1.6s: Flash & Text Reveal
    // 1.8s - 3.2s: Cinematic Zoom (Camera moves "through" the logo)
    // 3.0s: Fade out container

    // Trigger container fade out at 3.0s
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2800);

    // Unmount component at 3.5s
    const unmountTimer = setTimeout(() => {
      onFinish();
    }, 3300);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-skin-base flex items-center justify-center overflow-hidden transition-opacity duration-1000 ease-out ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <style>{`
        /* Ambient Animations */
        @keyframes floatUp {
          from { transform: translateY(110vh); }
          to { transform: translateY(-20vh); }
        }

        @keyframes sway {
          from { transform: translateX(-15px) rotate(-10deg); }
          to { transform: translateX(15px) rotate(10deg); }
        }

        .splash-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          /* The cinematic zoom animation */
          animation: cameraZoom 1.4s cubic-bezier(0.7, 0, 0.3, 1) 1.8s forwards;
          will-change: transform, opacity;
          z-index: 20;
        }

        /* SVG Styles */
        .sigma-svg {
          width: 140px;
          height: 140px;
          overflow: visible;
          animation: sigmaGlow 0.4s ease-out 1.2s forwards;
          position: relative;
          z-index: 10;
        }

        .sigma-path {
          fill: none;
          stroke: rgb(var(--color-accent));
          stroke-width: 8;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          /* The drawing animation */
          animation: drawSigma 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* Text Styles */
        .brand-text {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 3rem;
          color: white;
          letter-spacing: -0.02em;
          margin-top: 1rem;
          opacity: 0;
          transform: translateY(20px);
          text-shadow: 0 0 0px transparent;
          position: relative;
          z-index: 10;
          /* Reveal animation */
          animation: textReveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 1.2s forwards;
        }

        .brand-accent {
          color: rgb(var(--color-accent));
        }

        /* Flash / Burst Effect */
        .flash-burst {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(var(--color-accent),0.8) 0%, rgba(0,0,0,0) 70%);
          opacity: 0;
          pointer-events: none;
          z-index: 5;
          animation: burstFlash 0.5s ease-out 1.2s forwards;
        }

        /* KEYFRAMES */

        @keyframes drawSigma {
          0% { stroke-dashoffset: 300; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes sigmaGlow {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
        }

        @keyframes textReveal {
          0% { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        @keyframes burstFlash {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
        }

        @keyframes cameraZoom {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.1); opacity: 1; } /* Slight anticipation pull-back */
          100% { transform: scale(20); opacity: 0; } /* Zoom through */
        }
      `}</style>
      
      {/* Background Ambient Effect */}
      <AmbientDataCascade />

      <div className="splash-container">
        {/* Flash Burst Behind */}
        <div className="flash-burst" />

        {/* The Sigma Logo */}
        <svg className="sigma-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Path: Top Right -> Top Left -> Center -> Bottom Left -> Bottom Right */}
          <path 
            className="sigma-path" 
            d="M 80 15 L 25 15 L 60 50 L 25 85 L 80 85"
          />
        </svg>

        {/* The Text */}
        <h1 className="brand-text">
          Stat<span className="brand-accent">Forge</span>
        </h1>
      </div>
    </div>
  );
};
