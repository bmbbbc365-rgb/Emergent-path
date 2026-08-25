import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ExternalLink, ArrowRight } from "lucide-react";
import JourneyKey from "./JourneyKey";

/**
 * BlueprintDoor — the interactive doorway representing the transition to
 * Build My Blueprint™. Always visible as a future destination.
 * Interactive unlock ONLY when `unlocked` is true (admin-approved graduation).
 *
 * Props:
 *  - unlocked: boolean (graduation_approved)
 *  - onUnlock: () => void  (called after the animation finishes)
 *  - variant: "hero" | "compact"  — hero for the graduation celebration
 */
export default function BlueprintDoor({ unlocked, onUnlock, variant = "hero" }) {
  const [inserted, setInserted] = useState(false);
  const [opening, setOpening] = useState(false);
  const clicked = useRef(false);

  useEffect(() => {
    if (opening) {
      const t = setTimeout(() => onUnlock?.(), 900);
      return () => clearTimeout(t);
    }
  }, [opening, onUnlock]);

  const handleKey = () => {
    if (!unlocked || clicked.current) return;
    clicked.current = true;
    setInserted(true);
    setTimeout(() => setOpening(true), 520);
  };

  const H = variant === "hero" ? 380 : 240;
  const W = variant === "hero" ? 300 : 190;

  return (
    <div
      className={`relative mx-auto ${unlocked ? "cursor-pointer" : "cursor-not-allowed"}`}
      style={{ width: W, height: H + 40 }}
      onClick={handleKey}
      role={unlocked ? "button" : undefined}
      aria-label={unlocked ? "Unlock Build My Blueprint" : "Locked door — graduation required"}
      data-testid="blueprint-door">
      {/* Radiant glow behind the door */}
      {unlocked && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, rgba(245,210,143,0.55) 0%, transparent 70%)",
          }} />
      )}
      {/* Door frame */}
      <div
        className="absolute left-1/2 top-2 -translate-x-1/2 rounded-t-[140px] overflow-hidden"
        style={{
          width: W,
          height: H,
          background:
            "linear-gradient(180deg, #7A3A47 0%, #4a2a5a 60%, #2B1440 100%)",
          boxShadow:
            "0 30px 60px -20px rgba(27,16,51,0.55), inset 0 0 0 6px rgba(245,210,143,0.20)",
        }}>
        {/* Door itself */}
        <AnimatePresence>
          {!opening && (
            <motion.div
              key="door-face"
              initial={{ rotateY: 0 }}
              exit={{ rotateY: -78, x: -40, transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] } }}
              className="absolute inset-2 rounded-t-[132px] origin-left"
              style={{
                background:
                  "linear-gradient(180deg, #FBF3E9 0%, #F3E1D8 40%, #EED2E0 100%)",
                boxShadow: "inset 0 0 0 3px rgba(212,175,55,0.35), inset 0 40px 60px -20px rgba(122,58,71,0.15)",
                transformStyle: "preserve-3d",
              }}>
              {/* Inner panel */}
              <div className="absolute inset-3 rounded-t-[122px]"
                style={{
                  border: "2px dashed rgba(139,78,90,0.35)",
                }} />
              {/* Door knob / key hole */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#4a2a5a] shadow-inner" />
                <div className="w-1.5 h-5 bg-[#4a2a5a] mt-0.5 rounded-b" />
              </div>
              {/* Copy inside door */}
              <div className="absolute inset-x-0 top-16 text-center px-6">
                <div className="overline text-[#8E4E5A]">Build My Blueprint™</div>
                <div className="font-display text-base text-[#1B1033] leading-snug mt-1 italic px-1">
                  You forged the key to break your chains; now cross the bridge to conquer your future. Step through—you earned this horizon.
                </div>
                {!unlocked && (
                  <div className="mt-4 flex flex-col items-center gap-2 text-[#8E4E5A]">
                    <Lock className="w-5 h-5" />
                    <p className="text-xs italic max-w-[10rem] leading-snug">
                      Complete your program milestones to earn the key.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Behind-the-door reveal */}
        {opening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="absolute inset-2 rounded-t-[132px] flex flex-col items-center justify-center px-4"
            style={{
              background:
                "radial-gradient(closest-side, #F5D28F 0%, #B5851F 45%, #2B1440 100%)",
            }}>
            <div className="text-center">
              <div className="overline text-[#F5D28F]">The next chapter</div>
              <div className="font-display text-2xl text-white mt-1">Build My Blueprint™</div>
              <p className="text-xs text-[#F3E1D8] mt-2 max-w-[12rem]">
                Continue organizing, learning, and building beyond reentry.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* The key — sits in front, animates into the keyhole */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={
          inserted
            ? { left: `calc(50% + ${W / 2 - 34}px)`, top: H / 2 - 6, rotate: 90, scale: 0.85 }
            : { left: `calc(50% - 32px)`, top: H + 4, rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ pointerEvents: "none" }}>
        <div className={unlocked ? "" : "opacity-50 grayscale"}>
          <JourneyKey size={64} tone="gold" glow={unlocked} />
        </div>
      </motion.div>

      {/* Caption / label */}
      <div className="absolute inset-x-0 -bottom-2 text-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#4a2a5a]">
          {unlocked ? "Tap the key" : "Locked"}
        </div>
      </div>
    </div>
  );
}
