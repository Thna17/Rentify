import { useState } from 'react';
import { useScrollPosition } from '@n8tb1t/use-scroll-position';

export const useScrollBehavior = () => {
  const [visible, setVisible] = useState(true);

  useScrollPosition(
    ({ prevPos, currPos }) => {
      const nearTop = currPos.y > -300; // close to top (y is negative when scrolled down)

      if (nearTop) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    },
    [visible],
    undefined,
    false,
    100
  ); // last param is throttle wait ms

  return { visible };
};
