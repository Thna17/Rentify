import React, { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';

// Shared easing for every entrance on the marketing site
export const EASE = [0.22, 1, 0.36, 1];

// Fades and lifts its children into place the first time they scroll into view
export const Reveal = ({
  as = 'div',
  delay = 0,
  y = 32,
  duration = 1,
  amount = 0.25,
  className,
  children,
  ...props
}) => {
  const reduce = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: EASE, delay }}
      {...props}
    >
      {children}
    </Component>
  );
};

const staggerContainer = (stagger, delay) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

// Reveals StaggerItem children one after another
export const Stagger = ({
  as = 'div',
  stagger = 0.08,
  delay = 0,
  amount = 0.2,
  className,
  children,
}) => {
  const reduce = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </Component>
  );
};

export const StaggerItem = ({ as = 'div', className, children, ...props }) => {
  const Component = motion[as];

  return (
    <Component className={className} variants={staggerItem} {...props}>
      {children}
    </Component>
  );
};

// Scales content up as it travels toward the middle of the viewport
export const ScrollScale = ({ from = 0.86, to = 1, className, children }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [from, to]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.4, 1]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduce ? undefined : { scale, opacity }}
    >
      {children}
    </motion.div>
  );
};

// Moves content at a different speed from the page for a sense of depth
export const Parallax = ({ offset = 80, className, children }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduce ? undefined : { y }}
    >
      {children}
    </motion.div>
  );
};

const Word = ({ progress, range, children }) => {
  const opacity = useTransform(progress, range, [0.15, 1]);

  return (
    <motion.span style={{ opacity }} className="inline">
      {children}
    </motion.span>
  );
};

// Lights up a statement word by word as the reader scrolls through it
export const WordReveal = ({ text, className }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.45'],
  });
  const words = text.split(' ');

  if (reduce) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      {words.map((word, index) => (
        <Word
          key={`${word}-${index}`}
          progress={scrollYProgress}
          range={[index / words.length, (index + 1) / words.length]}
        >
          {word}
          {index < words.length - 1 && ' '}
        </Word>
      ))}
    </p>
  );
};
