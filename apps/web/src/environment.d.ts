/* eslint-disable no-var */
/// <reference types="vite/client" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      ONPATIENT_CLIENT_ID: string;
      PUBLIC_URL: string;
      TEST_VAR: string;
    }
  }
  var MERE_APP_VERSION: string;
  var IS_DEMO: string;
  var MERE_STORAGE_BACKEND: 'rxdb' | 'dexie' | string;
}

export {};
