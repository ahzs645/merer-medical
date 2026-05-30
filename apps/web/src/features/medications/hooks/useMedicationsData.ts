import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { normalizeMedicationDocuments } from '..';
import {
  MedicationViewItem,
  sourceLabel,
  toMedicationViewItem,
} from '../medicationViewModel';

export const MEDICATION_RESOURCE_TYPES = [
  'medicationstatement',
  'medicationrequest',
  'medicationorder',
  'medicationdispense',
  'medicationadministration',
];

export function useMedicationsData({
  query,
  selectedFilter,
}: {
  query: string;
  selectedFilter: MedicationViewItem['group'] | 'all';
}) {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<MedicationViewItem[]>([]);
  const [allergies, setAllergies] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchMedications() {
      setStatus('loading');
      const [docs, allergyDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': { $in: MEDICATION_RESOURCE_TYPES },
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'allergyintolerance',
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
      ]);

      if (!isMounted) return;
      setItems(
        normalizeMedicationDocuments(
          docs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
        ).map(toMedicationViewItem),
      );
      setAllergies(
        allergyDocs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
      );
      setStatus('success');
    }

    fetchMedications();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        selectedFilter === 'all' || item.group === selectedFilter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return [
        item.name,
        item.status,
        item.conditionReason,
        sourceLabel(item.source),
        item.category,
        item.adherence,
        item.conditionalInstructions,
        item.rxNorm?.code,
        item.rxNorm?.display,
        item.reconciliationState,
        ...item.nutritionFacts.map((fact) => `${fact.label} ${fact.value}`),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [items, query, selectedFilter]);

  const supplementItems = useMemo(
    () => filteredItems.filter((item) => item.group === 'supplements'),
    [filteredItems],
  );

  return {
    allergies,
    filteredItems,
    items,
    status,
    supplementItems,
  };
}
