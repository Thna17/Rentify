import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@rentify/utils';
import { EASE } from './motion';

// Question-and-answer list; one item open at a time
const Accordion = ({ items, className }) => {
  const [open, setOpen] = useState(0);

  return (
    <div className={cn('divide-y divide-black/10 border-y border-black/10', className)}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const id = `accordion-${index}`;

        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              aria-controls={id}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
            >
              <span className="text-[19px] font-semibold tracking-[-0.01em] text-[#1d1d1f] md:text-[21px]">
                {item.question}
              </span>
              <Plus
                className={cn(
                  'h-5 w-5 shrink-0 text-[#6e6e73] transition-transform duration-500',
                  isOpen && 'rotate-45'
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-7 text-[17px] leading-[1.5] text-[#6e6e73]">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
