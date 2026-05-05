import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false); // avoid re-registering listeners on visible state change

  /* ring — tight follow, minimal lag */
  const ringX = useSpring(mx, { stiffness: 480, damping: 28, mass: 0.3 });
  const ringY = useSpring(my, { stiffness: 480, damping: 28, mass: 0.3 });

  /* dot — snaps instantly */
  const dotX = useSpring(mx, { stiffness: 700, damping: 36 });
  const dotY = useSpring(my, { stiffness: 700, damping: 36 });

  useEffect(() => {
    /* pointermove is more reliable than mousemove — fires on click-drag too */
    const move = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }
    };

    /* use pointerover/pointerout for hover detection — avoids bubble noise of mouseover */
    const over = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a") ||
        target.closest("button") ||
        target.closest(".article-card") ||
        target.closest(".featured-card") ||
        target.closest("[data-cursor-hover]")
      ) {
        setHovered(true);
      }
    };
    const out = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a") ||
        target.closest("button") ||
        target.closest(".article-card") ||
        target.closest(".featured-card") ||
        target.closest("[data-cursor-hover]")
      ) {
        setHovered(false);
      }
    };

    /* hide cursor when pointer leaves the window */
    const leave = () => setVisible(false);
    const enter = () => { if (visibleRef.current) setVisible(true); };
    const down = () => setPressed(true);
    const up = () => setPressed(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerout", out, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    document.documentElement.addEventListener("pointerenter", enter);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerout", out);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.removeEventListener("pointerenter", enter);
    };
  }, [mx, my]); /* NOTE: no `visible` in deps — avoids listener churn on first move */

  /* don't render on touch devices */
  if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) return null;

  return (
    <>
      {/* Outer ring — trails, mix-blend inverts whatever it floats over */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: "difference",
        }}
        animate={{
          opacity: visible ? 1 : 0,
          width:  pressed ? 34 : hovered ? 48 : 22,
          height: pressed ? 34 : hovered ? 48 : 22,
          scale: pressed ? 0.92 : hovered ? 1.04 : 1,
        }}
        transition={{ opacity: { duration: 0.15 }, width: { duration: 0.18 }, height: { duration: 0.18 }, scale: { duration: 0.14 } }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "1.5px solid #fff",
            boxShadow: hovered ? "0 0 22px var(--neon-dim)" : "none",
          }}
        />
      </motion.div>

      {/* Inner dot — snappy, neon colored */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--neon)",
        }}
        animate={{
          opacity: visible ? 1 : 0,
          scale: pressed ? 1.75 : hovered ? 1.25 : 1,
        }}
        transition={{ opacity: { duration: 0.15 }, scale: { duration: 0.12 } }}
      />
    </>
  );
}
