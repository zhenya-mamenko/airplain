import { SafeAreaProvider } from 'react-native-safe-area-context';
import AddFlight from '@/components/AddFlight';


export default function Add() {
  return (
    <SafeAreaProvider>
      <AddFlight />
    </SafeAreaProvider>
  );
}
