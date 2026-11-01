import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@rentify/utils';

// iOS-style curve used for every page push and slide on the wall
export const IOS_EASE = [0.32, 0.72, 0, 1];
export const SMOOTH = [0.65, 0, 0.35, 1];

// One switch pauses every panel at once
export const WallClock = createContext({ paused: false });

// Steps a panel through its own script and loops. Each panel owns its clock,
// so the three screens run independently of each other.
export const useTimeline = (script) => {
  const { paused } = useContext(WallClock);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % script.length), script[index][1]);
    return () => clearTimeout(timer);
  }, [index, paused, script]);

  const name = script[index][0];
  const position = (id) => script.findIndex(([step]) => step === id);
  return {
    step: name,
    index,
    is: (...ids) => ids.includes(name),
    from: (id) => index >= position(id),
  };
};

// Renders children at a fixed design width (a real phone or desktop width)
// and scales them to fill the panel, so every monitor shows the same layout.
// minHeight zooms out a short, wide panel until at least that much of the
// page is visible; the page then gets extra width, like a big monitor.
export const Viewport = ({ width, minHeight = 0, className, children }) => {
  const ref = useRef(null);
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      if (w <= 0) return;
      const scale = minHeight ? Math.min(w / width, h / minHeight) : w / width;
      setBox({ scale, width: w / scale, height: h / scale });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, minHeight]);

  return (
    <div ref={ref} className={cn('relative h-full w-full overflow-hidden', className)}>
      {box && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: box.width, height: box.height, transform: `scale(${box.scale})` }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Position of an element inside a scaled root, in design pixels
export const measure = (root, el) => {
  const r = root.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  const s = r.width / root.offsetWidth || 1;
  return { x: (e.left - r.left) / s, y: (e.top - r.top) / s, w: e.width / s, h: e.height / s };
};

// Content that glides to an anchor ([data-anchor]) as if someone scrolled
export const Scroller = ({ anchor, offset = 16, duration = 1.7, className, children }) => {
  const ref = useRef(null);
  const [y, setY] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = anchor && el.querySelector(`[data-anchor="${anchor}"]`);
    if (!target) {
      setY(0);
      return;
    }
    const top = measure(el, target).y;
    const room = Math.max(0, el.offsetHeight - (el.parentElement?.clientHeight || 0));
    setY(-Math.min(Math.max(0, top - offset), room));
  }, [anchor, offset]);

  return (
    <motion.div ref={ref} className={className} animate={{ y }} transition={{ duration, ease: SMOOTH }}>
      {children}
    </motion.div>
  );
};

// A desktop mouse pointer that glides to [data-cursor="target"] and follows it
// while the page scrolls underneath
// Changing clickKey plays one short press.
export const Cursor = ({ rootRef, target, clickKey }) => {
  const x = useSpring(600, { stiffness: 70, damping: 18, mass: 1 });
  const y = useSpring(260, { stiffness: 70, damping: 18, mass: 1 });
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!clickKey) return undefined;
    setPressing(true);
    const timer = setTimeout(() => setPressing(false), 380);
    return () => clearTimeout(timer);
  }, [clickKey]);

  useEffect(() => {
    let frame;
    const follow = () => {
      const root = rootRef.current;
      const el = target && root?.querySelector(`[data-cursor="${target}"]`);
      if (root && el) {
        const box = measure(root, el);
        x.set(box.x + box.w * 0.5);
        y.set(box.y + box.h * 0.55);
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [rootRef, target, x, y]);

  return (
    <motion.div aria-hidden className="pointer-events-none absolute left-0 top-0 z-[100]" style={{ x, y }}>
      <AnimatePresence>
        {pressing && (
          <motion.span
            key="press"
            className="absolute -left-5 -top-5 h-10 w-10 rounded-full bg-[#0071e3]/25"
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      <motion.svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        animate={{ scale: pressing ? 0.82 : 1 }}
        transition={{ duration: 0.18 }}
        className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
      >
        <path
          d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 21.8 L14.6 20.4 L11.7 14.2 L17.8 14.2 Z"
          fill="#1d1d1f"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
};

// An image that flies from one element to another: a product photo
// growing into its page, or dropping into the cart
export const Flight = ({ rootRef, from, to, src, run, duration = 0.8, fade = false, rounded = 16 }) => {
  const [path, setPath] = useState(null);

  useEffect(() => {
    if (!run) {
      setPath(null);
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      const a = root?.querySelector(`[data-flight="${from}"]`);
      const b = root?.querySelector(`[data-flight="${to}"]`);
      if (a && b) setPath({ a: measure(root, a), b: measure(root, b), key: Date.now() });
    });
    return () => cancelAnimationFrame(frame);
  }, [run, from, to, rootRef]);

  return (
    <AnimatePresence>
      {path && (
        <motion.img
          key={path.key}
          src={src}
          alt=""
          className="pointer-events-none absolute left-0 top-0 z-[90] object-cover shadow-[0_24px_50px_-18px_rgba(0,0,0,0.45)]"
          style={{ borderRadius: rounded }}
          initial={{ x: path.a.x, y: path.a.y, width: path.a.w, height: path.a.h, opacity: 1 }}
          animate={{
            x: path.b.x,
            y: path.b.y,
            width: path.b.w,
            height: path.b.h,
            opacity: fade ? [1, 1, 0] : 1,
          }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration, ease: IOS_EASE }}
        />
      )}
    </AnimatePresence>
  );
};

// Number that rolls to its new value
export const Rolling = ({ value, format = (v) => `$${v.toFixed(2)}`, className }) => {
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: SMOOTH });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
};

// Typewriter text for search boxes
export const Typed = ({ text, run, speed = 110 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!run) {
      setCount(0);
      return undefined;
    }
    const timer = setInterval(() => setCount((c) => (c < text.length ? c + 1 : c)), speed);
    return () => clearInterval(timer);
  }, [run, text, speed]);
  return (
    <span>
      {text.slice(0, count)}
      {run && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current" />}
    </span>
  );
};

// Seconds countdown for flash deals; real time, so it keeps ticking
export const useCountdown = (start = 18 * 3600 + 10 * 60 + 32) => {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : start)), 1000);
    return () => clearInterval(timer);
  }, [start]);
  return [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, '0'));
};

// Cycles an index on its own interval (hero carousels)
export const useCarousel = (length, interval = 3000, active = true) => {
  const { paused } = useContext(WallClock);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active || paused) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), interval);
    return () => clearInterval(timer);
  }, [length, interval, active, paused]);
  return index;
};

export const Stars = ({ value = 4.8, className }) => (
  <span className={cn('inline-flex items-center gap-1', className)}>
    <svg viewBox="0 0 20 20" className="h-[1em] w-[1em] fill-[#f5a623]" aria-hidden>
      <path d="M10 1.5l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L10 14.8 4.6 17.7l1.2-5.9L1.4 7.7l6-.7z" />
    </svg>
    {value.toFixed(1)}
  </span>
);
