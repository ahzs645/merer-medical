import React from 'react';
import { TutorialAction, TutorialState } from '../TutorialOverlay';
import { TutorialContentScreen } from './TutorialContentScreen';
import logo from '../../../assets/img/white-logo.svg';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function TutorialWelcomeScreen({
  dispatch,
  state,
}: {
  dispatch: React.Dispatch<TutorialAction>;
  state: TutorialState;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <TutorialContentScreen dispatch={dispatch} hideBackButton={true}>
      <h1 className="mb-2 text-center text-xl font-semibold">
        {t('Welcome to Mere!')}
      </h1>
      <p className="text-center">
        {t("Let's start organizing your medical records.")}
      </p>
      <img
        className="mx-auto mt-12 h-12 w-12 self-center md:h-24 md:w-24"
        src={logo}
        alt={t('Logo')}
      ></img>
    </TutorialContentScreen>
  );
}
