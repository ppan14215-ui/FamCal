/** Minutes since midnight, ticking twice a minute in the real app (the test link keeps its fixed time). */
import { useEffect, useState } from 'react';
import { LIVE } from './live';
import { NOW, minutes } from './dates';

const read = () => (LIVE ? new Date().getHours() * 60 + new Date().getMinutes() : minutes(NOW));

export function useNowMin(): number {
  const [m, setM] = useState(read);
  useEffect(() => {
    if (!LIVE) return;
    const t = setInterval(() => setM(read()), 30000);
    return () => clearInterval(t);
  }, []);
  return m;
}
