import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function useMotionSafe() {
  const prefersReduced = useReducedMotion();
  return !prefersReduced;
}

export function FadeIn({ children, className = '', delay = 0, y = 14 }) {
  const animate = useMotionSafe();
  if (!animate) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({ children, className = '' }) {
  const animate = useMotionSafe();
  if (!animate) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

export function ZoomHover({ children, className = '', scale = 1.08 }) {
  const animate = useMotionSafe();
  const classes = `inline-flex origin-center ${className}`.trim();
  if (!animate) {
    return <span className={classes}>{children}</span>;
  }
  return (
    <motion.span
      className={classes}
      whileHover={{ scale }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      {children}
    </motion.span>
  );
}

/** Whole-title float + orange on cursor — safe for equal card heights (unlike per-letter paint). */
export function TitleFloat({ children, className = '', as: Tag = 'h5' }) {
  const animate = useMotionSafe();
  const [lit, setLit] = useState(false);

  if (!animate) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <motion.div
      className="w-full"
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      animate={lit ? { y: -4, scale: 1.02 } : { y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      <Tag
        className={className}
        style={{
          color: lit ? '#FF7A1A' : '#0f172a',
          transition: 'color 160ms ease',
          animation: 'hero-letter-bubble 2.8s ease-in-out infinite',
        }}
      >
        {children}
      </Tag>
    </motion.div>
  );
}

export function CursorPaintText({
  text,
  baseColor = '#0f172a',
  paintColor = '#FF7A1A',
  className = '',
  as: Tag = 'span',
  radius = 42,
}) {
  const ref = useRef(null);
  const letterRefs = useRef([]);
  const animate = useMotionSafe();
  const [activeIndexes, setActiveIndexes] = useState(() => new Set());
  const chars = Array.from(text || '');

  const onMove = (event) => {
    if (!animate || !ref.current) return;
    const next = new Set();
    letterRefs.current.forEach((node, index) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      if ((dx * dx) + (dy * dy) <= radius * radius) next.add(index);
    });
    setActiveIndexes(next);
  };

  return (
    <Tag
      ref={ref}
      className={`relative block w-fit max-w-full cursor-default select-none ${className}`}
      onMouseMove={onMove}
      onMouseLeave={() => setActiveIndexes(new Set())}
      aria-label={text}
    >
      {chars.map((char, index) => {
        const lit = animate && activeIndexes.has(index);
        const delay = `${index * 40}ms`;
        return (
          <span
            key={`${char}-${index}`}
            ref={(node) => { letterRefs.current[index] = node; }}
            aria-hidden="true"
            className="inline-block origin-bottom will-change-transform"
            style={{
              color: lit ? paintColor : baseColor,
              transform: lit
                ? 'translateY(-10px) scale(1.22)'
                : 'translateY(0) scale(1)',
              transition: `color 160ms ease, transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}`,
              animation: animate
                ? `hero-letter-bubble 2.8s ease-in-out ${index * 0.12}s infinite`
                : 'none',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </Tag>
  );
}

export function PageTransition({ children }) {
  const animate = useMotionSafe();
  if (!animate) return children;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, className = '', durationMs = 2500 }) {
  const animate = useMotionSafe();
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setDisplay(target);
      return undefined;
    }

    setDisplay(0);
    if (target <= 0) return undefined;

    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 2;
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, animate, durationMs]);

  return <span className={className}>{display}</span>;
}
