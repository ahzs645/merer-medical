import { useContext, useEffect, useState } from 'react';
import { useLocalConfig } from './LocalConfigProvider';
import React from 'react';

// react context provider
export const DeveloperLogsContext = React.createContext<any[]>([]);

export const DeveloperLogsProvider = (props: any) => {
  const [logs, setLogs] = useState<any[]>([]);
  const localConfig = useLocalConfig();

  // `console-feed` (and the object inspector it brings) is loaded only when
  // developer mode is on. Imported at the top it sat in the first script every
  // visitor downloads, to capture logs almost nobody has switched on.
  useEffect(() => {
    if (!localConfig.developer_mode_enabled) return;

    let cancelled = false;
    let unhook: (() => void) | undefined;
    import('console-feed').then(({ Hook, Unhook }) => {
      if (cancelled) return;
      const hookedConsole = Hook(
        window.console,
        (log) => setLogs((currLogs: any[]) => [...currLogs, log]),
        false,
        200,
      );
      unhook = () => Unhook(hookedConsole);
    });

    return () => {
      cancelled = true;
      unhook?.();
    };
  }, [localConfig.developer_mode_enabled]);
  return (
    <DeveloperLogsContext.Provider value={logs}>
      {props.children}
    </DeveloperLogsContext.Provider>
  );
};

export function useDeveloperLogs() {
  const logs = useContext(DeveloperLogsContext);
  return logs;
}
