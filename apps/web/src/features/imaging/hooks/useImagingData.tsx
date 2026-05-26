import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ImagingItem } from '../types';
import {
  IMAGING_RESOURCE_TYPES,
  mapImagingDocument,
} from '../utils/imagingRecords';

export function useImagingData() {
  const db = useRxDb(),
    user = useUser(),
    [items, setItems] = useState<ImagingItem[]>([]),
    [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchImaging() {
      setStatus('loading');

      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': { $in: IMAGING_RESOURCE_TYPES },
          },
          sort: [{ 'metadata.date': 'desc' }],
        })
        .exec();

      if (!isMounted) return;

      setItems(docs.map((doc) => mapImagingDocument(doc.toMutableJSON())));
      setStatus('success');
    }

    fetchImaging();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const counts = useMemo(
    () => ({
      total: items.length,
      dental: items.filter((item) => item.categories.includes('dental')).length,
      scans: items.filter((item) => item.categories.includes('scan')).length,
      xray: items.filter((item) => item.categories.includes('xray')).length,
    }),
    [items],
  );

  return { items, counts, status };
}
