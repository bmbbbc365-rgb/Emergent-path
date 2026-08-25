import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import JourneyKey from "./JourneyKey";
import { ArrowRight } from "lucide-react";

export default function WelcomeModal({ open, onBegin }) {
  return (
    <Dialog open={open} onOpenChange={() => { /* intentionally not dismissible on outside click — must acknowledge */ }}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden border-0"
        data-testid="journey-welcome-modal">
        <VisuallyHidden.Root>
          <DialogTitle>This is your path forward</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative"
          style={{
            background:
              "radial-gradient(700px 300px at 90% -10%, #B5851F55 0%, transparent 60%), " +
              "linear-gradient(150deg, #2B1440 0%, #4a2a5a 60%, #7C4E80 100%)",
          }}>
          <div className="px-7 pt-8 pb-6 text-white">
            <div className="flex items-center gap-2">
              <JourneyKey size={28} tone="gold" glow />
              <div className="overline text-[#F5D28F]">This is your path forward</div>
            </div>
            <h2 className="font-display text-3xl leading-tight mt-3">
              You have a plan.<br />Now you get to build it.
            </h2>
            <p className="text-[#F3E1D8] text-sm leading-relaxed mt-4 max-w-md">
              Over the months ahead, you'll have opportunities to learn, organize,
              prepare, practice, complete important responsibilities, connect with
              resources, and build toward greater independence.
            </p>
            <p className="text-[#F3E1D8] text-sm leading-relaxed mt-3 max-w-md">
              Some days will involve big milestones. Others may involve one small
              thing you handled that you couldn't handle before. <span className="text-white font-semibold">Both count.</span>
            </p>
            <p className="text-[#F3E1D8] text-sm leading-relaxed mt-3 max-w-md">
              Your goal isn't perfection. Your goal is <span className="text-[#F5D28F] font-semibold">progress</span>.
              And there's something waiting at the end of this path — not an ending, another door.
            </p>
          </div>
          <div className="px-7 py-5 bg-[#1B1033]/40 border-t border-white/10 flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#F3E1D8]/80 italic">
              The door is waiting. The key is yours to build.
            </p>
            <Button
              onClick={onBegin}
              className="rounded-full text-[#1B1033] font-semibold px-5 py-2 shrink-0"
              style={{ background: "linear-gradient(120deg, #F5D28F, #D4AF37)" }}
              data-testid="journey-welcome-begin">
              Begin my path <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
