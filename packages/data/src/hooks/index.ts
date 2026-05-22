import { createContext, createElement, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppDataClient, Observable } from '../AppDataClient';

const DataClientContext = createContext<AppDataClient | null>(null);

export interface DataClientProviderProps {
  client: AppDataClient;
  children: ReactNode;
}

export function DataClientProvider({ client, children }: DataClientProviderProps) {
  return createElement(DataClientContext.Provider, { value: client }, children);
}

export function useDataClient(): AppDataClient {
  const c = useContext(DataClientContext);
  if (!c) {
    throw new Error(
      'useDataClient: no DataClientProvider in tree. Wrap your app in <DataClientProvider client={...}>.',
    );
  }
  return c;
}

export function useObservable<T>(source: Observable<T>): T {
  const [value, setValue] = useState<T>(() => source.get());
  useEffect(() => source.subscribe(setValue), [source]);
  return value;
}

export function useSelectedUser() {
  const client = useDataClient();
  const [observable] = useState(() => client.users.observeSelected());
  return useObservable(observable);
}

export function useConnections(userId: string) {
  const client = useDataClient();
  const [observable, setObservable] = useState(() => client.connections.observe(userId));
  useEffect(() => {
    setObservable(client.connections.observe(userId));
  }, [client, userId]);
  return useObservable(observable);
}
