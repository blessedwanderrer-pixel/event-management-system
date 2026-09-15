import { useEffect, useRef, useState } from 'react';
import { Typography, Card } from '@material-tailwind/react';
import { motion, useInView } from 'motion/react';
import { CountUp, ZoomHover, useMotionSafe } from '../Motion';

export default function StatsCard({ count, title, animateCount = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const animate = useMotionSafe();
  const numeric = animateCount && count !== '—' && Number.isFinite(Number(count));
  const [ready, setReady] = useState(!animate);

  useEffect(() => {
    if (!animate || inView) setReady(true);
  }, [animate, inView]);

  return (
    <div ref={ref} className="w-full">
      <ZoomHover scale={1.08} className="w-full">
        <Card color="transparent" shadow={false} className="w-full">
          <motion.div
            initial={animate ? { opacity: 0, scale: 0.85 } : false}
            animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          >
            <Typography variant="h1" className="font-bold" color="blue-gray">
              {numeric && ready ? <CountUp value={Number(count)} durationMs={2500} /> : count}
            </Typography>
            <Typography variant="h6" color="blue-gray" className="mt-1 font-medium">
              {title}
            </Typography>
          </motion.div>
        </Card>
      </ZoomHover>
    </div>
  );
}
