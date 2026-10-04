import { Link } from 'react-router-dom';

import { DentalRecord } from '../types';
import { dentalRecordPath } from '../utils/dentalRecordPath';

/** A record's title as the way into the record. */
export function RecordTitleLink({
  record,
  className = 'text-sm font-semibold text-gray-900',
}: {
  record: DentalRecord;
  className?: string;
}) {
  return (
    <Link
      to={dentalRecordPath(record.id)}
      className={`${className} hover:text-primary-800 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-sm`}
    >
      {record.title}
    </Link>
  );
}
