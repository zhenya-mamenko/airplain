import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export default function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = setInterval(update, 60000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return now;
}
