import { router } from 'expo-router';
import { useEffect } from 'react';

const Index = () => {
  useEffect(() => {
    router.replace('/flights' as any);
  }, []);

  return null;
};

export default Index;
