import { Routes as AppRoutes } from '../../../Routes';

/** Where a dental record is read in full. Record ids contain `|`. */
export function dentalRecordPath(recordId: string): string {
  return AppRoutes.DentalRecord.replace(
    ':recordId',
    encodeURIComponent(recordId),
  );
}
