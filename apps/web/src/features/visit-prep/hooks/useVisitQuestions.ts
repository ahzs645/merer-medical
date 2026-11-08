import { useEffect, useMemo, useState } from 'react';

import { useUser } from '../../../app/providers/UserProvider';

export function useVisitQuestions() {
  const user = useUser();
  const [visitPurpose, setVisitPurpose] = useState('');
  const [questions, setQuestions] = useState('');
  const [questionsSavedAt, setQuestionsSavedAt] = useState('');
  const [questionsSaveStatus, setQuestionsSaveStatus] = useState<
    'idle' | 'saved' | 'error'
  >('idle');
  const questionsStorageKey = useMemo(
    () => `mere:visit-prep:questions:${user.id}`,
    [user.id],
  );

  useEffect(() => {
    const stored = loadSavedQuestions(questionsStorageKey);
    setVisitPurpose(stored.visitPurpose);
    setQuestions(stored.questions);
    setQuestionsSavedAt(stored.savedAt);
    setQuestionsSaveStatus(stored.savedAt ? 'saved' : 'idle');
  }, [questionsStorageKey]);

  function saveQuestions() {
    const savedAt = new Date().toISOString();
    try {
      localStorage.setItem(
        questionsStorageKey,
        JSON.stringify({ visitPurpose, questions, savedAt }),
      );
      setQuestionsSavedAt(savedAt);
      setQuestionsSaveStatus('saved');
    } catch (error) {
      console.error(error);
      setQuestionsSaveStatus('error');
    }
  }

  function updateQuestions(value: string) {
    setQuestions(value);
    setQuestionsSaveStatus('idle');
  }

  function updateVisitPurpose(value: string) {
    setVisitPurpose(value);
    setQuestionsSaveStatus('idle');
  }

  return {
    visitPurpose,
    updateVisitPurpose,
    questions,
    questionsSavedAt,
    questionsSaveStatus,
    saveQuestions,
    updateQuestions,
  };
}

function loadSavedQuestions(storageKey: string) {
  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return { visitPurpose: '', questions: '', savedAt: '' };

    const parsed = JSON.parse(rawValue) as {
      visitPurpose?: unknown;
      questions?: unknown;
      savedAt?: unknown;
    };
    return {
      visitPurpose:
        typeof parsed.visitPurpose === 'string' ? parsed.visitPurpose : '',
      questions: typeof parsed.questions === 'string' ? parsed.questions : '',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return { visitPurpose: '', questions: '', savedAt: '' };
  }
}
