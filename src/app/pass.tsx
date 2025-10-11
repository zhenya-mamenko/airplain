import { useLocalSearchParams } from 'expo-router';
import BoardingPass from '@/components/BoardingPass';
import type { PKPassData } from '@/types';

const BoardingPassViewer = () => {
  const { pkpass } = useLocalSearchParams<{ pkpass: string }>();
  const pkpassData = JSON.parse(pkpass) as PKPassData;

  return <BoardingPass pkpass={pkpassData} />;
};

export default BoardingPassViewer;
