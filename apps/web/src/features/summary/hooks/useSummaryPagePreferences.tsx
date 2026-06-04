import { useEffect, useState } from 'react';
import { RxDocument } from 'rxdb';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import {
  SummaryPagePreferences,
  SummaryPagePreferencesCard,
} from '../../../models/summary-page-preferences/SummaryPagePreferences.type';
import { Subscription } from 'rxjs';
import {
  getDataClient,
  isDexieReposEnabled,
  wrapAsRxDocument,
} from '../../../repositories/dexie-bridge';
import type { SummaryPagePreferences as DomainSummaryPagePreferences } from '@mere/domain';

function cardsToDomain(cards: SummaryPagePreferencesCard[] | undefined) {
  return cards?.map((card) => ({
    id: card.type,
    visible: card.is_visible,
    order: card.order,
  }));
}

function cardsToLegacy(
  cards: DomainSummaryPagePreferences['cards'] | undefined,
): SummaryPagePreferencesCard[] | undefined {
  return cards?.map((card) => ({
    type: card.id as SummaryPagePreferencesCard['type'],
    is_visible: card.visible,
    order: card.order,
  }));
}

function summaryPreferencesToLegacy(
  prefs: DomainSummaryPagePreferences,
): SummaryPagePreferences {
  return {
    id: prefs.id,
    user_id: prefs.userId,
    pinned_labs: prefs.pinnedLabs,
    cards: cardsToLegacy(prefs.cards),
  };
}

function summaryPreferencesPatchToDomain(
  patch: Partial<SummaryPagePreferences>,
): Partial<Omit<DomainSummaryPagePreferences, 'id' | 'userId' | 'createdAt'>> {
  return {
    ...(patch.pinned_labs !== undefined
      ? { pinnedLabs: patch.pinned_labs }
      : {}),
    ...(patch.cards !== undefined ? { cards: cardsToDomain(patch.cards) } : {}),
  };
}

async function getDexieSummaryPagePreferences(
  userId: string,
): Promise<RxDocument<SummaryPagePreferences> | undefined> {
  const client = getDataClient();
  const prefs = await client.summaryPagePreferences.getForUser(userId);
  if (!prefs) return undefined;

  const legacy = summaryPreferencesToLegacy(prefs);
  const handle = wrapAsRxDocument<SummaryPagePreferences>(legacy, {
    async update(patch) {
      const next = await client.summaryPagePreferences.upsert(
        userId,
        summaryPreferencesPatchToDomain(patch),
      );
      return summaryPreferencesToLegacy(next);
    },
    async remove() {
      await client.summaryPagePreferences.upsert(userId, {
        pinnedLabs: [],
        cards: [],
      });
    },
  });
  return handle as unknown as RxDocument<SummaryPagePreferences>;
}

export function useSummaryPagePreferences(userId: string) {
  const db = useRxDb(),
    [preferences, setPreferences] =
      useState<RxDocument<SummaryPagePreferences>>();

  useEffect(() => {
    let sub: Subscription | undefined;
    let didCancel = false;

    if (db && userId) {
      if (isDexieReposEnabled()) {
        void getDexieSummaryPagePreferences(userId).then((prefs) => {
          if (!didCancel) setPreferences(prefs);
        });
        return () => {
          didCancel = true;
        };
      }

      sub = db.summary_page_preferences
        .findOne({
          selector: {
            user_id: userId,
          },
        })
        .$.subscribe((list) => {
          setPreferences(list as unknown as RxDocument<SummaryPagePreferences>);
        });
    }

    return () => {
      didCancel = true;
      sub?.unsubscribe();
    };
  }, [db, userId]);

  return preferences;
}
