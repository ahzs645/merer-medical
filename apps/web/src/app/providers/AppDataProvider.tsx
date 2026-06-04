import { PropsWithChildren } from 'react';
import { DataClientProvider } from '@mere/data/hooks';
import { getDataClient } from '../../repositories/dexie-bridge';

export function AppDataProvider({ children }: PropsWithChildren) {
  return (
    <DataClientProvider client={getDataClient()}>{children}</DataClientProvider>
  );
}
