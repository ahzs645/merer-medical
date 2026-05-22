import { BundleEntry, Encounter } from 'fhir/r2';
import { formatTime } from '../../../../shared/utils/dateFormatters';
import {
  BundleEntry as R4BundleEntry,
  Encounter as R4Encounter,
} from 'fhir/r4';
import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { TimelineCardTitle } from '../TimelineCardTitle';
import { memo, useState } from 'react';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { CardBase } from '../../../connections/components/CardBase';
import { SkeletonLoadingText } from '../skeletons/SkeletonLoadingText';
import { TimelineCardCategoryTitle } from '../TimelineCardCategoryTitle';
import { TimelineCardSubtitile } from '../TimelineCardSubtitile';
import {
  getEncounterClass,
  getEncounterLocation,
} from '../../../../shared/utils/fhirAccessHelpers';
import { OpenableCardIcon } from '../OpenableCardIcon';
import { ShowEncounterDetailsExpandable } from '../expandables/ShowEncounterDetailsExpandable';
import { ManualRecordActions } from '../../../manual-entry/ManualRecordActions';
import { getManualRecordNote } from '../../../../shared/utils/manualRecordUtils';

export const EncounterCard = memo(function EncounterCard({
  item,
}: {
  item: ClinicalDocument<BundleEntry<Encounter> | R4BundleEntry<R4Encounter>>;
}) {
  const conn = useConnectionDoc(item.connection_record_id);
  const [expanded, setExpanded] = useState(false);
  const manualNote = getManualRecordNote(item);

  return (
    <>
      <CardBase
        isFocusable
        onClick={() => {
          setExpanded((x) => !x);
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="items-top flex justify-between">
            <TimelineCardCategoryTitle title="Encounter" color="text-red-500" />
            <OpenableCardIcon />
          </div>
          <TimelineCardTitle>
            {
              <>
                <p className="capitalize">{`${getEncounterClass(item)} - `}</p>
                <p>{`${getEncounterLocation(item)}`}</p>
              </>
            }
          </TimelineCardTitle>
          <TimelineCardSubtitile variant="dark">
            {formatTime(item.metadata?.date)}
          </TimelineCardSubtitile>
          {conn?.get('name') ? (
            <TimelineCardSubtitile variant="light">
              {conn?.get('name')}
            </TimelineCardSubtitile>
          ) : (
            <SkeletonLoadingText />
          )}
          {manualNote && (
            <p className="mt-2 whitespace-pre-line rounded-md bg-slate-50 p-2 text-xs font-medium text-gray-700 md:text-sm">
              {manualNote}
            </p>
          )}
          <ManualRecordActions item={item as ClinicalDocument} />
        </div>
      </CardBase>
      <ShowEncounterDetailsExpandable
        item={item}
        expanded={expanded}
        setExpanded={setExpanded}
      />
    </>
  );
});
