import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { SHOWCASE } from '../../../data/templateMedia';
import { PhoneFrame, Screen } from '../../../components/site/DeviceFrames';
import { EASE } from '../../../components/site/motion';
import { DashboardScreen } from '../../../components/site/mockups/CommerceMocks';
import { Container } from '../../../components/site/ui';

// Three phones fanned out: two storefronts either side of the merchant dashboard
const PhoneFan = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const sideY = useTransform(scrollYProgress, [0, 1], [80, -40]);
  const centerY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  const enter = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 60 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 1.3, ease: EASE, delay },
        };

  return (
    <Container>
      <div
        ref={ref}
        className="relative mx-auto flex max-w-[1320px] items-end justify-center overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#f5f5f7_0%,#e8eaf0_100%)] px-6 pt-16 md:rounded-[40px] md:pt-24"
      >
        <motion.div {...enter(0.35)} style={reduce ? undefined : { y: sideY }} className="relative z-0 -mr-[4%] w-[28%] max-w-[320px]">
          <div className="translate-y-[8%] -rotate-[8deg]">
            <PhoneFrame>
              <Screen src={SHOWCASE.beauty.mobile} alt={`${SHOWCASE.beauty.storeName} on a phone`} eager />
            </PhoneFrame>
          </div>
        </motion.div>
        <motion.div {...enter(0.2)} style={reduce ? undefined : { y: centerY }} className="relative z-10 w-[33%] max-w-[370px]">
          <div className="translate-y-[6%]">
            <PhoneFrame>
              <DashboardScreen />
            </PhoneFrame>
          </div>
        </motion.div>
        <motion.div {...enter(0.45)} style={reduce ? undefined : { y: sideY }} className="relative z-0 -ml-[4%] w-[28%] max-w-[320px]">
          <div className="translate-y-[8%] rotate-[8deg]">
            <PhoneFrame>
              <Screen src={SHOWCASE.tech.mobile} alt={`${SHOWCASE.tech.storeName} on a phone`} eager />
            </PhoneFrame>
          </div>
        </motion.div>
      </div>
    </Container>
  );
};

export default PhoneFan;
