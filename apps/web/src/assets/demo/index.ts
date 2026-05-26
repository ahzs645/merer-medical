import base from './base.json';
import clinicalDocumentsMeta from './collections/clinical_documents.meta.json';
import clinicalDocuments0f38582a from './collections/clinical_documents.0f38582a-1773-4e2b-80e3-90fda727cdbd.json';
import clinicalDocuments3993ce6f from './collections/clinical_documents.3993ce6f-d2d6-4526-840d-4753b7207c88.json';
import clinicalDocuments9a00c884 from './collections/clinical_documents.9a00c884-153c-4cc9-aedd-1ef3dd8b6610.json';
import clinicalDocumentsA25cd905 from './collections/clinical_documents.a25cd905-d981-496b-ab08-ff1fd78b3ca8.json';
import clinicalDocumentsDentalDemo from './collections/clinical_documents.dental-demo-connection.json';
import clinicalDocumentsE3936774 from './collections/clinical_documents.e3936774-a661-4be0-8172-912ef5f758b7.json';
import clinicalDocumentsOptometryDemo from './collections/clinical_documents.optometry-demo-connection.json';
import connectionDocuments from './collections/connection_documents.json';
import summaryPagePreferences from './collections/summary_page_preferences.json';
import userDocuments from './collections/user_documents.json';
import userPreferences from './collections/user_preferences.json';

const clinicalDocuments = {
  ...clinicalDocumentsMeta,
  docs: [
    ...clinicalDocuments0f38582a,
    ...clinicalDocuments3993ce6f,
    ...clinicalDocuments9a00c884,
    ...clinicalDocumentsA25cd905,
    ...clinicalDocumentsDentalDemo,
    ...clinicalDocumentsE3936774,
    ...clinicalDocumentsOptometryDemo,
  ],
};

const demoDump = {
  ...base,
  collections: [
    summaryPagePreferences,
    clinicalDocuments,
    connectionDocuments,
    userDocuments,
    userPreferences,
  ],
};

export default demoDump;
