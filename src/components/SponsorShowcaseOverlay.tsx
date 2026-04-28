"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { SponsorLite } from "@/types";

const TOTAL_DURATION_MS = 5000;

interface Props {
  sponsors: SponsorLite[] | null;
  onClose: () => void;
}

export function SponsorShowcaseOverlay({ sponsors, onClose }: Props) {
  useEffect(() => {
    if (!sponsors) return;
    const t = setTimeout(onClose, TOTAL_DURATION_MS);
    return () => clearTimeout(t);
  }, [sponsors, onClose]);

  return (
    <AnimatePresence>
      {sponsors && sponsors.length > 0 && (
        <motion.div
          key={sponsors.map((s) => s.id).join("-")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 cursor-pointer overflow-hidden"
          onClick={onClose}
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, oklch(0.22 0.04 255) 0%, oklch(0.10 0.03 255) 70%)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 cc-stripes pointer-events-none"
          />

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            className="absolute top-0 left-0 right-0 h-[3px] origin-left"
            style={{ background: "var(--color-yellow)" }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            className="absolute bottom-0 left-0 right-0 h-[3px] origin-right"
            style={{ background: "var(--color-yellow)" }}
          />

          <div className="relative h-full flex flex-col items-center justify-center max-w-[1600px] mx-auto px-6 md:px-12 py-8 md:py-12 text-center">
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="cc-mono uppercase mb-6 md:mb-10"
              style={{
                color: "var(--color-yellow)",
                letterSpacing: "0.4em",
                fontSize: "clamp(12px, 1.2vw, 18px)",
              }}
            >
              ★ Partner ★
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="cc-display text-paper mb-10 md:mb-16"
              style={{
                fontSize: "clamp(36px, 5vw, 88px)",
                lineHeight: 0.95,
                letterSpacing: "0.005em",
              }}
            >
              Questo torneo è offerto da
            </motion.div>

            <div
              className={`grid gap-8 md:gap-14 items-center justify-center w-full ${
                sponsors.length === 1
                  ? "grid-cols-1"
                  : sponsors.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              }`}
              style={{ maxWidth: "min(1280px, 92%)", margin: "0 auto" }}
            >
              {sponsors.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ y: 30, opacity: 0, scale: 0.92 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.6 + i * 0.12,
                    type: "spring",
                    stiffness: 90,
                    damping: 14,
                  }}
                  className="flex flex-col items-center gap-4 md:gap-6"
                >
                  {s.logoUrl && (
                    <div
                      className="rounded-md bg-paper p-4 md:p-6 flex items-center justify-center"
                      style={{
                        width: "clamp(140px, 18vw, 260px)",
                        height: "clamp(140px, 18vw, 260px)",
                        boxShadow:
                          "0 0 0 4px rgba(236, 210, 74, 0.7), 0 18px 48px rgba(0,0,0,0.4)",
                      }}
                    >
                      <Image
                        src={s.logoUrl}
                        alt={s.nome}
                        width={260}
                        height={260}
                        className="object-contain"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                        }}
                      />
                    </div>
                  )}
                  <div
                    className="cc-display text-paper"
                    style={{
                      fontSize: "clamp(22px, 2.6vw, 44px)",
                      lineHeight: 1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.nome}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-6 left-0 right-0 text-eyebrow text-paper/40 text-center"
            >
              tocca per chiudere · auto · {TOTAL_DURATION_MS / 1000}s
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
