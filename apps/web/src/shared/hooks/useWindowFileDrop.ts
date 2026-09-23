import { useEffect, useState } from 'react';

import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { offerPackageFile } from '../../features/sources/components/SharedPackagePanel';

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/** A visible file field takes a drop itself; the window leaves it alone. */
function isFileField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement && target.type === 'file';
}

/**
 * What a file dropped on the window does.
 *
 * A browser's answer is to navigate to it: drop a PDF anywhere outside a file
 * field and the app is replaced by the PDF, taking any half-filled form with
 * it. And the files people most want to drag in — `.emrpkg` packages — had no
 * visible field to drop on, only buttons that open a picker.
 *
 * So the window takes the drop. A package goes to the same review a shared
 * link gets (`offerPackageFile`), and nothing is imported until somebody says
 * so. Anything else is refused with a sentence saying where it can go, rather
 * than silently swallowed. Visible file fields keep their native drop.
 *
 * Returns whether a file is being dragged over the window, for the overlay
 * that says what dropping it will do.
 */
export function useWindowFileDrop(): boolean {
  const notify = useNotificationDispatch();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    // dragenter/dragleave fire for every child crossed; count them so the
    // overlay only goes when the drag has left the window.
    let depth = 0;

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event) || isFileField(event.target)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (event: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (!carriesFiles(event) || isFileField(event.target)) return;
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      if (/\.emrpkg$/i.test(file.name)) {
        offerPackageFile(file);
        return;
      }
      notify({
        type: 'set_notification',
        message: `${file.name} was not opened. Drop a .emrpkg package anywhere to review it, or add a document from Add record.`,
        variant: 'info',
      });
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [notify]);

  return dragging;
}
