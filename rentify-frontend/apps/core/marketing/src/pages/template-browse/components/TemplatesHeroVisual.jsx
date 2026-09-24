import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { SHOWCASE } from '../../../data/templateMedia';
import { BrowserFrame, PhoneFrame, Screen } from '../../../components/site/DeviceFrames';
import { EASE } from '../../../components/site/motion';
import { Container } from '../../../components/site/ui';

// Two storefronts drift apart as the page scrolls, with a phone in front
const TemplatesHeroVisual = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const backX = useTransform(scrollYProgress, [0, 1], ['4%', '-4%']);
  const frontX = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);
  const phoneY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const style = (value) => (reduce ? undefined : value);

  return (
    <Container className="mt-16 md:mt-24">
      <motion.div
        ref={ref}
        initial={reduce ? false : { opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
        className="relative mx-auto aspect-[16/9.5] max-w-[1320px]"
      >
        <motion.div style={style({ x: backX })} className="absolute left-0 top-0 w-[68%]">
          <BrowserFrame url={SHOWCASE.tech.domain}>
            <Screen src={SHOWCASE.tech.desktop} alt={`${SHOWCASE.tech.storeName} storefront`} eager className="h-auto" />
          </BrowserFrame>
        </motion.div>
        <motion.div style={style({ x: frontX })} className="absolute bottom-[4%] right-0 w-[68%]">
          <BrowserFrame url={SHOWCASE.beauty.domain}>
            <Screen src={SHOWCASE.beauty.desktop} alt={`${SHOWCASE.beauty.storeName} storefront`} eager className="h-auto" />
          </BrowserFrame>
        </motion.div>
        <motion.div style={style({ y: phoneY })} className="absolute bottom-0 left-[10%] w-[17%]">
          <PhoneFrame>
            <Screen src={SHOWCASE.tech.mobile} alt={`${SHOWCASE.tech.storeName} on a phone`} eager />
          </PhoneFrame>
        </motion.div>
      </motion.div>
    </Container>
  );
};

export default TemplatesHeroVisual;
