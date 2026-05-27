import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ImagingItem } from '../types';
import {
  IMAGING_RESOURCE_TYPES,
  isImagingDocument,
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

      setItems(
        docs
          .map((doc) => doc.toMutableJSON())
          .filter(isImagingDocument)
          .map(mapImagingDocument),
      );
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
      optometry: items.filter((item) => item.categories.includes('optometry'))
        .length,
      scans: items.filter((item) => item.categories.includes('scan')).length,
      xray: items.filter((item) => item.categories.includes('xray')).length,
      reports: items.filter((item) => item.categories.includes('report'))
        .length,
      attachments: items.filter((item) =>
        item.categories.includes('attachment'),
      ).length,
    }),
    [items],
  );

  return { items, counts, status };
}
