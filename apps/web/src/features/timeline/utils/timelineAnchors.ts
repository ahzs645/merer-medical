export function getTimelineRecordElementId(recordId: string): string {
  return `timeline-record-${encodeURIComponent(recordId)}`;
}
