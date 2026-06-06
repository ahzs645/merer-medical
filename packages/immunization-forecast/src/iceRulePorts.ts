import {
  IceImplementedRulePort,
  IceRule,
  IceRuleFile,
  IceRulePortCoverage,
  IceRulePortCoverageSummary,
} from './types.js';

export const IMPLEMENTED_ICE_RULE_PORTS: IceImplementedRulePort[] = [
  {
    ruleName:
      'HPV: Evaluate CVX 118 administered to male patient as Accepted with reason VACCINE_NOT_LICENSED_FOR_MALES; Ignore shot for completion of the Series',
    behavior: 'HPV male CVX 118 is accepted but does not count for completion.',
    testId: 'assertHpvMaleCvx118Accepted',
  },
  {
    ruleName:
      'Evaluate HPV Shot as Accepted / ABOVE_REC_AGE_SERIES if Patient >= 46 yrs and Series is Not Complete',
    behavior:
      'HPV shots at age 46 or later are accepted but do not count for completion.',
    testId: 'assertHpvAge46AcceptedAndNotRecommended',
  },
  {
    ruleName:
      'HPV: Mark current Target Dose 2 as Invalid in 2-Dose Series if Interval from most recent Invalid Dose 2 < 12w-4 days',
    behavior:
      'HPV 2-dose dose 2 retries after an invalid dose 2 require 12w-4d.',
    testId: 'assertHpv2DoseInvalidDose2RepeatInterval',
  },
  {
    ruleName:
      'HPV: Set minimum and recommended interval to 12w from most recent invalid Dose 2 for HPV 2-Dose Series',
    behavior:
      'HPV 2-dose forecast earliest and recommended dates are 12w after the most recent invalid dose 2.',
    testId: 'assertHpv2DoseInvalidDose2Forecast',
  },
  {
    ruleName:
      'HPV: Evaluate the Absolute Minimum Interval in 2-Dose Series for Dose 2 - mark as Valid if Interval >= 5m-4 days from Dose 1',
    behavior:
      'HPV 2-dose dose 2 is valid when dose 1 interval is at least 5m-4d.',
    testId: 'assertHpv2DoseDose1IntervalEvaluation',
  },
  {
    ruleName:
      'HPV: Evaluate the Absolute Minimum Interval in 2-Dose Series for Dose 2 - mark as Invalid if Interval < 5m-4 days from Dose 1',
    behavior:
      'HPV 2-dose dose 2 is invalid when dose 1 interval is less than 5m-4d.',
    testId: 'assertHpv2DoseDose1IntervalEvaluation',
  },
  {
    ruleName:
      'HPV (Abstract): Intervals in 2-Dose Series for Dose 2 from Dose 1',
    behavior:
      'HPV 2-dose dose 2 evaluation and forecast intervals are calculated from dose 1 by the TypeScript interval hooks.',
    testId:
      'assertHpv2DoseDose1IntervalEvaluation/assertHpv2DoseDose1IntervalForecast',
  },
  {
    ruleName:
      'HPV: Set the intervals for dose 2 in the HPV 2-Dose Series from dose 1',
    behavior:
      'HPV 2-dose dose 2 forecast dates are calculated from dose 1 using the imported ICE interval constraints.',
    testId: 'assertHpv2DoseDose1IntervalForecast',
  },
  {
    ruleName:
      'HPV: If Patient >= 15 yrs and number of doses administered <= 1, modify HPV 3-Dose Series DoseRule 1 Latest Recommended Age to 15 yrs and Latest Recommended Interval to 16 weeks',
    behavior:
      'HPV 3-dose forecasts for patients 15 or older cap dose 1 overdue at age 15 and dose 2 overdue at dose 1 plus 16w.',
    testId: 'assertHpv3DoseAge15LatestRecommendedOverride',
  },
  {
    ruleName:
      'HPV: Evaluate the Absolute Minimum Interval in 3-Dose Series between Doses 1 and 3 for shots before 12/16/2016, mark as Valid if Interval >= 16w-4 days',
    behavior:
      'HPV 3-dose dose 3 before 2016-12-16 can satisfy dose 1 interval at 16w-4d.',
    testId: 'assertHpv3DosePre2016IntervalOverride',
  },
  {
    ruleName:
      'HPV: Evaluate the Absolute Minimum Interval in 3-Dose Series between Doses 1 and 3 - mark as Invalid if Interval < 16w-4 days for shots before 12/16/2016',
    behavior:
      'HPV 3-dose dose 3 before 2016-12-16 is invalid if dose 1 interval is below 16w-4d.',
    testId: 'assertHpv3DosePre2016IntervalOverride',
  },
  {
    ruleName:
      'HPV (Abstract): Absolute Minimum Interval in 3-Dose Series between Doses 1 and 3 for shots before 12/16/2016',
    behavior:
      'HPV 3-dose pre-2016 dose 1-to-3 absolute minimum interval behavior is implemented by the date-specific interval override hook.',
    testId: 'assertHpv3DosePre2016IntervalOverride',
  },
  {
    ruleName:
      'HPV: Evaluate the Absolute Minimum Interval in 3-Dose Series between Doses 1 and 3 for shots on or after 12/16/2016, mark as Valid if Interval >= 5m-4 days',
    behavior:
      'HPV 3-dose dose 3 on or after 2016-12-16 can satisfy dose 1 interval at 5m-4d.',
    testId: 'assertHpv3DosePre2016IntervalOverride',
  },
  {
    ruleName:
      'HPV: Evaluate the Absolute Minimum Interval in 3-Dose Series between Doses 1 and 3 - mark as Invalid if Interval < 5m-4 days for shots on or after 12/16/2016',
    behavior:
      'HPV 3-dose dose 3 on or after 2016-12-16 is invalid if dose 1 interval is below 5m-4d.',
    testId: 'assertHpv3DosePre2016IntervalOverride',
  },
  {
    ruleName:
      'HPV (Abstract): Absolute Minimum Interval in 3-Dose Series between Doses 1 and 3 for shots on or after 12/16/2016',
    behavior:
      'HPV 3-dose post-2016 dose 1-to-3 absolute minimum interval behavior is implemented by the date-specific interval override hook.',
    testId: 'assertHpv3DosePre2016IntervalOverride',
  },
  {
    ruleName:
      'HPV: Set the recommended interval of 6m between doses 1 & 3 for the HPV 3-Dose Series',
    behavior: 'HPV 3-dose dose 3 recommended date includes dose 1 plus 6m.',
    testId: 'assertHpv3DoseForecastOverride',
  },
  {
    ruleName:
      'HPV: Set the earliest interval of 5m between doses 1 & 3 for the HPV 3-Dose Series',
    behavior: 'HPV 3-dose dose 3 earliest date includes dose 1 plus 5m.',
    testId: 'assertHpv3DoseForecastOverride',
  },
  {
    ruleName:
      'HPV: Set the latest recommended interval of 7m+4w between doses 1 & 3 for the HPV 3-Dose Series if patient >= 15 yrs',
    behavior:
      'HPV 3-dose dose 3 overdue date is dose 1 plus 7m+4w if dose 1 was at age 15 or later.',
    testId: 'assertHpv3DoseForecastOverride',
  },
  {
    ruleName:
      'HPV: Set the latest recommended interval of 13m+4w between doses 1 & 3 for the HPV 3-Dose Series if patient < 15 yrs',
    behavior:
      'HPV 3-dose dose 3 overdue date is dose 1 plus 13m+4w if dose 1 was before age 15.',
    testId: 'assertHpv3DoseForecastOverride',
  },
  {
    ruleName: 'HPV: Recommend NOT_RECOMMENDED / TOO_OLD If Patient >=46 yrs',
    behavior:
      'HPV recommendation is not-recommended with TOO_OLD at age 46 or later.',
    testId: 'assertHpvAge46AcceptedAndNotRecommended',
  },
  {
    ruleName:
      'HPV: Recommend NOT_RECOMMENDED / TOO_OLD if will be >= 46 Years of Age as of the Routine Recommendation Date',
    behavior:
      'HPV recommendation is not-recommended with TOO_OLD if the routine recommendation date reaches age 46.',
    testId: 'assertHpvAge46AcceptedAndNotRecommended',
  },
  {
    ruleName:
      'HPV: Recommend CONDITIONAL / CLINICAL_PATIENT_DISCRETION if Series is Not Complete, Patient >=27 yrs with one or more doses < 46 yrs',
    behavior:
      'HPV age 27 through 45 with no completed doses is conditionally recommended.',
    testId: 'assertHpvAge27ConditionalRecommendation',
  },
  {
    ruleName:
      'SeriesSelection.HPV: Default to 3-dose series if 2-dose series not otherwise selected',
    behavior:
      'HPV selection defaults to 3-dose if 2-dose criteria do not match.',
    testId: 'probeIceSelection',
  },
  {
    ruleName:
      'SeriesSelection.HPV: Select 2-dose series if patient < 15yrs and no doses have been adminstered in any series',
    behavior:
      'HPV selection chooses 2-dose for patients under 15 with no doses.',
    testId: 'probeIceSelection',
  },
  {
    ruleName:
      'SeriesSelection.HPV: Select 2-Dose Series if 1-dose administered to a patient < 15yrs of age',
    behavior:
      'HPV selection chooses 2-dose after one valid dose before age 15.',
    testId: 'probeIceSelection',
  },
  {
    ruleName:
      'SeriesSelection.HPV: Select 2-dose series if first dose administered < 15yrs of age, Valid target dose 2 in 2-dose series, and no prior Valid target dose 2 earlier in 3-dose series',
    behavior:
      'HPV selection chooses completed 2-dose series when first dose was before age 15.',
    testId: 'probeIceSelection',
  },
  {
    ruleName:
      'SeriesSelection.HPV: Select 3-dose series if first dose administered < 15yrs of age, Valid target dose 2 in 3-dose series, and no prior Valid target dose 2 on same day or before in 2-dose series',
    behavior:
      'HPV selection can choose 3-dose when 3-dose progress supersedes 2-dose.',
    testId: 'probeIceSelection',
  },
  {
    ruleName: 'SeriesSelection.SelectDTP_5_DOSE_SERIESIf3DoseSeriesNotSelected',
    behavior:
      'DTP selection defaults to the 5-dose series unless the 3-dose catch-up criteria are met.',
    testId: 'assertDtpSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection.Select3DoseDTPSeriesIfNoShotsPriorTo7YrsAnd7YrsOldOrOlder',
    behavior:
      'DTP selection chooses the 3-dose series for patients at least 7 years old with no DTP doses before age 7.',
    testId: 'assertDtpSeriesSelection',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day DTP: If one of the shots is pertussis-containing and another is not pertussis-containing, evaluate the pertussis-containing shot first',
    behavior:
      'DTP same-day primary-series evaluation prioritizes pertussis-containing vaccines over non-pertussis products.',
    testId: 'assertDtpSameDayPertussisPreferred',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day DTP Rule 5a (BOTH Primary Series Doses): If one DTP shot is pertussis-containing vaccine and other is not pertussis-containing, evaluate the non-pertussis containing vaccine as Invalid w/ DUPLICATE_SHOT_SAME_DAY',
    behavior:
      'DTP same-day primary-series non-pertussis competitor is invalid with DUPLICATE_SAME_DAY when a pertussis-containing dose is valid.',
    testId: 'assertDtpSameDayPertussisPreferred',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Overview Rule #4-DTP-Pertussis (BOTH Primary Series Doses): If both shots are NOS and one of them contains Pertussis and the other does not, then evaluate shot with Pertussis as Valid and evaluate the other as Invalid with a reason code of DUPLICATE_SAME_DAY',
    behavior:
      'DTP same-day primary-series NOS shots prefer the pertussis-containing NOS product and mark the non-pertussis NOS product duplicate.',
    testId: 'assertDtpSameDayNosPertussisPreferred',
  },
  {
    ruleName:
      'Duplicate Shot/Same Day DTP Rule 5b (BOTH Primary Series Doses): If neither shot contains pertussis or both shots contain pertussis, then evaluate the 1st shot processed as Valid and evaluate the 2nd shot processed as Invalid with a reason code of DUPLICATE_SAME_DAY',
    behavior:
      'DTP same-day primary-series duplicate shots with the same pertussis class keep the first processed dose valid and mark the later dose duplicate.',
    testId: 'assertDtpSameDaySamePertussisClassDuplicate',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day non-DTP Rule 5a: non-DTP shots; set the 2nd shot as Invalid w/ DUPLICATE_SHOT_SAME_DAY',
    behavior:
      'Disease-targeted same-day duplicate shots on the same target dose keep the first processed dose valid and mark the later dose duplicate.',
    testId: 'assertDtpSameDaySamePertussisClassDuplicate',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Overview Rule #4-DTP-Pertussis (NOT Both Primary Series Doses): If neither shot is in the primary series, both are NOS, and one of them contains Pertussis and the other does not, then evaluate shot with Pertussis as Valid and evaluate the other as Invalid with a reason code of DUPLICATE_SAME_DAY',
    behavior:
      'DTP same-day post-primary mixed pertussis/non-pertussis shots remain valid rather than being invalidated as primary-series duplicates.',
    testId: 'assertDtpSameDayPostCompletionMixedPairBothValid',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day DTP Rule 5a (_NOT_ BOTH Primary Series Doses): If one DTP shot is pertussis-containing vaccine and other is not pertussis-containing, but neither are primary series doses, evaluate both as Valid',
    behavior:
      'DTP same-day post-primary mixed pertussis/non-pertussis shots are both retained as valid.',
    testId: 'assertDtpSameDayPostCompletionMixedPairBothValid',
  },
  {
    ruleName:
      'Duplicate Shot/Same Day DTP Rule 5b (_NOT_ BOTH Primary Series Doses): If neither shot contains pertussis or both shots contain pertussis, but neither are primary series doses, evaluate both as Valid',
    behavior:
      'DTP same-day post-primary shots with the same pertussis class are both retained as valid.',
    testId: 'assertDtpSameDayPostCompletionSameClassPairBothValid',
  },
  {
    ruleName:
      'Duplicate Shot/Same Day Overview Abstract DTP Rule #4: Make notes if all shots are an NOS CVX and one of them contains Pertussis and the other does not',
    behavior:
      'DTP same-day duplicate routing records the NOS pertussis/non-pertussis distinction and applies the pertussis-preferred duplicate behavior.',
    testId: 'assertDtpSameDayNosPertussisPreferred',
  },
  {
    ruleName:
      'Duplicate Shot/Same Day Overview Abstract DTP Rule #5: Make notes if neither shot is an NOS CVX, and neither shot is a combination or both shots are a combination',
    behavior:
      'DTP same-day duplicate routing records the same-class non-NOS distinction and keeps the first processed primary-series dose valid.',
    testId: 'assertDtpSameDaySamePertussisClassDuplicate',
  },
  {
    ruleName:
      'DTP(Any): Note that an Adolescent Tdap is needed if primary series complete and patient has _not_ received the necessary adolescent Tdap doses',
    behavior:
      'Completed DTP 5-dose series without adolescent Tdap produces an adolescent Tdap recommendation.',
    testId: 'assertDtpCompletedSeriesRecommendsAdolescentTdap',
  },
  {
    ruleName:
      'DTP(Any): Retract Tdap needed if patient has received his/her Adolescent Tdap dose(s)',
    behavior:
      'After a qualifying adolescent Tdap dose, DTP recommendations switch away from adolescent Tdap-needed state.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'DTP(Any): Retract Tdap needed if primary DTP series not complete',
    behavior:
      'Incomplete DTP primary series recommendations remain primary-series due/catch-up recommendations instead of adolescent Tdap-needed recommendations.',
    testId: 'assertDtpCatchupWithoutPertussisRecommendsTdap',
  },
  {
    ruleName:
      'DTP(Any): Mark that dose of pertussis has not been administered for a shot if the shot is not valid',
    behavior:
      'Invalid DTP shots such as under-age Tdap do not count as pertussis doses, while D_AND_T_INVALID/P_VALID is retained as the partial-pertussis-valid exception.',
    testId:
      'assertDtpUnderAgeTdapPrimaryDoseInvalidAndIgnored/assertDtpPertussisDoseTooSoonAfterTdGetsPartialValidityReason',
  },
  {
    ruleName:
      'DTP: Bypass absolute minimum age for vaccine check if the primary series is complete',
    behavior:
      'After DTP primary-series completion, DTP-family follow-up shots are evaluated through adolescent/recurring Td handling instead of primary-series vaccine minimum-age gates.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'DTP: Bypass absolute maximum age for vaccine check if the primary series is complete',
    behavior:
      'After DTP primary-series completion, DTP-family follow-up shots are evaluated through adolescent/recurring Td handling instead of primary-series vaccine maximum-age gates.',
    testId: 'assertDtpRecurringTdAfterAdolescentTdapIsValid',
  },
  {
    ruleName: 'DTP: Evaluate Adolescent Tdap Shot based on Age >= 10yrs',
    behavior:
      'After DTP primary-series completion, a DTaP/Tdap-family dose at age 10 or later is recorded as valid adolescent Tdap.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'DTP: Evaluate First Adolescent Tdap Shot based on Age >= 7yrs and < 10yrs',
    behavior:
      'After DTP primary-series completion, the first qualifying Tdap-family dose from age 7 through before age 10 is recorded as valid adolescent Tdap when spacing is satisfied.',
    testId: 'assertDtpFirstAdolescentTdapAge7To10Valid',
  },
  {
    ruleName:
      'DTP: Do not run the default Extra_Dose series rule, which would mark this First Adolescent Tdap Shot as an Extra Dose',
    behavior:
      'A qualifying first age 7 through before age 10 adolescent Tdap-family dose remains valid adolescent Tdap instead of being downgraded to extra dose.',
    testId: 'assertDtpFirstAdolescentTdapAge7To10Valid',
  },
  {
    ruleName:
      'DTP: Evaluate First Adolescent Tdap Shot as Accepted / Extra_Dose if Interval of 4 weeks between Pertussis shots is not met',
    behavior:
      'The first age 7 through before age 10 adolescent Tdap-family dose is accepted as EXTRA_DOSE when it is less than 28 days after a prior pertussis dose.',
    testId: 'assertDtpFirstAdolescentTdapAcceptedIfTooCloseToPertussis',
  },
  {
    ruleName:
      'DTP: Evaluate First Adolescent Tdap Shot >= 10yrs as Accepted / Extra_Dose if Interval of 4 weeks between Pertussis Shots is not met',
    behavior:
      'The first age 10 or later adolescent Tdap-family dose is accepted as EXTRA_DOSE when it is less than 28 days after a prior pertussis dose.',
    testId: 'assertDtpFirstAdolescentTdapAge10AcceptedIfTooCloseToPertussis',
  },
  {
    ruleName:
      'DTP: Evaluate Remaining Adolescent Tdap Shots >= 7yrs and < 10yrs as Accepted / Extra Dose',
    behavior:
      'Additional age 7 through before age 10 adolescent Tdap-family doses after a valid adolescent Tdap are accepted as EXTRA_DOSE.',
    testId: 'assertDtpRemainingAdolescentTdapAcceptedAsExtra',
  },
  {
    ruleName:
      'DTP: Do not run the default Interval series rule',
    behavior:
      'Remaining age 7 through before age 10 adolescent Tdap-family extra doses are accepted without default interval invalidation.',
    testId: 'assertDtpRemainingAdolescentTdapAcceptedAsExtra',
  },
  {
    ruleName:
      'DTP: Do not run the default Extra_Dose series rule, which would mark this Remaining Adolescent Tdap shot as an Extra Dose',
    behavior:
      'Remaining age 7 through before age 10 adolescent Tdap-family doses are explicitly handled by the DTP extra-dose rule path.',
    testId: 'assertDtpRemainingAdolescentTdapAcceptedAsExtra',
  },
  {
    ruleName:
      'DTP: If Patient received a Tdap Dose >= 10yrs, make note of this via IceFact of ADOLESCENT_TDAP_COMPLETED',
    behavior:
      'A valid DTP pertussis-containing dose at age 10 or later satisfies adolescent Tdap completion for recommendations.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'DTP: Do not run the default Extra_Dose series rule, which would mark this Adolescent Tdap Shot >= 10 yrs as an Extra Dose',
    behavior:
      'A qualifying age 10 or later adolescent Tdap-family dose remains valid adolescent Tdap instead of being downgraded to extra dose.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'DTP(Abstract): Evaluate Adolescent Tdap Shot >= 7yrs and < 10yrs',
    behavior:
      'The DTP adolescent Tdap age-7-through-under-10 abstract path is implemented by the first-adolescent and remaining-adolescent Tdap handlers.',
    testId:
      'assertDtpFirstAdolescentTdapAge7To10Valid/assertDtpRemainingAdolescentTdapAcceptedAsExtra',
  },
  {
    ruleName:
      'DTP(1): A primary series dose of pertussis exists if a (valid) dose of Pertussis was administered',
    behavior:
      'A valid primary-series pertussis-containing DTP dose is recognized when choosing catch-up Td versus Tdap recommendations.',
    testId: 'assertDtpCatchupWithPertussisRecommendsTd',
  },
  {
    ruleName:
      'DTP(3): A dose of pertussis exists if a (valid) dose for Adolescent Tdap was administered',
    behavior:
      'A valid adolescent Tdap-family dose is recognized as a pertussis dose and moves complete DTP forecasting to Tdap/Td booster recommendations.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'DTP: Absolute Minimum Vaccine Age for Tdap applies for target doses 1-3 of the 5-dose series when certain conditions are true',
    behavior:
      'Tdap CVX 115 given as DTP 5-dose target dose 1, 2, or 3 before age 7y-4d is invalid as INSUFFICIENT_ANTIGEN and does not advance primary-series dose matching.',
    testId: 'assertDtpUnderAgeTdapPrimaryDoseInvalidAndIgnored',
  },
  {
    ruleName:
      'DTP(Abstract): Absolute Minimum Vaccine Age for Tdap check for target doses 4 or 5 of the 5-dose series',
    behavior:
      'Tdap CVX 115 administered for true DTP 5-dose target doses 4 or 5 bypasses the vaccine minimum-age invalidation and can satisfy the target dose.',
    testId:
      'assertDtpTrueDose4TdapBypassesVaccineMinimumAge/assertDtpTrueDose5TdapBypassesVaccineMinimumAge',
  },
  {
    ruleName:
      'DTP: If Absolute Vaccine Minimum Age for Td is not met (7y-4d), shot should be ignored when calculating intervals',
    behavior:
      'Td-family doses given before age 7y-4d are invalid as BELOW_MINIMUM_AGE_VACCINE and are ignored for later DTP interval and dose matching.',
    testId: 'assertDtpUnderAgeTdDoseInvalidAndIgnored',
  },
  {
    ruleName:
      'DTP(HistoryEvaluation): If Tdap (CVX 115) is administered as target dose 1, 2 or 3 to a patient < 7yrs-4days, shot should be ignored when calculating intervals',
    behavior:
      'Under-age Tdap CVX 115 on DTP 5-dose target doses 1 through 3 is invalid and ignored for later DTP interval and dose matching.',
    testId: 'assertDtpUnderAgeTdapPrimaryDoseInvalidAndIgnored',
  },
  {
    ruleName:
      'DTP: Enforce Minimum Interval between Tdap/DTaP and Td/DT if the shot meets the minimum age',
    behavior:
      'A pertussis-containing DTP-family dose given after a Td/DT dose but before the minimum interval is invalidated as D_AND_T_INVALID/P_VALID when vaccine minimum age is met.',
    testId: 'assertDtpPertussisDoseTooSoonAfterTdGetsPartialValidityReason',
  },
  {
    ruleName:
      'DTP(2): A primary series dose of pertussis exists if a shot that was evaluated as Invalid with a reason code of D_AND_T_INVALID/P_VALID',
    behavior:
      'DTP interval evaluation preserves the valid pertussis component by using D_AND_T_INVALID/P_VALID when a pertussis-containing dose is too soon after Td/DT.',
    testId: 'assertDtpPertussisDoseTooSoonAfterTdGetsPartialValidityReason',
  },
  {
    ruleName:
      'DTP: Absolute Minimum Vaccine Age for Tdap does not apply for true target dose 4 or 5 of the 5-dose for 5-dose series if 5-dose Exception #1 did not occur',
    behavior:
      'Tdap CVX 115 on a true DTP 5-dose target dose 4 is allowed without enforcing the Tdap vaccine-level 7y-4d minimum age.',
    testId: 'assertDtpTrueDose4TdapBypassesVaccineMinimumAge',
  },
  {
    ruleName:
      'DTP: Absolute Minimum Vaccine Age for Tdap does not apply for true target dose 4 or 5 of the 5-dose for 5-dose series if 5-dose Exception #2 did not occur',
    behavior:
      'Tdap CVX 115 on a true DTP 5-dose target dose 5 is allowed without enforcing the Tdap vaccine-level 7y-4d minimum age.',
    testId: 'assertDtpTrueDose5TdapBypassesVaccineMinimumAge',
  },
  {
    ruleName:
      'DTP: Evaluate recurring Td as valid if Td (age) evaluation criteria is met',
    behavior:
      'After DTP primary-series completion and adolescent Tdap completion, a later DTP-family dose at age 10 or older is evaluated as valid recurring Td.',
    testId: 'assertDtpRecurringTdAfterAdolescentTdapIsValid',
  },
  {
    ruleName:
      'DTP: Evaluate recurring Td as valid if Td (interval) evaluation criteria is met',
    behavior:
      'Recurring Td after DTP primary-series and adolescent Tdap completion is valid without an additional minimum interval.',
    testId: 'assertDtpRecurringTdAfterAdolescentTdapIsValid',
  },
  {
    ruleName:
      'DTP: Override default series rule that evaluates extra Td shots in the series as accepted',
    behavior:
      'Recurring Td after DTP primary-series and adolescent Tdap completion is recorded as valid instead of accepted extra dose.',
    testId: 'assertDtpRecurringTdAfterAdolescentTdapIsValid',
  },
  {
    ruleName:
      'DTP: Recommend at the vaccine level in DTP series; if the patient < 7yrs, the series is not complete and the recommendation date is at < 7yrs of age, recommend DTaP NOS (CVX 107)',
    behavior:
      'Incomplete DTP recommendations before age 7 recommend DTaP NOS CVX 107.',
    testId: 'assertDtpChildRecommendationUsesDtapNos',
  },
  {
    ruleName:
      'DTP: Recommend earliest/recommended/latest Td (CVX 09) at 7yrs of age if series is not complete, patient >= 7yrs, has received a dose of pertussis >= 7yrs',
    behavior:
      'Incomplete DTP catch-up recommendations at age 7 or older use Td CVX 09 with Tdap/Td reason text when a pertussis dose was given at age 7 or older.',
    testId: 'assertDtpCatchupWithPertussisRecommendsTd',
  },
  {
    ruleName:
      'DTP: Recommend earliest/recommmended/latest Tdap (CVX 115) at age 7yrs if series is not complete, if patient >= 7yrs and has _not_ received a dose of Pertussis >= 7yrs',
    behavior:
      'Incomplete DTP catch-up recommendations at age 7 or older use Tdap CVX 115 when there is no pertussis dose at age 7 or older.',
    testId: 'assertDtpCatchupWithoutPertussisRecommendsTdap',
  },
  {
    ruleName:
      'DTP: If the 5-dose series is complete and a Tdap 5-dose series recommendation exception did _not_ occur, recommend Tdap at earliest date & recommended date of 11yrs, overdue date of 13yrs+4w',
    behavior:
      'Completed DTP 5-dose series recommends adolescent Tdap CVX 115 when adolescent Tdap is still needed.',
    testId: 'assertDtpCompletedSeriesRecommendsAdolescentTdap',
  },
  {
    ruleName:
      'DTP: If the primary series is complete and the patient has received a pertussis containing dose at >= 7 years and <10 years, then recommend another Tdap at at earliest date & recommended date of 11yrs, overdue date of 13yrs+4w',
    behavior:
      'Completed DTP primary series with a pertussis-containing dose from age 7 through before age 10 recommends adolescent Tdap at age 11 with overdue at 13y+4w.',
    testId: 'assertDtpPertussisAge7To10RecommendsAdolescentTdapAt11',
  },
  {
    ruleName:
      'DTP: Recommend at the vaccine level in DTP series; if the patient < 7yrs, the series is not complete and the recommendation date is at >= 7yrs of age, recommend Tdap (CVX 115)',
    behavior:
      'Incomplete DTP recommendations whose next recommended date is at age 7 or later recommend Tdap CVX 115 even when evaluation occurs before age 7.',
    testId: 'assertDtpSixBySevenRecommendsTdapAtAge7',
  },
  {
    ruleName:
      'DTP: (Six by Seven Rule)- Recommend next dose at age 7yrs for 5-dose series if patient < 7yrs, series is not complete and has received 6 shots',
    behavior:
      'DTP 5-dose patients younger than age 7 with at least six non-duplicate administered DTP shots and incomplete series are recommended at age 7.',
    testId: 'assertDtpSixBySevenRecommendsTdapAtAge7',
  },
  {
    ruleName:
      'DTP: If the 5-Dose Series is Complete and the patient has NOT received a pertussis containing dose at >= 7 years and <10 years, then invoke 5-Dose Series Adolescent Tdap Exception Rules',
    behavior:
      'Completed DTP 5-dose histories without an age 7 through before age 10 pertussis dose evaluate the adolescent Tdap exception rules before using generic completed-series recommendation timing.',
    testId: 'assertDtpFiveDoseAdolescentTdapExceptionRecommendsAtAge7',
  },
  {
    ruleName:
      'DTP: (Tdap 5-Dose Series Recommendation Exception Occurred)- If the 5-Dose Series is Complete and an Adolescent Tdap is required, recommend Adolescent Tdap at Earliest, Recommended & Overdue Date of 7yrs',
    behavior:
      'When a DTP 5-dose adolescent Tdap recommendation exception occurs, the Tdap recommendation uses age 7 for earliest, recommended, and overdue dates.',
    testId: 'assertDtpFiveDoseAdolescentTdapExceptionRecommendsAtAge7',
  },
  {
    ruleName:
      'DTP: (Tdap 5-Dose Series Recommendation Exception A)- If patient does not have a dose of pertussis >= 4y-4d in the 5-Dose Series(Exception A), make note that the Adolescent Tdap Recommendation Exception criteria was met',
    behavior:
      'Completed DTP 5-dose series without a qualifying pertussis dose at or after age 4y-4d uses the adolescent Tdap exception timing.',
    testId: 'assertDtpFiveDoseAdolescentTdapExceptionRecommendsAtAge7',
  },
  {
    ruleName:
      'DTP: (Tdap 5-Dose Series Recommendation Exception B)- If the patient DOES NOT have at least 4 doses of pertussis given at < 7 years, make note that the Adolescent Tdap Recommendation Exception criteria was met',
    behavior:
      'Completed DTP 5-dose series with fewer than four valid pertussis-containing doses before age 7 uses the adolescent Tdap exception timing.',
    testId: 'assertDtpFiveDoseAdolescentTdapExceptionRecommendsAtAge7',
  },
  {
    ruleName:
      'DTP: If either the 3-Dose or 5-Dose Series is Complete and an Adolescent Tdap is required, recommend Tdap at earliest & recommended interval of 0 days from last non-pertussis shot',
    behavior:
      'Completed DTP primary series with adolescent Tdap still needed recommends Tdap immediately from the latest non-pertussis DTP dose.',
    testId: 'assertDtpCompletedNonPertussisSeriesRecommendsImmediateTdap',
  },
  {
    ruleName:
      'DTP: If either the 3-Dose or 5-Dose Series is Complete and an Adolescent Tdap is required, recommend Tdap at earliest & recommended interval of 6 months from last pertussis shot',
    behavior:
      'Completed DTP primary series with adolescent Tdap still needed and only pertussis-containing prior doses recommends Tdap 6 months after the latest pertussis dose.',
    testId: 'assertDtpCompletedPertussisSeriesRecommendsTdapSixMonthsLater',
  },
  {
    ruleName:
      'DTP: Recommend booster at earliest interval of 5y, recommended interval of 10yrs, and latest recommended interval of 10y+4w if series is complete has received a pertussis dose >= 7yrs; include recommendation reason ADMINISTER_TDAP_OR_TD and supplemental text',
    behavior:
      'Completed DTP series with adolescent Tdap switches to Tdap/Td booster recommendation metadata.',
    testId: 'assertDtpAdolescentTdapAfterCompleteStartsBoosterRecommendation',
  },
  {
    ruleName:
      'If a patient is in the DTP 5-dose series and a Valid Td is administered, return the reason code SUPPLEMENTAL_TEXT and descriptive text that Pertussis is needed to complete the series',
    behavior:
      'Valid Td-family doses in the DTP 5-dose series carry PERTUSSIS_NEEDED supplemental text so the missing pertussis antigen is surfaced.',
    testId: 'assertDtpValidTdDoseCarriesPertussisNeededSupplementalText',
  },
  {
    ruleName:
      'If a patient is administered a Valid DT (CVX 28) <= 7yrs, return the reason code SUPPLEMENTAL_TEXT and descriptive text indicating limitations of when DT should be administered',
    behavior:
      'Valid DT CVX 28 doses at or before age 7 carry DT_LIMITATIONS supplemental text.',
    testId: 'assertDtpValidDtDoseAtOrBefore7CarriesLimitationsSupplementalText',
  },
  {
    ruleName:
      'If a patient is administered a Valid DT (CVX 28) > 7yrs, return the reason code SUPPLEMENTAL_TEXT and descriptive text indicating limitations of when DT should be administered',
    behavior:
      'Valid DT CVX 28 doses after age 7 carry DT_LIMITATIONS supplemental text.',
    testId: 'assertDtpValidDtDoseAfter7CarriesLimitationsSupplementalText',
  },
  {
    ruleName:
      'DTP: (5-Dose Series Exception Rule 1)- Mark the 5-Dose Series Complete if age >=7 yrs, with the first dose at >= 12m and at least 1 dose at >= 4yrs',
    behavior:
      'DTP 5-dose series is complete with 3 valid doses when dose 1 is at or after 12 months, a later dose is at or after age 4, and evaluation is at or after age 7.',
    testId: 'assertDtpFiveDoseException1CompletesWithThreeDoses',
  },
  {
    ruleName:
      'DTP: (5-Dose Series Exception Rule 1)- Mark the 5-Dose Series Complete for Patient who will be >= 7yrs as of the next due date, if 3 doses have been administered with the first dose at >= 12m and at least 1 dose at >= 4yrs',
    behavior:
      'DTP 5-dose forecast treats the same 3-dose catch-up exception as complete when the next due date reaches age 7.',
    testId: 'assertDtpFiveDoseException1CompletesWithThreeDoses',
  },
  {
    ruleName:
      'DTP: (5-Dose Series Exception Rule 1)- Skip to Dose 4 if patient >= 7yrs and has had 2 doses with the first dose at >= 12m and one dose at >= 4 yrs',
    behavior:
      'DTP 5-dose forecast skips recommendation from dose 3 to dose 4 for catch-up patients age 7 or older with dose 1 at or after 12 months and another dose at or after age 4.',
    testId: 'assertDtpFiveDoseException1ForecastSkipsToDose4',
  },
  {
    ruleName:
      'DTP: (5-Dose Series Exception Rule 1)- Skip Dose Number to 4 if Patient >= 7 yrs when 3rd target dose is being administered, with first dose at >= 12m and at least 1 dose at >= 4yrs',
    behavior:
      'DTP 5-dose evaluation retargets the administered third catch-up shot to dose 4 when the patient is at least 7, dose 1 was at or after 12 months, and a prior dose was at or after age 4.',
    testId: 'assertDtpFiveDoseException1AdministeredDoseSkipsToDose4',
  },
  {
    ruleName:
      'DTP: (5-Dose Series Exception Rule 2)- Mark the 5-Dose Series Complete if the 4th Dose is Administered at >= 4 yrs of Age and the Interval between Dose 3 and Dose 4 >= 6m-4d',
    behavior:
      'DTP 5-dose series is complete with 4 valid doses when dose 4 is at or after age 4 and at least 6m-4d after dose 3.',
    testId: 'assertDtpFiveDoseException2CompletesWithFourDoses',
  },
  {
    ruleName:
      'DTP: (3-Dose Series Exception Rule[Series Not Complete])- If the Patient has Completed the Series but none of the Doses are pertussis-containing Vaccines, mark the 3-dose Series Not Complete',
    behavior:
      'DTP 3-dose series remains not complete after 3 valid non-pertussis doses.',
    testId: 'assertDtpThreeDoseTdOnlySeriesRemainsIncomplete',
  },
  {
    ruleName:
      'DTP: (3-Dose Series Exception Rule[Evaluation])- If none of the prior 3 or more Doses administered in 3-dose Series contains pertussis but this Shot does contain pertussis, evaluate it as Valid and mark the Series Complete',
    behavior:
      'DTP 3-dose series accepts a later pertussis-containing dose as valid and complete when the prior 3 doses did not contain pertussis.',
    testId: 'assertDtpThreeDosePertussisDoseCompletesSeries',
  },
  {
    ruleName:
      'DTP: (3-Dose Series Exception Rule[Recommendation])- If none of the 3 or more doses administered in 3-dose Series contains pertussis, recommend Tdap in 0 days following the most recent dose',
    behavior:
      'DTP 3-dose series recommends Tdap CVX 115 when 3 or more valid doses have been administered with no pertussis-containing dose.',
    testId: 'assertDtpThreeDoseTdOnlySeriesRemainsIncomplete',
  },
  {
    ruleName:
      'Pneumococcal Adult: If a (valid) PCV21 or PCV20 dose has been administered, the series is complete',
    behavior:
      'Adult pneumococcal PCV20 or PCV21 dose targets the adult dose slot and completes the pneumococcal series.',
    testId: 'assertPneumococcalAdultPcv20CompletesSeries/assertPneumococcalAdultPcv21CompletesSeries',
  },
  {
    ruleName:
      'ImmunizationReferenceData: Initalize Output of Earliest and Overdue Dates for Pneumococcal Adult Series Fact Object',
    behavior:
      'The TypeScript forecast model initializes adult pneumococcal earliest, recommended, and overdue date fields as normal optional forecast fields; adult pneumococcal date output is enabled by default.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: if a (valid) PCV15 dose and (valid) PPSV23 dose has been administered in the Adult series, the series is complete',
    behavior:
      'Adult pneumococcal PCV15 plus PPSV23 targets adult dose slots and completes the pneumococcal series.',
    testId: 'assertPneumococcalAdultPcv15AndPpsv23CompletesSeries',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV21 or PCV20 and a PPSV23 are both administered for dose 1 of the Adult series on the same day, evaluate the PCV21 or PCV20 first',
    behavior:
      'Pneumococcal same-day duplicate handling prioritizes adult PCV20/PCV21 over PPSV23 and marks the lower-priority same-day shot duplicate.',
    testId: 'assertPneumococcalAdultSameDayPcv20PreferredOverPpsv23',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PPSV23 and a PCV15, PCV13, PCV10 or PCV7 are both administered for dose 1 of the Adult series on the same day, evaluate the PPSV23 first',
    behavior:
      'Pneumococcal same-day duplicate handling prioritizes adult PPSV23 over lower-priority PCV15/13/10/7 products.',
    testId: 'assertPneumococcalAdultSameDayPpsv23PreferredOverPcv15',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV21 and and other vaccine are both administered on the same day in the Adult series, evaluate the PCV21 first',
    behavior:
      'Pneumococcal same-day duplicate handling prioritizes PCV21 over other same-day adult pneumococcal products.',
    testId: 'assertPneumococcalAdultSameDayPcv21Preferred',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV20 and and other vaccines (except PCV21) are both administered on the same day in the Adult series, evaluate the PCV20 first',
    behavior:
      'Pneumococcal same-day duplicate handling prioritizes PCV20 over same-day adult pneumococcal products except PCV21.',
    testId: 'assertPneumococcalAdultSameDayPcv20PreferredOverPpsv23',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV15 and PCV13, PCV10 or PCV7 are both administered on the same day in the Adult series, evaluate the PCV15 first',
    behavior:
      'Pneumococcal same-day duplicate handling prioritizes PCV15 over same-day PCV13/10/7 products.',
    testId: 'assertPneumococcalAdultSameDayPcv15PreferredOverPcv13',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV21 dose and PCV20, PPSV23, PCV15, PCV13, PCV10 or PCV7 are administered on the same day and the series is not complete, mark the PCV20 Invalid / Duplicate Shot (removing any other evaluations/reasons for that shot)',
    behavior:
      'Pneumococcal same-day duplicate handling invalidates the lower-priority PCV20 competitor when PCV21 is administered on the same day.',
    testId: 'assertPneumococcalAdultSameDayPcv21Preferred',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV20 dose and a PPSV23, PCV15, PCV13, PCV10 or PCV7 is administered on the same day and the series is not complete, mark the PPSV23 as Invalid / Duplicate Shot (removing any other evaluations/reasons for that shot)',
    behavior:
      'Pneumococcal same-day duplicate handling invalidates lower-priority same-day competitors when PCV20 is preferred.',
    testId: 'assertPneumococcalAdultSameDayPcv20PreferredOverPpsv23',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PPSV23 dose and a PCV15, PCV13, PCV10 or PCV7 is administered on the same day and the series is not complete, mark the PCV15, PCV13, PCV10 or PCV7 as Invalid / Duplicate Shot (removing any other evaluations/reasons for that shot)',
    behavior:
      'Pneumococcal same-day duplicate handling invalidates lower-priority same-day PCV15/13/10/7 competitors when adult PPSV23 is preferred.',
    testId: 'assertPneumococcalAdultSameDayPpsv23PreferredOverPcv15',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV15 dose and a PCV13, PCV10 or PCV7 are administered on the same day and the series is not complete, mark the PCV13, PCV10 or PCV7 as Invalid / Duplicate Shot (removing any other evaluations/reasons for that shot)',
    behavior:
      'Pneumococcal same-day duplicate handling invalidates lower-priority same-day PCV13/10/7 competitors when PCV15 is preferred.',
    testId: 'assertPneumococcalAdultSameDayPcv15PreferredOverPcv13',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV13 dose and a PCV10 are administered on the same day and the series is not complete, mark the PCV10 as Invalid / Duplicate Shot (removing any other evaluations/reasons for that shot)',
    behavior:
      'Pneumococcal same-day duplicate handling prioritizes PCV13 over same-day PCV10 and marks PCV10 duplicate.',
    testId: 'assertPneumococcalSameDayPcv13PreferredOverPcv10',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV13 and PCV7 and shot administered >= 6/1/2010, then evaluate PCV13 as Valid and PCV7 as Invalid/Duplicate',
    behavior:
      'Pneumococcal same-day duplicate handling prefers PCV13 over PCV7 on or after the June 1, 2010 cutoff.',
    testId: 'assertPneumococcalChildSameDayPcv13PreferredOverPcv7After2010',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV13 and PCV7 and shot administered < 6/1/2010, then evaluate PCV7 as Valid and PCV13 as Invalid/Duplicate',
    behavior:
      'Pneumococcal same-day duplicate handling prefers PCV7 over PCV13 before the June 1, 2010 cutoff.',
    testId: 'assertPneumococcalChildSameDayPcv7PreferredOverPcv13Before2010',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV10 and PCV7 and shot administered >= 3/31/2009, then evaluate the PCV10 as Valid and the PCV7 as Invalid/Duplicate',
    behavior:
      'Pneumococcal same-day duplicate handling prefers PCV10 over PCV7 on or after the March 31, 2009 cutoff.',
    testId: 'assertPneumococcalChildSameDayPcv10PreferredOverPcv7After2009',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Pneumococcal Rule: If PCV10 and PCV7 and shot administered < 3/31/2009, then evaluate the PCV7 as Valid and the PCV10 as Invalid/Duplicate',
    behavior:
      'Pneumococcal same-day duplicate handling prefers PCV7 over PCV10 before the March 31, 2009 cutoff.',
    testId: 'assertPneumococcalChildSameDayPcv7PreferredOverPcv10Before2009',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day(Pneumococcal): If 2 childhood series shots are VALID and the childhood series is complete, mark the latter administered shot as Invalid / DUPLICATE_SAME_DAY',
    behavior:
      'Pneumococcal child same-day completion keeps the first valid child-series dose and marks the later same-day child dose invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertPneumococcalChildCompleteSameDaySecondDoseInvalidDuplicate',
  },
  {
    ruleName:
      'Duplicate Shot/Same Day Overview Abstract Pneumococcal Rule #5: Make notes if neither shot is an NOS CVX, neither shot is a combination, or both shots are a combination',
    behavior:
      'Pneumococcal same-day handling is implemented directly with product-pair precedence and child-completion duplicate hooks, so this ICE bookkeeping note has no separate persisted fact in TypeScript.',
    testId: 'ice-pneumococcal-rules',
  },
  ...[
    'Pneumococcal Adult Series: Exception 4: Set Series Dose Number to 6 (AdultSeries) if No Shots Administered and Patient >= 5y of Age at Execution Date',
    'Pneumococcal Child Series: Exception 4: Skip Dose Number to 6 (Adult Series) for Patient >= 5y at Shot Date',
    'Pneumococcal Adult Series: Set Recommendation Date to 50y and Skip Dose to dose 6 (Adult Series target dose 1) if Patient >= 5y and no prior PCV13, PCV15, PCV20 or PCV21 dose',
    'Pneumococcal Adult: If the patient is >= 19 years of age, Skip to Target Dose 6',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Pneumococcal adult-transition rules skip evaluation and forecasting to dose 6 for patients at or beyond the ICE age thresholds.',
    testId: 'ice-pneumococcal-rules',
  })),
  ...[
    'Pneumococcal Adult: If a PPSV23 is administered for dose 1 of the Adult series, then a PCV15, PCV20, PCV21 or PCV13 must be administered for the 2nd dose in the Adult series',
    'Pneumococcal Adult: If a PCV15, PCV20, PCV21 or PCV13 dose is administered for dose 1 of the Adult series, then a PPSV must be administered for the 2nd dose in the Adult series',
    'Pneumococcal Adult: A PCV20, PCV21 or PCV15 must be administered for the 3rd dose in the Adult series',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Pneumococcal adult dose 7 and dose 8 product sequencing rules add VACCINE_NOT_ALLOWED_FOR_THIS_DOSE when products are not allowed by the prior adult dose pattern.',
    testId: 'ice-pneumococcal-rules',
  })),
  {
    ruleName:
      'Pneumococcal Adult: If PCV13 is administered for dose 3 of the Adult series and neither a PCV15/PCV20/PCV21 dose was previously administered nor a PPSV23 dose at >= 50 yrs of age, evaluate the shot as ACCEPTED / OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Pneumococcal adult dose 8 PCV13 is accepted as outside the routine series when there is no prior PCV15/20/21 and no PPSV23 at age 50 or later.',
    testId: 'assertPneumococcalAdultDose8Pcv13AcceptedOutsideRoutine',
  },
  {
    ruleName:
      'Pneumococcal Adult: If a PPSV23 dose was previously administered at >= 65 years of age as well as a PCV13/PCV15/PCV20/PCV21, mark the series is complete',
    behavior:
      'Pneumococcal adult series completes when a valid PPSV23 at age 65 or later is paired with an adult PCV dose.',
    testId: 'assertPneumococcalAdultPpsv23At65WithPcvCompletesSeries',
  },
  {
    ruleName:
      'Pneumococcal Adult Series: Evaluate PCV7 shot (CVX 100) as Accepted with a reason code of VACCINE_NOT_ALLOWED if >= 19 years of age',
    behavior:
      'Pneumococcal CVX100 in the adult dose range is recorded as accepted with VACCINE_NOT_ALLOWED_FOR_THIS_DOSE once the patient is at least 5 at administration.',
    testId: 'assertPneumococcalAdultPcv7AcceptedAtAge5',
  },
  {
    ruleName:
      'Pneumococcal Adult Series: Note that the Absolute Minimum interval from PCV7 = 0d by marking the shot Ignored if >= 19 years of age',
    behavior:
      'Pneumococcal adult CVX100 is accepted without consuming adult dose progress, so later adult PCV doses still target dose 6.',
    testId: 'assertPneumococcalAdultPcv7IgnoredForDoseProgressAtAge19',
  },
  {
    ruleName:
      'Pneumococcal Adult: if ACCEPTED shot administered >= 5 yrs and < 19yrs, evaluate the shot as Accepted / OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Pneumococcal accepted adult-slot shots administered from age 5 through 18 include OUTSIDE_ROUTINE_SERIES.',
    testId: 'assertPneumococcalAdultPcv7AcceptedAtAge5',
  },
  {
    ruleName:
      'Pneumococcal Adult: if INVALID shot administered >= 5 yrs and < 19 yrs was not evaluated as below the minimum age for the vaccine (e.g. - PCV21), evaluate the shot as Accepted / OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Pneumococcal invalid adult-slot shots at age 5 or later convert to accepted OUTSIDE_ROUTINE_SERIES unless the invalid reason is below minimum age, duplicate same-day, or an unspecified adult CVX.',
    testId:
      'assertPneumococcalAdultInvalidDoseAcceptedOutsideRoutineAt19/assertPneumococcalAge5BelowMinimumAgeStaysInvalid',
  },
  {
    ruleName:
      'Pneumococcal Adult: If a shot is admininistered >= 19y in the Adult Series is Invalid and the series is not complete, mark the shot ACCEPTED / OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Pneumococcal invalid adult-series shots at age 19 or later convert to accepted OUTSIDE_ROUTINE_SERIES when the series is incomplete, excluding duplicate same-day and unspecified adult CVX cases.',
    testId: 'assertPneumococcalAdultInvalidDoseAcceptedOutsideRoutineAt19',
  },
  {
    ruleName:
      'Pneumococcal Adult: If CVX 109 or CVX 152 has been evaluated as INVALID / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE in the Adult Series, remove all other reason codes and add supplemental text',
    behavior:
      'Pneumococcal adult CVX109 and CVX152 shots are invalid with VACCINE_NOT_ALLOWED_FOR_THIS_DOSE and the unspecified-CVX supplemental text.',
    testId:
      'assertPneumococcalAdultUnspecifiedCvx109InvalidWithSupplementalText/assertPneumococcalAdultUnspecifiedCvx152InvalidWithSupplementalText',
  },
  {
    ruleName:
      'Pneumococcal Adult(Abstract): Evaluate shot >= 5yrs and < 19yrs Outside of any Routine Series',
    behavior:
      'Pneumococcal adult-slot shots administered from age 5 through 18 are evaluated through the outside-routine adult path unless a below-minimum-age exception applies.',
    testId:
      'assertPneumococcalAdultPcv7AcceptedAtAge5/assertPneumococcalAge5BelowMinimumAgeStaysInvalid',
  },
  {
    ruleName:
      'Pneumococcal: Note completion of child series if the patient has received 4 effective doses prior to 5 years of age',
    behavior:
      'Pneumococcal child series completes when four valid child dose slots are satisfied before age 5.',
    testId: 'assertPneumococcalChildFourEffectiveDosesCompleteSeries',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Evaluate shot administered with an invalid vaccine as Accepted with reason code of VACCINE_NOT_PART_OF_THIS_SERIES (corollary to below; child series not complete)',
    behavior:
      'Pneumococcal child PPSV23 before child completion is accepted as VACCINE_NOT_PART_OF_THIS_SERIES.',
    testId: 'assertPneumococcalChildPpsv23AcceptedNotPartOfSeries',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Evaluate shot administered with an invalid vaccine as Accepted with reason code of VACCINE_NOT_PART_OF_THIS_SERIES (corollary to above; child series complete; patient < 5 yrs of age)',
    behavior:
      'Pneumococcal child PPSV23 after child completion but before age 5 is accepted as VACCINE_NOT_PART_OF_THIS_SERIES.',
    testId: 'assertPneumococcalChildCompleteExtraPpsv23AcceptedNotPartOfSeries',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Evaluate the minimum interval as 0 days between a PPSV23 (CVX 33) and a shot of PCV (CVX 100, 177, 133, 152, 109, 215, 216, 327) administered at < 5yrs of age',
    behavior:
      'Pneumococcal child PPSV23 is accepted/ignored for series progress, so a same-day PCV can still satisfy the child target dose.',
    testId: 'assertPneumococcalChildPpsv23DoesNotBlockSameDayPcv',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Evaluate extra shots before 5 yrs of age as ACCEPTED / EXTRA_DOSE',
    behavior:
      'Pneumococcal child shots after child completion and before age 5 are accepted as EXTRA_DOSE unless they satisfy the modern-PCV-needed exception.',
    testId: 'assertPneumococcalChildExtraPcvAcceptedExtraDose',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Evaluate PCV Shot as Valid if Patient < 5yrs, interval is >= 52 days and Series is Complete',
    behavior:
      'Pneumococcal child modern PCV after child completion with no prior modern PCV is valid when at least 52 days after the prior shot.',
    testId: 'assertPneumococcalChildModernPcvNeededAfterCompletionValidAt52Days',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Evaluate PCV Shot as Invalid if Patient < 5yrs, interval is < 52 days and Series is Complete',
    behavior:
      'Pneumococcal child modern PCV after child completion with no prior modern PCV adds BELOW_MINIMUM_INTERVAL when given before 52 days.',
    testId: 'assertPneumococcalChildModernPcvNeededAfterCompletionInvalidBefore52Days',
  },
  {
    ruleName:
      'Pneumococcal(Abstract): Child Series- PCV Shot is need for patient < 5yrs where Child Series is otherwise complete but there are no prior PCV13, PCV15, PCV20 or PCV21 doses',
    behavior:
      'Pneumococcal child histories that otherwise complete without a modern PCV still require a PCV13/15/20/21 dose; evaluation and forecast paths both honor the modern-PCV-needed condition.',
    testId:
      'assertPneumococcalChildModernPcvNeededAfterCompletionValidAt52Days/assertPneumococcalChildCompleteWithoutModernPcvRecommendsModernPcv',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Exception 1: Evaluate Shot as Below Minimum Age for Final Dose if 4th Dose Administered < the Absolute Minimum Age (1y-4d) and Received 0 Doses Administered Prior to 7m of Age',
    behavior:
      'Pneumococcal child histories with no doses before age 7 months target the final catch-up dose and invalidate it as below absolute minimum age when administered before 1y-4d.',
    testId: 'assertPneumococcalChildFinalDoseBeforeOneYearMinusFourDaysInvalid',
  },
  ...[
    'Pneumococcal Child Series: Exception 1A: Set Series Dose Number to 2 if No Doses Administered and Patient >= 7m and < 12 Months at Execution Date',
    'Pneumococcal Child Series: Exception 1A: Skip Dose Number to 2 for Shot Administered to Patient between >= 7m and < 12m',
    'Pneumococcal Child Series: Exception 1B: Skip Dose Number to 3 if received Dose Administered prior to 7m and Shot being evaluated for Patient between >= 7m and < 12m',
    'Pneumococcal Child Series: Exception 2: Set Series Dose Number to 3 if No Shots Administered and Patient >= 12m and < 24m of Age at Execution Date',
    'Pneumococcal Child Series: Exception 2: Skip Dose Number to 3 if Patient Between >= 12m and < 24m at Shot Date and has Received <2 Doses Administered at <12m of Age at Shot Date',
    'Pneumococcal Child Series: Exception 2: Skip Dose Number to 4 if Patient Between >= 12m and < 24m and has Received 2 Doses Administered at <12m of Age at Shot Date',
    'Pneumococcal Child Series: Exception 3: Set Series Dose Number to 4 if No Shots Administered and Patient >= 24m and < 5y of Age at Execution Date',
    'Pneumococcal Child Series: Exception 3: Skip Dose Number to 4 for Patient >= 24m and < 5y at Shot Date',
    'Pneumococcal Child Series: Include Recommendation with Date 7months in 4-Dose PCV Series and TargetDose 2 if Patient is between 7and12months and Received No Doses before 7months of Age',
    'Pneumococcal Child Series: Include Recommendation with Date 7months in 4-Dose PCV Series and TargetDose 3 if Patient is between 7and12months and Received 1 Dose before 7months of Age',
    'Pneumococcal Child Series: Include Recommendation with Date 12months and TargetDose 3 in 4-Dose PCV Series if Patient between age 12and24months and Received <2 Doses before 12months of Age',
    'Pneumococcal Child Series: Set Recommendation Date to 12months and TargetDose 4 in 4-Dose PCV Series and Patient between age 12and24months and Received 2 Doses before 12months of Age',
    'Pneumococcal Child Series: Set Recommendation Date to 24months and TargetDose 4 in 4-Dose PCV Series if Patient between age 24months and 5years',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Pneumococcal child catch-up dose targeting and milestone recommendation dates are handled by pneumococcal-specific TypeScript forecast and evaluation hooks.',
    testId: 'ice-pneumococcal-rules',
  })),
  {
    ruleName:
      'Pnuemo Adult Special Recommendation Rule #1: If a patient >= 50 years of age, has not completed the series, has >= 1 dose of PCV13 administered at any age, and there are no PPSV23, PCV15, PCV20, or PCV21 shots dose on record, and there is a recommendation date for the next target dose, recommend at the vaccine group level with recommendation reason code ADMINISTER_PCV20_OR_PCV21',
    behavior:
      'Pneumococcal adult PCV13-only histories at age 50 or older recommend at the vaccine-group level with ADMINISTER_PCV20_OR_PCV21.',
    testId: 'assertPneumococcalAdultPcv13OnlyRecommendsPcv20OrPcv21',
  },
  {
    ruleName:
      'Pneumo Adult Special Recommendation Rule #2: If a patient >= 50y years of age, has not completed the series, has >= 1 dose of PCV13 administered at any age, >= 1 dose of PPSV23 administered at < 65 years of age, and there are no PCV15, PCV20, or PCV21 shots dose on record, and there is a recommendation date for the next target dose, recommend at the vaccine group level with recommendation reason code ADMINISTER_PCV20_OR_PCV21.',
    behavior:
      'Pneumococcal adult PCV13 plus PPSV23-before-65 histories at age 50 or older recommend at the vaccine-group level with ADMINISTER_PCV20_OR_PCV21.',
    testId: 'assertPneumococcalAdultPcv13OnlyRecommendsPcv20OrPcv21',
  },
  {
    ruleName:
      'Pneumococcal Adult: If a patient >= 65 years of age, has completed the series with >= 1 dose of PCV13 administered at any age, and >= 1 dose of PPSV23 administered >=65 years of age, and there are no PCV15, PCV20, or PCV21 shots on record, recommendation is Conditional with reason codes COMPLETE, CLINICAL_PATIENT_DISCRETION, and SUPPLEMENTAL_TEXT.',
    behavior:
      'Pneumococcal adult PCV13 plus PPSV23 at age 65 or later returns a conditional complete recommendation with clinical-discretion and supplemental-text reasons.',
    testId: 'assertPneumococcalAdultPcv13Ppsv23At65ConditionalCompleteRecommendation',
  },
  {
    ruleName:
      'Pneumococcal Adult(PCV-PPSV Series): If no adult doses have been administered and Special Recommendation Rule 1 & Special Recommendation Rule 2 are not true, recommend at the vaccine group level with recommendation reason code is ADMINISTER_PCV15_PCV20_OR_PCV21.',
    behavior:
      'Pneumococcal adult patients with no adult doses recommend at the vaccine-group level with ADMINISTER_PCV15_PCV20_OR_PCV21.',
    testId: 'assertPneumococcalAdultNoDosesRecommendsPcv15Pcv20OrPcv21',
  },
  {
    ruleName:
      'Pneumococcal Adult(PCV-PPSV Series): If dose 1 of the adult series was a PCV vaccine, and Special Recommendation Rule 1 & Special Recommendation Rule 2 are not true, recommend PPSV23 (CVX 33) with supplemental text for target dose 2 or target dose 3',
    behavior:
      'Pneumococcal adult PCV-first histories recommend PPSV23 CVX 33 with supplemental text for the next adult target dose.',
    testId: 'assertPneumococcalAdultPcvThenPpsvRecommendation',
  },
  {
    ruleName:
      'Pneumococcal Adult(PPSV-PCV Series): If dose 1 of the adult series was a PPSV23 vaccine, and Special Recommendation Rule 1 & Special Recommendation Rule 2 are not true, recommend at the vaccine group level with recommendation reason code is ADMINISTER_PCV15_PCV20_OR_PCV21 for target dose 2',
    behavior:
      'Pneumococcal adult PPSV23-first histories recommend at the vaccine-group level with ADMINISTER_PCV15_PCV20_OR_PCV21 for the next adult target dose.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult(PPSV-PCV Series): If dose 1 of the adult series was a PPSV23 vaccine, and Special Recommendation Rule 1 & Special Recommendation Rule 2 are not true, recommend PPSV23 (CVX 33) with supplemental text for target dose 3',
    behavior:
      'Pneumococcal adult PPSV-PCV histories recommend PPSV23 CVX 33 with supplemental text for adult target dose 3.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: If the output of Pneumococcal earliest and overdue dates were disabled in the settings, do not determine earliest and overdue dates (*earliestInterval* override)',
    behavior:
      'The TypeScript pneumococcal engine has no disable-earliest-overdue setting input; adult pneumococcal earliest and overdue date output remains enabled by default.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: If the output of Pneumococcal earliest and overdue dates were disabled in the settings, do not determine earliest and overdue dates (*earliestAgeCheck* override)',
    behavior:
      'The TypeScript pneumococcal engine has no disable-earliest-overdue setting input; adult pneumococcal age-based earliest date output remains enabled by default.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: If the output of Pneumococcal earliest and overdue dates were disabled in the settings, do not determine earliest and overdue dates (*latestRecommendedAgeCheck* override)',
    behavior:
      'The TypeScript pneumococcal engine has no disable-earliest-overdue setting input; adult pneumococcal latest/overdue date output remains enabled by default.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: If the output of Pneumococcal earliest and overdue dates were disabled in the settings, do not determine earliest and overdue dates (*latestRecommendedIntervalCheck* override)',
    behavior:
      'The TypeScript pneumococcal engine has no disable-earliest-overdue setting input; adult pneumococcal interval-based latest/overdue date output remains enabled by default.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: Earliest Interval of 5yrs from prior PPSV shot (or CVX 109) to the next target dose of PPSV',
    behavior:
      'Pneumococcal adult PPSV target-dose recommendations use the same 5-year prior-PPSV interval for earliest date output when that target path is reached.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: Recommended Interval of 5yrs from prior PPSV shot (or CVX 109) to the next target dose of PPSV',
    behavior:
      'Pneumococcal adult PPSV target-dose recommendations use the same 5-year prior-PPSV interval for recommended date output when that target path is reached.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: Recommend Recommended Interval of 1 yr from prior PCV shot to the next target dose',
    behavior:
      'Pneumococcal adult PCV-first PPSV recommendations set the recommended date to one year after the latest prior PCV dose.',
    testId: 'assertPneumococcalAdultPcvThenPpsvRecommendationInterval1Year',
  },
  {
    ruleName:
      'Pneumococcal Adult: Recommend Earliest Interval of 1 yr from prior PCV shot to the next target dose',
    behavior:
      'Pneumococcal adult PCV-first PPSV recommendations set the earliest date to one year after the latest prior PCV dose.',
    testId: 'assertPneumococcalAdultPcvThenPpsvRecommendationInterval1Year',
  },
  {
    ruleName:
      'Pneumococcal Adult: If the patient >= 19 years and < 50 years of age and the series is not complete, include supplemental text',
    behavior:
      'Pneumococcal adult recommendations before age 50 include pneumococcal high-risk supplemental text when adult-dose history exists.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: If the patient is < 50 years of age, received one or more valid doses in an Adult Series at < 50 years old, recommend Conditional/HIGH_RISK along with supplemental text',
    behavior:
      'Pneumococcal adult patients younger than age 50 with adult-dose history receive a conditional HIGH_RISK recommendation with supplemental text.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: if patient *is* >= 5yrs and < 19yrs of age, the childhood series *is not* complete and an adult dose *has not* been administered, then recommend Conditional/HIGH_RISK',
    behavior:
      'Pneumococcal patients age 5 through 18 without adult-dose history and incomplete child series receive a conditional HIGH_RISK recommendation.',
    testId: 'assertPneumococcalAge5NoDosesTargetsAdultDose6At50Years',
  },
  {
    ruleName:
      'Pneumococcal Adult: if patient *is* >= 5yrs and < 19yrs of age, the childhood series *is* complete, _not_ including the PCV13/PCV15/PCV20/PCV21 rule, and an adult dose *has not* been administered, then recommend Conditional/COMPLETE_HIGH_RISK',
    behavior:
      'Pneumococcal patients age 5 through 18 with completed child series and no adult-dose history receive a conditional COMPLETE_HIGH_RISK recommendation.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Adult: if patient *is* >= 5yrs and < 19yrs of age, the childhood series *is* complete, including the PCV13/PCV15/PCV20/PCV21 rule, and an adult dose *has not* been administered, then recommend Conditional/COMPLETE_HIGH_RISK',
    behavior:
      'Pneumococcal patients age 5 through 18 with completed child series including modern PCV and no adult-dose history receive a conditional COMPLETE_HIGH_RISK recommendation.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Child: When recommending in the child series, always recommend at the vaccine group level with reason code SUPPLEMENTAL_TEXT',
    behavior:
      'Pneumococcal child-series recommendations are emitted at the vaccine-group level with SUPPLEMENTAL_TEXT rather than a specific vaccine product.',
    testId: 'ice-pneumococcal-rules',
  },
  {
    ruleName:
      'Pneumococcal Child: if the patient < 2yrs, if a PPSV23 (CVX 33) shot has been given, recommended interval of 0 days from the PPSV23 to the next target dose of PCV',
    behavior:
      'Pneumococcal child recommendations before age 2 use a 0-day recommended interval from child PPSV23 to the next PCV target dose.',
    testId: 'assertPneumococcalChildPpsv23Under2RecommendationInterval0Days',
  },
  {
    ruleName:
      'Pneumococcal Child: if the patient >= 2yrs and < 5 years, if a PPSV23 (CVX 33) shot has been given, recommended interval of 56 days from the PPSV23 to the next target dose of PCV',
    behavior:
      'Pneumococcal child recommendations from age 2 through before age 5 use a 56-day recommended interval from child PPSV23 to the next PCV target dose.',
    testId: 'assertPneumococcalChildPpsv23Age2RecommendationInterval56Days',
  },
  {
    ruleName:
      'Pneumococcal Child Series: if patient is < 5yrs completed the Child series (including a PCV13/PCV15/PCV20/PCV21), recommend Not Recommended with reason COMPLETE_HIGH_RISK',
    behavior:
      'Pneumococcal completed child series with modern PCV before age 5 returns not-recommended COMPLETE_HIGH_RISK.',
    testId: 'assertPneumococcalChildFourEffectiveDosesCompleteSeries',
  },
  {
    ruleName:
      'Pneumococcal Child Series: Recommend PCV13/PCV15/PCV20/PCV21 dose if series complete if no prior VALID PCV13, PCV15, PCV20 or PCV21 doses, is < 5 yrs of age and will be less than 5 yrs of age upon recommendation date',
    behavior:
      'Pneumococcal completed child series with only older PCV products recommends a modern PCV dose before age 5 when the 52-day due date remains before age 5.',
    testId: 'assertPneumococcalChildCompleteWithoutModernPcvRecommendsModernPcv',
  },
  {
    ruleName:
      'Pneumococcal Child Series: if patient *will be* >= 5 years at the recommended due date and < 19 years and the series *is* complete but has not received a childhood PCV13/PCV15/PCV20/PCV21 dose, then recommend Conditional/HIGH_RISK',
    behavior:
      'Pneumococcal completed child series with only older PCV products becomes conditional HIGH_RISK when the modern-PCV due date lands at age 5 through before age 19.',
    testId:
      'assertPneumococcalChildCompleteWithoutModernPcvAfterAge5ConditionalHighRisk',
  },
  {
    ruleName:
      'Pneumococcal Child Series: if patient **will be** >= 5 years at the recommended due date and < 19 years and the series *is not* complete, then recommend Conditional/HIGH_RISK',
    behavior:
      'Pneumococcal incomplete child-series forecasts become conditional HIGH_RISK when the next due date lands at age 5 through before age 19.',
    testId: 'assertPneumococcalChildIncompleteDueAtAge5ConditionalHighRisk',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (< 2 years) if patient is < 2 years of age as of evaluation date, or patient is >= 2 years and has a shot administered in current season at < 2 years of age',
    behavior:
      'COVID-19 Aug 2025 selection chooses the under-2 seasonal series when the patient is younger than 2 years on the evaluation date.',
    testId: 'assertCovid19Aug2025SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 1-dose COVID-19 Series (>= 2 - 64 years) if patient has no in-season shots and is >= 2 years and < 65 years as of evaluation date',
    behavior:
      'COVID-19 Aug 2025 selection chooses the 2-64 seasonal series when the patient is at least 2 years and younger than 65 years on the evaluation date.',
    testId: 'assertCovid19Aug2025SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (>= 65 years) if patient has no in-season shots and is >= 65 years as of evaluation date',
    behavior:
      'COVID-19 Aug 2025 selection chooses the 65+ seasonal series when the patient is at least 65 years on the evaluation date.',
    testId: 'assertCovid19Aug2025SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 1-dose COVID-19 Series (>= 2 - 64 years) if patient has in-season shots administered at >= 2 years and target dose 1 received at age < 65 years',
    behavior:
      'COVID-19 Aug 2025 selection chooses the 2-64 seasonal series when in-season target dose 1 was administered at age 2 through before age 65.',
    testId: 'assertCovid19Aug2025SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (>= 65 years) if patient has in-season shots administered and target dose 1 received at age >= 65 years',
    behavior:
      'COVID-19 Aug 2025 selection chooses the 65+ seasonal series when in-season target dose 1 was administered at age 65 or older.',
    testId: 'assertCovid19Aug2025SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Aug2025+): Select the Seasonal 2-dose COVID-19 Series (>= 65 years) if patient if dose 1 is administered to a patient that will turn 65 within 12 months of season start date',
    behavior:
      'COVID-19 Aug 2025 selection chooses the 65+ seasonal series when target dose 1 was given before age 65 and the patient turns 65 within 12 months of season start.',
    testId: 'assertCovid19Aug2025Turns65Within12MonthsSwitchesToGte65',
  },
  {
    ruleName:
      'SeriesSelect(COVID-19 Sep2023/Aug2024): Catch All-- Select the Mixed Product Series if no other series applies',
    behavior:
      'COVID-19 Sep 2023 selection falls back to the mixed-product under-5 series when no more specific Sep 2023 selection condition applies.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): Select the Mixed Product < 5 yrs series if any doses were administered in the current season prior to 5 yrs of age, and there are a mix of products used',
    behavior:
      'COVID-19 Sep 2023 selection chooses the mixed-product under-5 series when current-season under-5 valid doses use mixed updated products.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024 Adult Series): Do NOT select already _completed_ Sep2023/Aug2024 _Child_ series if a different, _incomplete_ Sep2023/Aug2024 _Adult_ series was previously selected and there are no doses at < 5 years of age',
    behavior:
      'COVID-19 Sep 2023 selection keeps the adult >=5y/Novavax routing for patients age 5 or older when no current-season valid under-5 doses are present, even if under-5 candidate series have apparent progress.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelect(COVID-19 Sep2023/Aug2024): Select the COVID-19 Mixed Product < 5y series if patient is < 5 years of age and there are no doses on record in the current season',
    behavior:
      'COVID-19 Sep 2023 selection chooses the mixed-product under-5 series for patients under age 5 with no current-season doses.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): If the patient is >= 5 years of age and there are no doses on record at >= 5 years in the current season, then COVID-19 >= 5y Series applies',
    behavior:
      'COVID-19 Sep 2023 selection chooses the >=5y series for patients age 5 or older without current-season under-5 routing.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelect(COVID-19 Sep2023/Aug2024): If patient is >= 5 years of age and there are no doses on record at < 5 years of age in the current season, then the COVID-19 >= 5y series',
    behavior:
      'COVID-19 Sep 2023 selection chooses the >=5y series for patients age 5 or older when there are no current-season valid under-5 doses.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): If the first dose administered is the Novavax vaccine at >= 12 years of age, there are no other doses after dose 1 in another series, and there are no doses in the prior season, then the Novavax 2023 Series applies',
    behavior:
      'COVID-19 Sep 2023 selection chooses the Novavax series when dose 1 is Novavax at age 12 or older and no later >=5y series dose supersedes it.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): If the first 2 doses is Novavax (CVX 211, CVX 311) and there are no doses in the prior seasons, then the Novavax 2023 Series applies',
    behavior:
      'COVID-19 Sep 2023 selection keeps the Novavax series when the first two valid current-season doses are Novavax-family products.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): If a >= 5yrs Series is completed but the previously selected Novavax Series is not, then the >= 5yr Series applies',
    behavior:
      'COVID-19 Sep 2023 selection switches from an incomplete Novavax candidate to the completed >=5y seasonal candidate.',
    testId: 'assertCovid19Sep2023CompletedSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): If a Novavax 2023 Series is completed but the previously selected >= 5y Series is not, then the Novavax 2023 Series applies',
    behavior:
      'COVID-19 Sep 2023 selection switches from an incomplete >=5y candidate to the completed Novavax seasonal candidate.',
    testId: 'assertCovid19Sep2023CompletedSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): Select the Mixed Product Series < 5 yrs if at least one dose (if any) in the prior season doses was administered at < 5 yrs of age, all doses (if any) in the prior season are a mix of vaccines, and all shots (if any) in the current season are a mix of 2023 vaccines',
    behavior:
      'COVID-19 Sep 2023 selection chooses the mixed-product under-5 series when valid under-5 doses are not all Pfizer-family or all Moderna-family products.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): Select the Pfizer < 5 yrs series if at least one dose (if any) in the prior season was administered at < 5 yrs of age, all doses (if any) in the all seasons are Pfizer vaccines:, and all shots (if any) are in the current season are a Pfizer vaccine',
    behavior:
      'COVID-19 Sep 2023 selection chooses the Pfizer under-5 series when all valid under-5 COVID doses are Pfizer-family products.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Sep2023/Aug2024): Select the Moderna < 5 yrs series if at least one dose (if any) in the prior season was administered at < 5 yrs of age, all doses (if any) in the prior season are Moderna vaccines, and all shots (if any) in the current season are a Moderna vaccine',
    behavior:
      'COVID-19 Sep 2023 selection chooses the Moderna under-5 series when all valid under-5 COVID doses are Moderna-family products.',
    testId: 'assertCovid19Sep2023SeriesSelection',
  },
  {
    ruleName:
      'COVID-19(Aug2025): If the patient is complete for the season, the recommendation is Not_Recommended/Complete_High_Risk',
    behavior:
      'Completed Aug 2025 COVID-19 series forecasts produce a not-recommended recommendation with COMPLETE_HIGH_RISK.',
    testId: 'assertCovid19Aug2025CompleteRecommendation',
  },
  {
    ruleName:
      'ImmunizationReferenceData: Initialize COVID-19 Sep2023 Dose Number Reset Feature Fact Object',
    behavior:
      'The TypeScript engine does not expose ICE Java feature-fact toggles; COVID-19 result dose numbers are returned from the selected target-series match objects directly.',
    testId: 'assertCovid19DoseNumberResultShape',
  },
  {
    ruleName:
      'ProcessResults(COVID-19): Return COVID-19 Season Evaluations - CB1 - COVID19_SEP2023_DOSE_NUMBER_RESET_DISABLED _not_ enabled - return, for each dose, the number of doses across ALL seasons if the primary series has not been completed yet',
    behavior:
      'COVID-19 TypeScript results return explicit target-series dose numbers on each matched dose; Dec 2020 primary-series matched doses retain their across-series dose numbering.',
    testId: 'assertCovid19DoseNumberResultShape',
  },
  {
    ruleName:
      'ProcessResults(COVID-19): Return COVID-19 Season Evaluations - CB1 - COVID19_SEP2023_DOSE_NUMBER_RESET_DISABLED _not_ enabled - return, for each dose, the number of doses in THIS season if the primary series was completed in a previous season',
    behavior:
      'COVID-19 TypeScript results return explicit target-series dose numbers on each matched dose; Sep 2023 seasonal matched doses are reported with seasonal target-dose numbers.',
    testId: 'assertCovid19DoseNumberResultShape',
  },
  {
    ruleName:
      'ProcessResults(COVID-19): Return Sept 2023 Season Evaluations - CB2 - do _not_ reset to 1 in the Sept 2023, Aug 2024, Aug 2025 or later season if COVID19_SEP2023_DOSE_NUMBER_RESET_DISABLED _is_ set',
    behavior:
      'COVID-19 TypeScript results are not post-processed through ICE Java dose-number reset flags; consumers receive the normalized target-series dose numbers already attached to each match.',
    testId: 'assertCovid19DoseNumberResultShape',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): Select the Mixed Series by default if no valid NOS shots on record',
    behavior:
      'COVID-19 Dec 2020 selection chooses the mixed-product series when there are no valid COVID doses on record.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Pre-Aug25): Select already _completed_ series if a different, _incomplete_ series was previously selected',
    behavior:
      'COVID-19 pre-Aug 2025 selection prefers an already completed Dec 2020 series, such as a one-dose Janssen completion, over incomplete alternative COVID-19 candidate series.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): If the earliest, non-NOS (Valid) _dose_ was not found in the Pfizer, Moderna, Mixed Product or Janssen series (see related rules), then select the another (i.e. - WHO series) that has the earliest, non-NOS (Valid) _dose_ administered to it',
    behavior:
      'COVID-19 Dec 2020 selection chooses the WHO/non-FDA series that contains the earliest valid non-NOS COVID dose when FDA product-family selection does not apply.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): If the Janssen Series was not selected nor were all administered doses a Moderna, Pfizer or Novavax vaccine (i.e.- none of Moderna-only, Pfizer-only or Novavax-only Series are applicable), but (Valid) doses exist in the Mixed Product Series, then select the Mixed Product Series',
    behavior:
      'COVID-19 Dec 2020 selection chooses the mixed-product series when valid COVID doses mix product families.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): If all administered doses are a Moderna vaccine and the valid shot(s) are in the Moderna series, then the Moderna Series applies',
    behavior:
      'COVID-19 Dec 2020 selection chooses the Moderna series when all valid COVID doses are Moderna-family products.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): If all administered doses are a Pfizer vaccine and the valid shot(s) are in the Pfizer series, then the Pfizer Series applies',
    behavior:
      'COVID-19 Dec 2020 selection chooses the Pfizer series when all valid COVID doses are Pfizer-family products.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): If all administered doses are a Novavax vaccine and the valid shot(s) are in the Novavax series, then the Novavax Series applies',
    behavior:
      'COVID-19 Dec 2020 selection chooses the Novavax series when all valid COVID doses are Novavax products.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(COVID-19 Dec2020): If the first dose administered is the Janssen vaccine, then the Janssen Series applies',
    behavior:
      'COVID-19 Dec 2020 selection chooses the Janssen series when the earliest valid COVID dose is Janssen.',
    testId: 'assertCovid19Dec2020SeriesSelection',
  },
  ...[
    'COVID-19: Invoke separate agenda group for evaluation of shots in the COVID19Dec2020 Season',
    'COVID-19: Invoke separate agenda group for evaluation of shots in the COVID19Sep2023/Aug2024 Season',
    'COVID-19: Invoke separate agenda group for evaluation of shots in the COVID19Aug2025+ Season',
    'COVID-19: Invoke separate agenda group for postEvaluationCheck of shots in the COVID19Dec2020 Season',
    'COVID-19: Invoke separate agenda group for postEvaluationCheck of shots in the COVID19Sep2023/Aug2024 Season',
    'COVID-19: Invoke separate agenda group for postEvaluationCheck of shots in the COVIDAug2025+ Season',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'COVID-19 evaluation agenda routing is represented by TypeScript vaccine-group and season-specific evaluation hooks in the series evaluator.',
    testId: 'ice-covid19-rules',
  })),
  ...[
    'COVID-19: Invoke separate agenda group for recommendations in the COVID19Dec2020 Season',
    'COVID-19: Invoke separate agenda group for recommendations in the COVID19Sep2023/Aug2024 Season',
    'COVID-19: Invoke separate agenda group for recommendations in the Aug2025+ Season',
    'COVID-19: Invoke separate agenda group for post recommendation checks in the COVID19Dec2020 Season',
    'COVID-19: Invoke separate agenda group for post recommendation checks in the COVID19Sep2023 Season',
    'COVID-19: Invoke separate agenda group for post recommendation checks in the COVID19Aug2025 Season',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'COVID-19 recommendation agenda routing is represented by TypeScript vaccine-group and season-specific recommendation dispatch in buildSeriesRecommendation/buildCovid19Recommendation.',
    testId: 'assertCovid19Aug2025CompleteRecommendation',
  })),
  {
    ruleName:
      'COVID-19: If a seasonal COVID-19 Series that needs forecasting is complete, and there exists another COVID-19 Season with fully specified season start date > evalTime, then recommendation is NOT_RECOMMENDED / COMPLETE',
    behavior:
      'Completed seasonal COVID-19 Sep 2023/Aug 2024 forecasts return not-recommended COMPLETE when a later COVID-19 season exists after the evaluation date.',
    testId: 'assertCovid19SeasonalCompleteFutureSeasonRecommendation',
  },
  {
    ruleName:
      'COVID-19: If the recommendation is NOT_RECOMMENDED, the current season series is complete and there is not already a recommendation reason supplied, add evaluation reason COMPLETE',
    behavior:
      'COVID-19 completed seasonal forecasts produce explicit not-recommended COMPLETE or COMPLETE_HIGH_RISK recommendation reasons rather than leaving the reason empty.',
    testId: 'assertCovid19SeasonalCompleteFutureSeasonRecommendation',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2–64y/GTE65yr)->TargetDose 1: If ≥1 prior COVID-19 shot, set earliest & recommended interval to 56d',
    behavior:
      'For Aug 2025 2-64 and 65+ COVID-19 dose 1 forecasts, a prior COVID-19 shot sets earliest and recommended dates to 8 weeks after the most recent shot.',
    testId: 'assertCovid19Aug2025PriorDoseInterval',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2–64y): If the patient is >= 12 years - 8 weeks and the most recent shot was <= 12 weeks from the assessment date, include SUPPLEMENTAL_TEXT describing interval options',
    behavior:
      'Aug 2025 COVID-19 2-64 dose 1 recommendations include Novavax/other-product interval supplemental text when the patient is at least 12 years minus 8 weeks and the latest COVID-19 shot was within 12 weeks of evaluation.',
    testId: 'assertCovid19Aug2025Age12RecentDoseSupplementalText',
  },
  {
    ruleName:
      'COVID-19(GTE65 Series): If the most recent shot was <= 12 weeks from the assessment date, include SUPPLEMENTAL_TEXT describing interval options',
    behavior:
      'Aug 2025 COVID-19 65+ dose 1 recommendations include the 65+ interval supplemental text when the latest COVID-19 shot was within 12 weeks of evaluation.',
    testId: 'assertCovid19Aug2025Gte65RecentDoseSupplementalText',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2–64y Series): If <19y, ≥1 pre-season valid dose and no in-season dose, recommend CONDITIONAL / HIGH_RISK and CLINICAL_PATIENT_DISCRETION',
    behavior:
      'Aug 2025 COVID-19 2-64 forecasts for patients under 19 with pre-season COVID-19 history and no in-season dose return conditional HIGH_RISK and CLINICAL_PATIENT_DISCRETION recommendations with forecast dates.',
    testId: 'assertCovid19Aug2025Under19PreSeasonDoseConditionalRecommendation',
  },
  {
    ruleName:
      'COVID-19(Aug2025 GTE65 Series): If age >= 12y-8w, include SUPPLEMENTAL_TEXT describing interval options',
    behavior:
      'Aug 2025 COVID-19 65+ dose 2 recommendations include supplemental text describing the 6-month minimum and 8-to-12-week product-based interval guidance.',
    testId: 'assertCovid19Aug2025Gte65Dose2SupplementalText',
  },
  {
    ruleName:
      'COVID-19(Aug2025 < 2yrs Series): When a shot is recommended for this series, specifically recommend CVX 311',
    behavior:
      'Aug 2025 under-2 COVID-19 recommendations prefer CVX 311.',
    testId: 'assertCovid19Aug2025Lt2RecommendsCvx311',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If a prior shot for target dose 1 was evaluated as Invalid / BELOW_MINIMUM_AGE, then absolute minimum interval from that shot to the next attempt is 24 days',
    behavior:
      'Aug 2025 under-2 COVID-19 shots below the absolute minimum age are invalid and drive the next dose-1 attempt forecast from that invalid dose.',
    testId: 'assertCovid19Aug2025Lt2BelowMinimumAgeNextAttempt28Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 < 2yrs Series): If a shot was previously administered and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES, the minimum/recommended interval from that shot to the next shot is 28 days (*recommendationIntervalCheck*)',
    behavior:
      'Aug 2025 under-2 COVID-19 recommendations after a below-minimum-age invalid dose set earliest and recommended dates to 28 days after that invalid shot.',
    testId: 'assertCovid19Aug2025Lt2BelowMinimumAgeNextAttempt28Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series): If 0 shots in current season and exactly one prior valid CVX 311/312 before season start, skip to target dose 2',
    behavior:
      'Aug 2025 under-2 COVID-19 forecasts with exactly one valid pre-season Moderna CVX 311/312 dose skip target dose 1 and forecast target dose 2.',
    testId: 'assertCovid19Aug2025Lt2PriorModernaSkipsToDose2Forecast',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series): If evaluating a shot in current season and one prior valid CVX 311/312 before season start, set current to dose 2 and skip to target dose 2',
    behavior:
      'Aug 2025 under-2 COVID-19 current-season shots after one valid pre-season Moderna CVX 311/312 dose are evaluated as target dose 2.',
    testId: 'assertCovid19Aug2025Lt2PriorModernaCurrentShotTargetsDose2',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior invalid Pfizer, Novavax or Unspecified before season start and interval < 17 days, evaluate as Invalid / BELOW_MINIMUM_INTERVAL',
    behavior:
      'Aug 2025 under-2 COVID-19 current-season target dose 2 after one valid pre-season Moderna dose is invalid if it is less than 17 days after the latest pre-season Pfizer, Novavax, or unspecified invalid/accepted COVID-19 shot.',
    testId:
      'assertCovid19Aug2025Lt2PriorModernaInvalidPfizerCurrentShotBelow17DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior invalid Pfizer, Novavax or Unspecified before season start and interval >= 17 days',
    behavior:
      'Aug 2025 under-2 COVID-19 current-season target dose 2 after one valid pre-season Moderna dose is allowed once it is at least 17 days after the latest pre-season Pfizer, Novavax, or unspecified invalid/accepted COVID-19 shot.',
    testId:
      'assertCovid19Aug2025Lt2PriorModernaInvalidPfizerCurrentShotAfter17DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior is not Pfizer, Novavax or Unspecified before season start and interval < 24 days, evaluate as Invalid / BELOW_MINIMUM_INTERVAL',
    behavior:
      'Aug 2025 under-2 COVID-19 current-season target dose 2 after one valid pre-season Moderna dose is invalid if it is less than 24 days after the latest other pre-season invalid/accepted COVID-19 shot.',
    testId:
      'assertCovid19Aug2025Lt2PriorModernaInvalidOtherCurrentShotBelow24DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior invalid Pfizer, Novavax or Unspecified before season start, minimal and recommended intervals are 21 days',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 2 forecasts after one valid pre-season Moderna dose and a later pre-season Pfizer, Novavax, or unspecified invalid/accepted COVID-19 shot use a 21-day interval from that later shot, not before season start.',
    testId: 'assertCovid19Aug2025Lt2PriorModernaInvalidPfizerForecast21Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If prior CVX 311/312 and prior is not Pfizer, Novavax or Unspecified before season start, minimal and recommended intervals are 28 days',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 2 forecasts after one valid pre-season Moderna dose and a later other invalid/accepted pre-season COVID-19 shot use a 28-day interval from that later shot, not before season start.',
    testId: 'assertCovid19Aug2025Lt2PriorModernaInvalidOtherForecast28Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 208, 217, 218, 219, 300, 301, 302, 308, 309, 310, 211, 313, 213 administered prior to the season start date, then absolute minimum interval is 17 days',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is invalid when administered less than 17 days after a pre-season Pfizer, Novavax, or unspecified invalid/accepted COVID-19 shot and no valid qualifying pre-season dose exists.',
    testId: 'assertCovid19Aug2025Lt2InvalidPfizerOnlyCurrentShotBelow17DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 208, 217, 218, 219, 300, 301, 302, 308, 309, 310, 211, 313, 213 administered prior to the season start date, then absolute minimum interval is 17 days mark interval override satisfied',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is valid once administered at least 17 days after a pre-season Pfizer, Novavax, or unspecified invalid/accepted COVID-19 shot and no valid qualifying pre-season dose exists.',
    testId: 'assertCovid19Aug2025Lt2InvalidPfizerOnlyCurrentShotAfter17DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any other invalid COVID-19 shot administered prior to the season start date, then absolute minimum interval from that shot to the next attempt is 24 days',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is invalid when administered less than 24 days after another pre-season invalid/accepted COVID-19 shot and no valid qualifying pre-season dose exists.',
    testId: 'assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotBelow24DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any other invalid COVID-19 shot administered prior to the season start date, then absolute minimum interval from that shot to the next attempt is 24 days mark interval override satisfied',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is valid once administered at least 24 days after another pre-season invalid/accepted COVID-19 shot and no valid qualifying pre-season dose exists.',
    testId: 'assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotAfter24DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 208, 217, 218, 219, 300, 301, 302, 308, 309, 310, 211, 313, 213 administered prior to the season start date, then minimum and recommended intervals are 21 days',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 1 forecasts after a pre-season Pfizer, Novavax, or unspecified invalid/accepted COVID-19 shot use a 21-day interval from that shot.',
    testId: 'assertCovid19Aug2025Lt2InvalidPfizerOnlyForecast21Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any other invalid COVID-19 shot administered prior to the season start date, then minimum and recommended intervals are 28 days',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 1 forecasts after another pre-season invalid/accepted COVID-19 shot use a 28-day interval from that shot.',
    testId: 'assertCovid19Aug2025Lt2InvalidOtherOnlyForecast28Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior Pfizer, Novavax or Unspecified shot to the next attempt is 17 days',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is invalid when administered less than 17 days after a single valid pre-season non-Moderna Pfizer, Novavax, or unspecified COVID-19 dose.',
    testId: 'assertCovid19Aug2025Lt2NonModernaPriorCurrentShotBelow17DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior Pfizer, Novavax or Unspecified shot mark interval override satisfied (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is valid once administered at least 17 days after a single valid pre-season non-Moderna Pfizer, Novavax, or unspecified COVID-19 dose.',
    testId: 'assertCovid19Aug2025Lt2NonModernaPriorCurrentShotAfter17DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior other than Pfizer, Novavax or Unspecified shot to the next attempt is 24 days',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is invalid when administered less than 24 days after a later other pre-season invalid/accepted COVID-19 shot in the one-valid-non-Moderna prior pattern.',
    testId:
      'assertCovid19Aug2025Lt2NonModernaPriorOtherCurrentShotBelow24DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then absolute minimum interval from prior other than Pfizer, Novavax or Unspecified shot mark interval override satisfied (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 under-2 COVID-19 target dose 1 is valid once administered at least 24 days after a later other pre-season invalid/accepted COVID-19 shot in the one-valid-non-Moderna prior pattern.',
    testId:
      'assertCovid19Aug2025Lt2NonModernaPriorOtherCurrentShotAfter24DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then minimum interval from prior Pfizer, Novavax or Unspecified shot to the next attempt is 21 days',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 1 forecasts after one valid pre-season non-Moderna Pfizer, Novavax, or unspecified COVID-19 dose use a 21-day interval from that dose.',
    testId: 'assertCovid19Aug2025Lt2NonModernaPriorForecast21Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date, then minimum interval from prior other than Pfizer, Novavax or Unspecified shot to the first dose is 28 days',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 1 forecasts in the one-valid-non-Moderna prior pattern use a 28-day interval from a later other pre-season invalid/accepted COVID-19 shot.',
    testId: 'assertCovid19Aug2025Lt2NonModernaPriorWithOtherPriorForecast28Days',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series): If 0 shots in current season and ≥2 valid pre-season doses (CVX 213,308,309,310,311,312,313), skip to target dose 2',
    behavior:
      'Aug 2025 under-2 COVID-19 forecasts with two or more valid qualifying pre-season doses keep the seasonal series open and forecast target dose 2.',
    testId: 'assertCovid19Aug2025Lt2TwoPreSeasonDosesForecastDose2',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series): If evaluating a shot in current season and ≥2 valid pre-season doses exist, set current to dose 2 and skip to target dose 2',
    behavior:
      'Aug 2025 under-2 COVID-19 current-season shots after two or more valid qualifying pre-season doses are evaluated as target dose 2.',
    testId: 'assertCovid19Aug2025Lt2TwoPreSeasonDosesCurrentShotTargetsDose2',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If ≥2 valid pre-season doses and interval < 8w-4d, evaluate as Invalid / BELOW_MINIMUM_INTERVAL',
    behavior:
      'Aug 2025 under-2 COVID-19 current-season target dose 2 is invalid when it is less than 8 weeks minus 4 days after the latest qualifying pre-season dose.',
    testId:
      'assertCovid19Aug2025Lt2TwoPreSeasonDosesCurrentShotBelowIntervalInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 LT2y Series)-->TargetDose 2: If ≥2 valid pre-season doses, set earliest & recommended interval to 8w',
    behavior:
      'Aug 2025 under-2 COVID-19 dose 2 forecasts after two or more valid qualifying pre-season doses use an 8-week interval from the latest qualifying pre-season dose, not before the season start date.',
    testId: 'assertCovid19Aug2025Lt2TwoPreSeasonDosesForecastDose2',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2-64yrs/65+ Series): If prior is CVX 313 and current is CVX 313 for target dose 1 and interval < 17 days, evaluate as Invalid / BELOW_MINIMUM_INTERVAL (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 COVID-19 2-64/65+ target dose 1 is invalid when CVX 313 follows prior CVX 313 by less than 17 days.',
    testId: 'assertCovid19Aug2025AdultCvx313To313Below17DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2-64yrs/65+ Series): If prior is CVX 313 and current is CVX 313 for target dose 1 and interval >= 17 days, mark interval override satisfied (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 COVID-19 2-64/65+ target dose 1 permits CVX 313 after prior CVX 313 once the 17-day interval is met.',
    testId: 'assertCovid19Aug2025AdultCvx313To313At17DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is NOT CVX 313 and interval < 8w-4d to target dose 1, evaluate as Invalid / BELOW_MINIMUM_INTERVAL (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 COVID-19 2-64/65+ target dose 1 is invalid when a non-CVX-313 prior COVID-19 shot is less than 8 weeks minus 4 days earlier.',
    testId: 'assertCovid19Aug2025AdultNon313PriorBelow8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is NOT CVX 313 and interval >= 8w-4d to target dose 1, mark interval override satisfied (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 COVID-19 2-64/65+ target dose 1 permits shots after a non-CVX-313 prior COVID-19 shot once the 8 weeks minus 4 days interval is met.',
    testId: 'assertCovid19Aug2025AdultNon313PriorAt8WeeksMinus4DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is CVX 313 and interval < 8w-4d to non-313 target dose 1, evaluate as Invalid / BELOW_MINIMUM_INTERVAL (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 COVID-19 2-64/65+ non-CVX-313 target dose 1 is invalid when prior CVX 313 is less than 8 weeks minus 4 days earlier.',
    testId: 'assertCovid19Aug2025AdultCvx313ToNon313Below8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Aug2025 2-64yrs/65+ Series): If prior shot is CVX 313 and interval >= 8w-4d to non-313 target dose 1, mark interval override satisfied (*doseIntervalCheck*)',
    behavior:
      'Aug 2025 COVID-19 2-64/65+ non-CVX-313 target dose 1 permits prior CVX 313 once the 8 weeks minus 4 days interval is met.',
    testId: 'assertCovid19Aug2025AdultCvx313ToNon313At8WeeksMinus4DaysValid',
  },
  {
    ruleName:
      'COVID-19(Aug2025): Switch from 1-Dose 2-64yrs series to 2-Dose 65+ series if dose 1 is administered to a patient that will turn 65 within 12 months of season start date',
    behavior:
      'Aug 2025 COVID-19 patients who receive a valid 2-64 dose 1 before turning 65 and turn 65 within 12 months of season start are selected into the 65+ two-dose series with that shot counted as dose 1.',
    testId: 'assertCovid19Aug2025Turns65Within12MonthsSwitchesToGte65',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (Sep2023/Aug2024 >= 5yrs): If a CVX 213 and CVX 313 are administered on the same day and both would be considered valid, evaluate the CVX 213 as valid',
    behavior:
      'Sep 2023/Aug 2024 COVID-19 same-day CVX 213 and CVX 313 records for patients at least 5 years old keep CVX 213 valid and mark CVX 313 invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertCovid19Sep2023Cvx213PreferredOverSameDayCvx313',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (COVID-19): If a Janssen is administered on the same day as a Pfizer, Moderna or Novavax vaccine, evaluate the Pfizer/Moderna/Novavax shot first',
    behavior:
      'COVID-19 same-day records sort Janssen after Pfizer, Moderna, Novavax, and unspecified COVID-19 products so the non-Janssen shot is evaluated first.',
    testId:
      'assertCovid19Dec2020PfizerModernaNovavaxPreferredOverSameDayJanssen',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (COVID-19): If shot is marked valid but another shot on the same day is marked Accepted, evaluate the non-preferred shot as Invalid with reason DUPLICATE_SAME_DAY',
    behavior:
      'COVID-19 same-day accepted shots on the same series dose are moved to invalid with DUPLICATE_SAME_DAY when a valid same-day shot exists.',
    testId: 'assertCovid19AcceptedSameDayDoseBecomesInvalidDuplicate',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (COVID-19): If one of those shots is Valid and another shot on the same day is Invalid with reason code VACCINE_NOT_ALLOWED_FOR_THIS_DOSE (and no other reason codes), replace this reason code with DUPLICATE_SAME_DAY',
    behavior:
      'COVID-19 invalid same-day shots with only VACCINE_NOT_ALLOWED_FOR_THIS_DOSE are converted to DUPLICATE_SAME_DAY when a valid same-dose shot exists on that date.',
    testId: 'assertCovid19InvalidNotAllowedSameDayDoseBecomesDuplicate',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (COVID-19): For shots prior to 10/25/2021, bypass Duplicate Shot/Same Day Processing by not setting the target dose number of the shot to be evaluated shot to the prior dose number',
    behavior:
      'COVID-19 Dec 2020 same-day duplicate invalidation is bypassed before 2021-10-25, preserving normal target-dose processing instead of forcing DUPLICATE_SAME_DAY.',
    testId: 'assertCovid19Dec2020ModernaPreferredOverSameDayPfizer',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (COVID-19): If a Moderna shot and Pfizer shot are both Valid on the same day (after 10/25/2021 as per above), mark the Moderna shot Valid and the other shot Invalid / DUPLICATE_SAME_DAY',
    behavior:
      'COVID-19 Dec 2020 same-day Moderna/Pfizer records after 2021-10-25 keep Moderna valid and mark Pfizer invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertCovid19Dec2020ModernaPreferredOverSameDayPfizer',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (COVID-19): If an FDA-approved vaccine and a WHO-only approved vaccine are both Valid on the same day (after 10/25/2021 as per above), mark the FDA-approved shot as Valid and the other shot Invalid / DUPLICATE_SAME_DAY',
    behavior:
      'COVID-19 Dec 2020 same-day FDA/WHO-only records after 2021-10-25 keep the FDA-approved shot valid and mark the WHO-only shot invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertCovid19Dec2020FdaPreferredOverSameDayWhoOnly',
  },
  {
    ruleName:
      'COVID-19(9/12/2023+): For any prior formulation administered in a COVID-19 series (excluding CVX 211), override the absolute vaccine minimum age check',
    behavior:
      'COVID-19 prior-formulation CVX products administered on or after 2023-09-12 are evaluated as invalid prior formulations without adding an absolute-minimum-age reason.',
    testId: 'assertCovid19Sep2023PriorFormulationInvalidVaccineNotAllowed',
  },
  {
    ruleName:
      'COVID-19(9/12/2023+): If a prior formulation is administered (excluding CVX 211), mark the shot Invalid / VACCINE_NOT_ALLOWED (overrides VACCINE_NOT_ALLOWED_FOR_THIS_DOSE rules)',
    behavior:
      'COVID-19 prior-formulation CVX products administered on or after 2023-09-12 are invalid with VACCINE_NOT_ALLOWED.',
    testId: 'assertCovid19Sep2023PriorFormulationInvalidVaccineNotAllowed',
  },
  {
    ruleName:
      'COVID-19: If a previous shot was evaluated and Not Valid due to ABOVE_MAXIMUM_AGE_VACCINE, ignore the shot when calculating intervals',
    behavior:
      'COVID-19 invalid prior shots with ABOVE_MAXIMUM_AGE_VACCINE are excluded from subsequent COVID-19 interval calculations.',
    testId: 'assertCovid19AboveMaximumAgeInvalidPriorIgnoredForIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023+): Remove evaluation reason VACCINE_NOT_ALLOWED_FOR_THIS_DOSE if there are other evaluation reason codes',
    behavior:
      'COVID-19 shots administered on or after 2023-09-12 remove VACCINE_NOT_ALLOWED_FOR_THIS_DOSE when a stronger invalid reason is also present.',
    testId: 'assertCovid19Sep2023NotAllowedReasonCleanup',
  },
  {
    ruleName:
      'COVID-19(9/12/2023+): If a COVID-19 shot that does not count towards U.S. vaccination is administered (for any Sept 2023+ COVID-19 Series) is < 8w-4d, evaluate the shot as Invalid',
    behavior:
      'Sept 2023+ COVID-19 shots after a non-counting prior COVID-19 CVX are invalid with BELOW_ABSOLUTE_MINIMUM_INTERVAL if administered before 8 weeks minus 4 days.',
    testId:
      'assertCovid19Sep2023NonCountingPriorBelow8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(9/12/2023+): If a COVID-19 shot that does not count towards U.S. vaccination is administered (for any Sept 2023+ COVID-19 Series) is between 8w-4d and the series table interval, override the doseIntervalCheck',
    behavior:
      'Sept 2023+ COVID-19 shots after a non-counting prior COVID-19 CVX are allowed once the 8 weeks minus 4 days interval is met, even before the 8-week recommendation date.',
    testId: 'assertCovid19Sep2023NonCountingPriorAt8WeeksMinus4DaysValid',
  },
  {
    ruleName:
      'COVID-19(9/12/2023+): For the 2023-2024 season, if the patient has >= 1 (invalid) COVID-19 shot(s) administered prior to 9/12/2023, and there are no doses on record, the absolute minimum interval from (invalid) dose 1 is 8w-4d (*doseIntervalCheck*)',
    behavior:
      'Sep 2023 COVID-19 dose 1 is invalid before 8 weeks minus 4 days from the latest pre-season COVID-19 shot when no valid dose is on record, and is allowed once that interval is met.',
    testId:
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  },
  ...[
    'COVID-19(Sep2023/Aug2024 >= 5yrs Series): If the patient has >= 1 COVID-19 shot(s) on record prior to target dose 1, evaluate the shot as Invalid / BELOW_MINIMUM_INTERVAL if the absolute minimum interval of 8w-4d is not met (*doseIntervalCheck*)',
    'COVID-19(Sep2023/Aug2024 >= 5yrs): If the absolute minimum interval from the prior season shot to the current shot is < 8w-4d, evaluate the shot as Invalid',
    'COVID-19(Sep2023/Aug2024 Pfizer/Moderna/Mixed Product < 5yrs; Novavax Series; 2023-2024 Season): If a shot was administered prior to target dose 1 of the 2023-2024 season but has never received any (valid) doses, the absolute minimum interval from the prior shot to the current shot is 8w-4d',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Sep 2023 COVID-19 current-season target dose 1 is invalid before 8 weeks minus 4 days from the latest prior COVID-19 shot when no valid dose is on record.',
    testId:
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  })),
  ...[
    'COVID-19(Sep2023/Aug2024 >= 5yrs Series): If the patient has >= 1 COVID-19 shot(s) on record prior to target dose 1, evaluate the shot as Valid if the absolute minimum interval of 8w-4d is met (*doseIntervalCheck*)',
    'COVID-19(Sep2023/Aug2024 >= 5yrs): If the absolute minimum interval from the prior season shot is administered between 8w-4d and the series table interval, evaluate the shot as Valid',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Sep 2023 COVID-19 current-season target dose 1 is allowed once the latest prior COVID-19 shot is at least 8 weeks minus 4 days earlier, overriding longer table intervals.',
    testId:
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  })),
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer__ < 5yrs Series): If the patient has *0* shots in the current season has *1* dose of a Pfizer COVID-19 vaccines administered prior to the current season at < 5yrs of age, skip to target dose 2',
    behavior:
      'Sep 2023 Pfizer under-5 forecasts with one qualifying Pfizer-family pre-season dose administered before age 5 skip target dose 1 and forecast target dose 2.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer__ < 5yrs Series): If the patient has *0* shots in the current season but has *2 or more* doses of Pfizer COVID-19 vaccines administered prior to the current season at < 5yrs of age, skip to target dose 3',
    behavior:
      'Sep 2023 Pfizer under-5 forecasts with two or more qualifying Pfizer-family pre-season dose dates administered before age 5 skip to target dose 3.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer__ < 5yrs Series): If the patient has shots in the current season and *1* dose of Pfizer COVI-19 vaccines administered prior to the current season start date at < 5yrs of age, dose 1 is not needed; skip to target dose 2.',
    behavior:
      'Sep 2023 Pfizer under-5 current-season shots after one qualifying Pfizer-family pre-season dose administered before age 5 are evaluated as target dose 2.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer__ < 5yrs Series): If the patient has shots in the current season and *2 or more* doses of COVID-19 Pfzier vaccines administered prior to the current season start date at < 5yrs of age, skip to target dose 3.',
    behavior:
      'Sep 2023 Pfizer under-5 current-season shots after two or more qualifying Pfizer-family pre-season dose dates administered before age 5 are evaluated as target dose 3.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product__ < 5yrs Series): If the patient has *0* shots in the current season has *1* dose administered prior to the current season at < 5yrs of age, skip to target dose 2',
    behavior:
      'Sep 2023 mixed-product under-5 forecasts with one qualifying COVID-19 pre-season dose administered before age 5 skip target dose 1 and forecast target dose 2.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product__ < 5yrs Series): If the patient has *0* shots in the current season but has *2 or more* doses administered prior to the current season at < 5yrs of age, skip to target dose 3',
    behavior:
      'Sep 2023 mixed-product under-5 forecasts with two or more qualifying COVID-19 pre-season dose dates administered before age 5 skip to target dose 3.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product__ < 5yrs Series): If the patient has shots in the current season and *1* dose administered prior to the current season start date at < 5yrs of age, dose 1 is not needed; skip to target dose 2.',
    behavior:
      'Sep 2023 mixed-product under-5 current-season shots after one qualifying COVID-19 pre-season dose administered before age 5 are evaluated as target dose 2.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product__ < 5yrs Series): If the patient has shots in the current season and *2 or more* doses administered prior to the current season start date at < 5yrs of age, skip to target dose 3.',
    behavior:
      'Sep 2023 mixed-product under-5 current-season shots after two or more qualifying COVID-19 pre-season dose dates administered before age 5 are evaluated as target dose 3.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna__ < 5yrs Series): If the patient has *0* shots in the current season but *1 or more* doses of a Moderna COVID-19 vaccine administered prior to the current season start date at < 5yrs of age, skip to target dose 2',
    behavior:
      'Sep 2023 Moderna under-5 forecasts with at least one qualifying Moderna-family pre-season dose administered before age 5 skip target dose 1 and forecast target dose 2.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna__ < 5yrs Series): if the patient has shots in the current season and *1 or more* doses of a Moderna COVID-19 vaccine administered prior to current season start date at < 5yrs of age, skip to target dose 2.',
    behavior:
      'Sep 2023 Moderna under-5 current-season shots after at least one qualifying Moderna-family pre-season dose administered before age 5 are evaluated as target dose 2.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If the patient has 1 dose of updated Sept 2023 Pfizer COVID-19 vaccine intended for patients age >= 5 years (CVX 309, CVX 310) at age >= 5 years, then the series is complete.',
    behavior:
      'Sep 2023 Pfizer under-5 series completes when a valid CVX309/CVX310 dose is administered at age 5 years or later.',
    testId: 'assertCovid19Sep2023Lt5CompletionShortcuts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5 yrs Series): If the patient has 1 dose of updated Sept 2023 Pfizer or Moderna COVID-19 vaccine intended for patients age >= 5 years (CVX 309, CVX 310, CVX 311, CVX 312) at age >= 5 years, then the series is complete',
    behavior:
      'Sep 2023 mixed-product under-5 series completes when a valid updated Pfizer/Moderna CVX309/310/311/312 dose is administered at age 5 years or later.',
    testId: 'assertCovid19Sep2023Lt5CompletionShortcuts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5 yrs Series): If the patient has >= 1 dose of COVID-19 vaccine at age < 5 years and has 1 dose of updated Novavax Sept 2023 COVID-19 vaccine (CVX 313) at age >= 5 years, then the series is complete',
    behavior:
      'Sep 2023 mixed-product under-5 series completes when any valid dose before age 5 is followed by a valid CVX313 dose at age 5 years or later.',
    testId: 'assertCovid19Sep2023Lt5CompletionShortcuts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5 yrs Series): If the patient has 2 doses of CVX 313, then the series is complete',
    behavior:
      'Sep 2023 mixed-product under-5 series completes after two valid CVX313 doses.',
    testId: 'assertCovid19Sep2023Lt5CompletionShortcuts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the absolute minimum interval from that shot to this shot is 24 days',
    behavior:
      'Sep 2023 Pfizer under-5 retries for target dose 1 or 2 after a same-target below-minimum-age invalid dose are invalid when administered before 24 days.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna < 5yrs Series): If a shot previously administered was evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the absolute minimum interval from that shot to target dose 1 is 24 days',
    behavior:
      'Sep 2023 Moderna under-5 retries after a below-minimum-age invalid dose are invalid when administered before 24 days.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5yrs Series): If a shot previously administered for target dose 1 or target dose 2 was evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES, the absolute minimum interval from that shot to target dose 1 is 24 days',
    behavior:
      'Sep 2023 mixed-product under-5 retries for target dose 1 or 2 after a same-target below-minimum-age invalid dose are invalid when administered before 24 days.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a prior formulation COVID-19 vaccine (excluding non-US vaccines that do not count towards U.S vaccination) or a non-Pfizer updated seasonal COVID-19 vaccine is administered on or after 9/12/2023 for target dose 1 or target dose 2, the absolute minimum interval to the next dose is 24 days',
    behavior:
      'Sep 2023 Pfizer under-5 shots after a prior formulation or non-Pfizer updated seasonal COVID-19 shot are invalid when administered before 24 days.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a CVX 308 is administered for target dose 2 or target dose 3 in the 2023-2024 season, then there is no maximum vaccine age for CVX 308',
    behavior:
      'Sep 2023 Pfizer under-5 CVX308 shots targeting dose 2 or 3 are not invalidated by a vaccine maximum age check.',
    testId: 'assertCovid19Sep2023Cvx308Dose2Dose3NoMaximumAge',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5yrs Series): If a CVX 308 is administered for target dose 2 or target dose 3 in the 2023-2024 season, then there is no maximum vaccine age for CVX 308',
    behavior:
      'Sep 2023 mixed-product under-5 CVX308 shots targeting dose 2 or 3 are not invalidated by a vaccine maximum age check.',
    testId: 'assertCovid19Sep2023Cvx308Dose2Dose3NoMaximumAge',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna < 5rs Series): If there are no doses in the current season but target is dose 2 (due to skip), and there were >=2 doses in a prior season, then absolute minimum interval from the prior shot to the current shot is 8w-4d',
    behavior:
      'Sep 2023 Moderna under-5 first current-season target dose 2 shots after two or more qualifying pre-season doses are invalid when administered before 8 weeks minus 4 days from the latest qualifying prior dose.',
    testId: 'assertCovid19Sep2023ModernaSkipDose2PriorSeasonInterval',
  },
  {
    ruleName:
      'COVID-19(Sep2023+): If CVX 211 is administered on or after 10/4/2023 (any series), mark the shot Invalid / VACCINE_NOT_ALLOWED',
    behavior:
      'Sep 2023 and later COVID-19 evaluations invalidate CVX211 administered on or after 2023-10-04 with VACCINE_NOT_ALLOWED.',
    testId: 'assertCovid19Sep2023Cvx211OnOrAfterCutoffInvalid',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax__ Series): If CVX 313 was administered for dose 1 or dose 2, dose 3 is not needed. Skip to target dose 4.',
    behavior:
      'Sep 2023 Novavax series current shots that would target dose 3 are instead evaluated as target dose 4 when a prior valid dose 1 or dose 2 was CVX313.',
    testId: 'assertCovid19Sep2023NovavaxCvx313SkipsDose3',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If a shot is administered before the absolute minimum age for target dose 4, evaluate as Accepted with reason code OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Sep 2023 Novavax target dose 4 shots before the dose absolute minimum age are accepted as OUTSIDE_ROUTINE_SERIES.',
    testId: 'assertCovid19Sep2023NovavaxCvx313SkipsDose3',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If a CVX 310 or CVX 311 is administered before the absolute minimum age for target dose 4 and <= the absolute maximum age, evaluate as Accepted with reason code OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Sep 2023 Novavax CVX310/CVX311 target dose 4 shots before the dose absolute minimum age are accepted as OUTSIDE_ROUTINE_SERIES on the non-allowed-dose path.',
    testId: 'assertCovid19Sep2023NovavaxCvx313SkipsDose3',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): For the 2023-2024 season, the absolute minimum interval from dose 3 to dose 4 is 8w-4d (*doseIntervalCheck*)',
    behavior:
      'Sep 2023 Novavax target dose 4 shots are invalid with BELOW_ABSOLUTE_MINIMUM_INTERVAL when administered before the 2023-2024 dose-4 interval override from the most recent prior valid Novavax-series dose.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If a CVX 213, CVX 309, or CVX 312 is administered for target dose 2, and target dose 2 is administered < 8 weeks - 4 days from dose 1, evaluate as Invalid / Below Minimum Interval',
    behavior:
      'Sep 2023 Novavax CVX213/CVX309/CVX312 target dose 2 shots are invalid with BELOW_ABSOLUTE_MINIMUM_INTERVAL when given before 8 weeks minus 4 days from dose 1.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If a CVX 313 is administered for dose 1, then the absolute minimum age for dose 1 of the series is 5 years of age',
    behavior:
      'Sep 2023 Novavax CVX313 target dose 1 uses a 5-year absolute minimum age, accepting dose 1 at age 5 and invalidating it below age 5.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): Always enforce absolute minimum interval of 24 days *from* any prior Moderna or CVX 213 shots (in any Series)',
    behavior:
      'Sep 2023 COVID-19 current doses are invalid below 24 days after a valid prior Moderna-family/CVX213 dose in the same selected series.',
    testId: 'assertCovid19Sep2023ModernaCvx213TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): For patients < 18y, always enforce absolute minimum interval of 24 days *to* any Moderna or CVX 213 shots (in any Series)',
    behavior:
      'Sep 2023 COVID-19 Moderna-family/CVX213 current doses for patients under 18 are invalid below 24 days after any valid prior dose in the same selected series.',
    testId: 'assertCovid19Sep2023ModernaCvx213TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19: If the vaccine administered is authorized neither by the FDA nor WHO, evaluate the shot as INVALID/VACCINE_NOT_APPROVED_IN_US_OR_BY_WHO',
    behavior:
      'Dec 2020 COVID-19 CVX products authorized neither by FDA nor WHO are invalid with VACCINE_NOT_APPROVED_IN_US_OR_BY_WHO.',
    testId: 'assertCovid19Dec2020NotApprovedInUsOrWhoInvalid',
  },
  {
    ruleName:
      'COVID-19: If an FDA-approved, NOS or WHO-approved vaccine, the vaccine is not permitted be default for the Dec2020 seasonal series and there are other shots following it, and the series is not complete, evaluate it as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
    behavior:
      'Dec 2020 COVID-19 wrong-series FDA/NOS/WHO-approved products are accepted as not counted when a later COVID-19 shot exists in the same incomplete series evaluation.',
    testId: 'assertCovid19Dec2020WrongSeriesPriorAcceptedWithLaterShot',
  },
  {
    ruleName:
      'COVID-19: If the Series is not complete and the last shot administered was a WHO-approved vaccine not authorized by the FDA, override default earliest interval rule to not fire',
    behavior:
      'Dec 2020 incomplete COVID-19 series whose latest valid dose is CVX213 or a WHO-only product forecast the next dose at 28 days, overriding the default earliest interval.',
    testId: 'assertCovid19Dec2020IncompleteWhoIntervalRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the Series is not complete and the last shot administered was a WHO-approved vaccine not authorized by the FDA, override default recommendation interval rule to not fire',
    behavior:
      'Dec 2020 incomplete COVID-19 series whose latest valid dose is CVX213 or a WHO-only product forecast the next dose at 28 days, overriding the default recommended interval.',
    testId: 'assertCovid19Dec2020IncompleteWhoIntervalRecommendations',
  },
  {
    ruleName:
      'COVID-19: If CVX 229 or CVX 230 was evaluated as Not Valid due to VACCINE_NOT_ALLOWED_FOR_THIS_DOSE in the Pfizer, Moderna or Mixed Product Series, Ignore the shot when calculating intervals',
    behavior:
      'Dec 2020 invalid CVX229/CVX230 doses with VACCINE_NOT_ALLOWED_FOR_THIS_DOSE are retained as invalid but excluded from subsequent COVID-19 interval calculations.',
    testId: 'assertCovid19Dec2020BivalentInvalidPriorIgnoredForIntervals',
  },
  {
    ruleName:
      'COVID-19: Remove evaluation reason VACCINE_NOT_ALLOWED_FOR_THIS_DOSE for shots administered before the series is complete',
    behavior:
      'Dec 2020 incomplete COVID-19 series remove VACCINE_NOT_ALLOWED_FOR_THIS_DOSE from the latest invalid shot, leaving the invalid evaluation with no public reason code.',
    testId: 'assertCovid19Dec2020IncompleteNotAllowedReasonCleanup',
  },
  {
    ruleName:
      'COVID-19: If a bivalent vaccine was administered prior to 9/2/2022, evaluate the shot as Invalid / VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED',
    behavior:
      'Dec 2020 COVID-19 bivalent CVX products administered before 2022-09-02 are invalid with VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED.',
    testId: 'assertCovid19Dec2020BivalentBeforeAvailabilityInvalid',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 5y and < 18y of age and has completed the Moderna Series along with no extra doses, then recommend CONDITIONAL / COMPLETE_HIGH_RISK',
    behavior:
      'Dec 2020 Moderna completed primary series patients age 5 through before 18 with no extra doses receive a conditional COMPLETE_HIGH_RISK recommendation before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 18y has completed the Moderna Series along with no extra doses, then recommend a booster dose at earliest/recommended age of 18y w/ earliest/recommended interval of 5 months',
    behavior:
      'Dec 2020 Moderna completed primary series adults with no extra doses receive a first-booster recommendation at the later of age 18 or 5 months after the primary series before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 5y has completed the Series along with no extra doses in the Pfizer or Mixed Product series, then recommend a booster dose at earliest/recommended age of 5y w/ earliest/recommended interval of 5 months',
    behavior:
      'Dec 2020 Pfizer and mixed completed primary series patients age 5 or older with no extra doses receive a first-booster recommendation at the later of age 5 or 5 months after the primary series before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 12y has completed the Janssen Series and no extra doses have been administered, then recommend the _1st_ booster dose at recommended age 12y w/ recommended interval of 8 weeks, whichever is later',
    behavior:
      'Dec 2020 Janssen completed primary series patients age 12 or older with no extra doses receive a first-booster recommendation at the later of age 12 or 8 weeks after the primary series before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 12y of age and has completed the Novavax Series along with no extra doses, then recommend a booster dose at earliest/recommended age of 12y w/ earliest/recommended interval of 5 months',
    behavior:
      'Dec 2020 Novavax completed primary series patients age 12 or older with no extra doses receive a first-booster recommendation at the later of age 12 or 5 months after the primary series before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 5y has completed a WHO-approved series along with no extra doses, then recommend a booster dose at earliest/recommended age of 5y w/ recommended interval of 5 months',
    behavior:
      'Dec 2020 WHO-approved completed primary series patients age 5 or older with no extra doses receive a first-booster recommendation at the later of age 5 or 5 months after the primary series before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 18y and < 50y has completed the Moderna Series along with one extra dose, then recommend CONDITIONAL / COMPLETE_HIGH_RISK',
    behavior:
      'Dec 2020 Moderna completed primary series patients age 18 through before 50 with one extra dose receive a conditional COMPLETE_HIGH_RISK recommendation before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 5y and < 50 years has completed the Series along with one extra dose in the Pfizer, Mixed Product or WHO-approved series, then recommend CONDITIONAL / COMPLETE_HIGH_RISK',
    behavior:
      'Dec 2020 Pfizer, mixed, and WHO-approved completed primary series patients age 5 through before 50 with one extra dose receive a conditional COMPLETE_HIGH_RISK recommendation before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 50y has completed the Series along with one extra dose in the Pfizer, Moderna, Mixed Product or WHO-approved series, then recommend a 2nd booster dose at earliest/recommended age of 50y w/ earliest/recommended interval of 4 months',
    behavior:
      'Dec 2020 Pfizer, Moderna, mixed, and WHO-approved completed primary series patients age 50 or older with one extra dose receive a second-booster recommendation at the later of age 50 or 4 months after the latest valid dose before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 18y has completed the Janssen Series and 1 extra dose of a non-mRNA vaccine, then recommend the _2nd_ booster dose at earliest age 18y/recommended age 18y or recommended interval of 4 months, whichever is later',
    behavior:
      'Dec 2020 Janssen completed primary series patients age 18 or older with one non-mRNA extra dose receive a second-booster recommendation at the later of age 18 or 4 months after the latest valid dose before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 18y and < 50y has completed the Janssen Series and 1 extra dose of an mRNA vaccine, then recommend CONDITIONAL / COMPLETE_HIGH_RISK',
    behavior:
      'Dec 2020 Janssen completed primary series patients age 18 through before 50 with one mRNA extra dose receive a conditional COMPLETE_HIGH_RISK recommendation before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient >= 50y has completed the Janssen Series and 1 extra dose of an mRNA vaccine, then recommend the _2nd_ booster dose at earliest age 50y/recommended age 50y or recommended interval of 4 months, whichever is later',
    behavior:
      'Dec 2020 Janssen completed primary series patients age 50 or older with one mRNA extra dose receive a second-booster recommendation at the later of age 50 or 4 months after the latest valid dose before 2022-09-02.',
    testId: 'assertCovid19Dec2020PreSep2022OneExtraDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is < 9/2/2022 and the patient has completed the the Pfizer, Moderna, Mixed Product, Janssen or WHO-approved Series and 2 extra doses has been administered, then recommend NOT_RECOMMENDED / COMPLETE',
    behavior:
      'Dec 2020 Pfizer, Moderna, mixed, Janssen, and WHO-approved completed series with two extra doses before 2022-09-02 return not-recommended COMPLETE.',
    testId: 'assertCovid19Dec2020PreSep2022TwoExtraDoseCompleteRecommendation',
  },
  {
    ruleName:
      'COVID-19: If the execution date is anytime (before, on, or after 9/2/2022), the patient >= 5y and < 12y has completed the Janssen Series, and 0 or 1 one extra dose has been administered, then recommend Not Recommended / COMPLETE_HIGH_RISK',
    behavior:
      'Dec 2020 Janssen completed series patients age 5 through before 12 with zero or one extra dose return not-recommended COMPLETE_HIGH_RISK regardless of 2022-09-02.',
    testId: 'assertCovid19Dec2020JanssenAge5ToUnder12CompleteHighRiskRecommendation',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 12/8/2022 and < 4/19/2023, the patient >= __6 months__, and has completed the __Moderna__ Series along with an additional dose and/or up to 3 extra doses, then recommend a booster dose at earliest/recommended age of 6 month & 12/8/2022 w/ earliest/recommended interval of 8 weeks',
    behavior:
      'Dec 2020 Moderna completed-series patients in the 2022-12-08 through before 2023-04-19 window receive a booster recommendation at the later of age 6 months, 2022-12-08, or 8 weeks after the latest valid dose when no valid extra dose exists on or after 2022-12-08.',
    testId: 'assertCovid19Dec2020BivalentEraRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 10/12/2022 and < 12/8/2022, the patient >= __5y__, and has completed the __Moderna__ Series along with an additional dose and/or up to 3 extra doses, then recommend a booster dose at earliest/recommended age of 5y & 10/12/2022 w/ earliest/recommended interval of 8 weeks',
    behavior:
      'Dec 2020 Moderna completed-series patients age 5 through before 12 in the 2022-10-12 through before 2022-12-08 window receive a booster recommendation at the later of age 5, 2022-10-12, or 8 weeks after the latest valid dose when no valid extra dose exists on or after 2022-10-12.',
    testId: 'assertCovid19Dec2020BivalentEraRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 10/12/2022 and < 4/19/2023, the patient >= __5y__, and has completed the __Pfizer__, __Mixed Product__ or __WHO-approved__ series along with an additional dose and/or up to 3 extra doses, then recommend a booster dose at earliest/recommended age of 5y & 10/12/2022 w/ earliest/recommended interval of 8 weeks',
    behavior:
      'Dec 2020 Pfizer, mixed, and WHO-approved completed-series patients age 5 through before 12 in the 2022-10-12 through before 2023-04-19 window receive a booster recommendation at the later of age 5, 2022-10-12, or 8 weeks after the latest valid dose when no valid extra dose exists on or after 2022-10-12.',
    testId: 'assertCovid19Dec2020BivalentEraRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 9/2/2022 and < 4/19/2023, the patient >= __12y__ and has completed the __Pfizer__, __Mixed Product__, __Moderna__, __Novavax__, __Janssen__ or __WHO-approved__ Series  with an additional dose and/or up to 3 extra doses, then recommend a booster dose at earliest/recommended age of 5y & 9/2/2022 w/ earliest/recommended interval of 8 weeks',
    behavior:
      'Dec 2020 completed-series patients age 12 or older in the 2022-09-02 through before 2023-04-19 window receive a booster recommendation at the later of age 12, 2022-09-02, or 8 weeks after the latest valid dose when no valid extra dose exists on or after 2022-09-02.',
    testId: 'assertCovid19Dec2020BivalentEraRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a prior booster dose was administered >= 12/8/2022 when the patient is >= __6 months__ of age in the __Moderna__ Series, the execution date is < 4/19/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 Moderna completed-series patients with a valid extra dose on or after 2022-12-08 at age 6 months or older return not-recommended COMPLETE before 2023-04-19.',
    testId: 'assertCovid19Dec2020BivalentEraCompletionRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a prior booster dose was administered >= 10/12/2022 when the patient is >= __5 yrs__ in the __Pfizer__ Series, and the execution date is < 3/17/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 Pfizer completed-series patients with a valid extra dose on or after 2022-10-12 at age 5 or older return not-recommended COMPLETE before 2023-03-17.',
    testId: 'assertCovid19Dec2020BivalentEraCompletionRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a prior booster dose was administered >= 10/12/2022 when the patient is >= __5 yrs__ in the __Mixed Product__, __Moderna__ or __WHO-approved__ series and the execution date is < 4/19/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 mixed, Moderna, and WHO-approved completed-series patients with a valid extra dose on or after 2022-10-12 at age 5 or older return not-recommended COMPLETE before 2023-04-19.',
    testId: 'assertCovid19Dec2020BivalentEraCompletionRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a prior booster dose was administered >= 9/2/2022 when the patient is >= 12 yrs of age in the __Pfizer__ Series, and the execution date is < 3/17/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 Pfizer completed-series patients with a valid extra dose on or after 2022-09-02 at age 12 or older return not-recommended COMPLETE before 2023-03-17.',
    testId: 'assertCovid19Dec2020BivalentEraCompletionRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a prior booster dose was administered >= 9/2/2022 in the __Mixed Product__, __Moderna__, Novavax, Janssen or WHO-approved Series when the patient is >= __12 yrs__ of age and the execution date is < 4/19/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 mixed, Moderna, Novavax, Janssen, and WHO-approved completed-series patients with a valid extra dose on or after 2022-09-02 at age 12 or older return not-recommended COMPLETE before 2023-04-19.',
    testId: 'assertCovid19Dec2020BivalentEraCompletionRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 4/19/2023, patient is >= 65 yrs of age and has had 2 or more prior doses with a bivalent vaccine or 2 or more doses at >= 4/19/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 completed-series patients age 65 or older with two or more valid bivalent/current-era post-completion doses return not-recommended COMPLETE on or after 2023-04-19.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 4/19/2023, patient is >= 65 yrs of age, and has had 1 prior dose with a bivalent vaccine or 1 prior dose at >= 4/19/2023 in the Moderna series, recommend Not Recommended / COMPLETE_HIGH_RISK',
    behavior:
      'Dec 2020 completed-series patients age 65 or older with one valid bivalent/current-era post-completion dose return not-recommended COMPLETE_HIGH_RISK on or after 2023-04-19.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 4/19/2023, patient is < 65 years of age and has had at least 1 prior dose with a bivalent vaccine or at least 1 dose administered at >= 4/19/2023, recommend Not Recommended / COMPLETE',
    behavior:
      'Dec 2020 completed-series patients younger than 65 with at least one valid bivalent/current-era post-completion dose return not-recommended COMPLETE on or after 2023-04-19.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 4/19/2023 for the Mixed Product, Moderna, Janssen or Novavax COVID-19 series, the patient has not had any bivalent doses or any doses administered at >= 4/19/2023, recommend a bivalent vaccine at age 6 months and recommended interval of 8 weeks along with recommendation reason ADMINISTER_COVID19_BIVALENT_VACCINE',
    behavior:
      'Dec 2020 mixed, Moderna, Janssen, and Novavax completed-series patients with no bivalent/current-era post-completion dose receive an updated bivalent recommendation at the later of age 6 months, 2023-04-19, or 8 weeks after the latest valid dose.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the execution date is >= 4/19/2023 for the Pfizer COVID-19 series, the patient is >= 5 yrs of age, and has not had any bivalent doses or any doses administered at >= 4/19/2023, recommend a bivalent vaccine at age 6 months and recommended interval of 8 weeks along with recommendation reason ADMINISTER_COVID19_BIVALENT_VACCINE',
    behavior:
      'Dec 2020 Pfizer completed-series patients age 5 or older with no bivalent/current-era post-completion dose receive an updated bivalent recommendation at the later of age 6 months, 2022-09-02, or 8 weeks after the latest valid dose.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the child < 5 years of age completes the Pfizer series, the execution date is >= 3/17/2023, and neither a bivalent vaccine dose has been administered nor a dose administered >= 4/19/2023, recommend at the vaccine group level with recommended interval of 8 weeks or on 3/17/2023, whichever is latest, along with recommended reason ADMINISTER_COVID19_BIVALENT_VACCINE',
    behavior:
      'Dec 2020 Pfizer completed-series patients younger than 5 with no bivalent/current-era dose receive an updated bivalent recommendation at the later of age 6 months, 2023-03-17, or 8 weeks after the latest valid dose.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a dose is recommended in the Pfizer series for patient < 5 years and the execution date is >= 3/17/2023, add the recommendation reason ADMINISTER_COVID19_BIVALENT_VACCINE',
    behavior:
      'Dec 2020 Pfizer completed-series patients younger than 5 on or after 2023-03-17 receive ADMINISTER_COVID19_BIVALENT_VACCINE when a post-completion bivalent dose is recommended.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a dose is recommended in the Pfizer series for patient >= 5 years and the execution date is >= 3/17/2023 and < 4/19/2023, add the recommendation reason BOOSTER_DOSE',
    behavior:
      'Dec 2020 Pfizer completed-series patients age 5 or older in the 2023-03-17 through before 2023-04-19 window receive BOOSTER_DOSE when a booster dose is recommended.',
    testId: 'assertCovid19Dec2020BivalentEraRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a dose is recommended in the Pfizer, Mixed Product, Moderna, Janssen or Novavax series and the execution date is >= 4/19/2023, add the recommendation reason ADMINISTER_COVID19_BIVALENT_VACCINE',
    behavior:
      'Dec 2020 Pfizer, mixed, Moderna, Janssen, and Novavax completed-series patients on or after 2023-04-19 receive ADMINISTER_COVID19_BIVALENT_VACCINE when a post-completion bivalent dose is recommended.',
    testId: 'assertCovid19Dec2020PostApr2023BivalentRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a dose is recommended in the Pfizer series, the series is complete and the execution date is < 3/17/2023, add the recommendation reason BOOSTER_DOSE',
    behavior:
      'Dec 2020 Pfizer completed-series patients before 2023-03-17 receive BOOSTER_DOSE when a booster dose is recommended.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If a dose is recommended in the Moderna, Mixed Product, Janssen, Novavax or FDA-authorized/WHO series, the series is complete and the execution date is < 4/19/2023, add the recommendation reason BOOSTER_DOSE',
    behavior:
      'Dec 2020 Moderna, mixed, Janssen, Novavax, and WHO-approved completed-series patients before 2023-04-19 receive BOOSTER_DOSE when a booster dose is recommended.',
    testId: 'assertCovid19Dec2020PreSep2022FirstBoosterRecommendations',
  },
  {
    ruleName:
      'COVID-19: If Pfizer, Moderna, Mixed Product, Janssen or FDA-authorized/WHO Series is complete and a dose is NOT_RECOMMENDED (i.e. - 2 or more doses for Janseen; 3 or more doses for Pfizer/Moderna), add the recommendation reason to COMPLETE',
    behavior:
      'Dec 2020 completed-series patients with no recommended next dose return not-recommended COMPLETE unless a specific high-risk completion reason applies.',
    testId: 'assertCovid19Dec2020PreSep2022TwoExtraDoseCompleteRecommendation',
  },
  {
    ruleName:
      "COVID-19: If the patient has no doses on record and is >= 6 months, recommend on today's date",
    behavior:
      'Dec 2020 COVID-19 patients with no COVID-19 doses and age at least 6 months receive a due recommendation on the evaluation date.',
    testId: 'assertCovid19Dec2020NoDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the patient has no doses on record and is < 6 months old, recommend at 6 months of age',
    behavior:
      'Dec 2020 COVID-19 patients with no COVID-19 doses and age under 6 months receive a due recommendation dated at age 6 months.',
    testId: 'assertCovid19Dec2020NoDoseRecommendations',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna < 5yrs Series): If the next recommended dose is at > 6m and < 12y of age, recommend Moderna 6m-11y (CVX 311) at the vaccine level',
    behavior:
      'Sep 2023 Moderna child-series recommendations before age 12 include CVX 311 as the recommended vaccine.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna < 5yrs Series): If the next recommended dose is at >= 12y of age, recommend Moderna 12y (CVX 312) at the vaccine level',
    behavior:
      'Sep 2023 Moderna child-series recommendations at age 12 or older include CVX 312 as the recommended vaccine.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If the next recommended dose is at >= 6m and < 5y of age, recommend Pfizer 6m-5y (CVX 308) at the vaccine level',
    behavior:
      'Sep 2023 Pfizer child-series recommendations before age 5 include CVX 308 as the recommended vaccine.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If the next recommended dose is at >= 5y and < 12y of age, recommend Pfizer 5-11y (CVX 310) at the vaccine level',
    behavior:
      'Sep 2023 Pfizer child-series recommendations from age 5 through before 12 include CVX 310 as the recommended vaccine.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If the next recommended dose is at >= 12y of age, recommend Pfizer 12y+ (CVX 309) at the vaccine level',
    behavior:
      'Sep 2023 Pfizer child-series recommendations at age 12 or older include CVX 309 as the recommended vaccine.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): If the patient is >= 5 years as of the recommended date or the evaluation date, and either the recommendation date or the evaluation date is >= 8 weeks from the last administered COVID-19 shot, recommend at the vaccine group level',
    behavior:
      'Sep 2023 age-5-or-older series recommendations are emitted at vaccine-group level without a product-specific recommended vaccine.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): If there are no shots administered, set the earliest age to the latter of age 6 months or the current season start date (*earliestAgeCheck*)',
    behavior:
      'Sep 2023 no-dose recommendations use the existing next-dose forecast date, which is no earlier than age 6 months and the season start.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): If there are no shots administered, set the latest recommended age to the latter of age 6 months or the current season start date (*latestRecommendedAgeCheck*)',
    behavior:
      'Sep 2023 no-dose recommendation dates use the existing next-dose forecast recommendation date, which is no earlier than age 6 months and the season start.',
    testId: 'assertCovid19Sep2023RecommendationProducts',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): If a prior formulation that does not count towards U.S. vaccination is administered on or after 9/12/2023 (for any Sept 2023 onward COVID-19 Series), recommend earliest & recommended interval of 8 weeks to the next dose',
    behavior:
      'Sep 2023 recommendation intervals after non-counting prior COVID-19 shots are based on the custom prior-shot interval rather than routine table ages.',
    testId: 'assertCovid19Sep2023NonCountingPriorAt8WeeksMinus4DaysValid',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024): For the 2023-2024 season, the minimum interval and recommended interval from invalid shot prior to 9/12/2023 are 8w (*earliestIntevalCheck*)',
    behavior:
      'Sep 2023 recommendations with only a prior-season COVID-19 shot use an 8-week interval from the prior shot for earliest and recommended dates.',
    testId: 'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs): For the 2023-2024 season, the minimum interval and recommended interval from dose 1 to dose 2 are, respectively, to 4m and 4m (*earliestIntevalCheck*)',
    behavior:
      'Sep 2023 age-5-or-older series dose-2 recommendations use a 4-month interval from dose 1 for earliest and recommended dates.',
    testId: 'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs): The recommended age of dose 2 is the latter of age 65 years or 2/28/2024 (*recommendationAgeCheck*)',
    behavior:
      'Sep 2023 age-5-or-older target dose 2 forecast dates are no earlier than age 65 years and 2024-02-28.',
    testId: 'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs): If there are no shots administered, set the earliest age to the latter of age 65 years or 2/28/2024 (*earliestAgeCheck*)',
    behavior:
      'Sep 2023 age-5-or-older target dose 2 earliest dates are no earlier than age 65 years and 2024-02-28.',
    testId: 'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5ys): If the recommendation date for dose 2 is >= 1 year from the evaluation date, recommendation is NOT_RECOMMENDED / COMPLETE',
    behavior:
      'Sep 2023 age-5-or-older target dose 2 recommendations at least one year after evaluation are converted to NOT_RECOMMENDED with COMPLETE reason.',
    testId: 'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs): If the patient has >= 1 COVID-19 shot(s) on record prior to dose 1, the recommended earliest & recommended interval is 8w from target dose 1 to the next target dose IF none of the exceptions apply (*earliestIntervalCheck*)',
    behavior:
      'Sep 2023 age-5-or-older series dose-1 recommendations with prior COVID-19 history use an 8-week interval from the latest prior-season COVID-19 shot when no exception applies.',
    testId: 'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs): If 8 weeks from the last administered shot elapsed prior to the patient turning 5 years of age, set earliest and recommended age for target dose 1 to the season start date (*earliestAgeCheck*)',
    behavior:
      'Sep 2023 age-5-or-older series dose-1 recommendations use the later of the prior-shot interval, age 5, and season start.',
    testId: 'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs): If there are no shots in the current season but there are shots in the prior season, set the earlest and recommended age date to the latter of age 6 months or the season start date (*earliestAgeCheck*)',
    behavior:
      'Sep 2023 age-5-or-older forecasts with only prior-season COVID-19 shots set recommendation dates from the prior-season interval while respecting season and age gates.',
    testId: 'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1/Exception 2: activation-group extension => If a shot of CVX 313 was previously administered for target dose 1 and evaluated as Accepted / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE, and there are no prior doses on record, the earliest interval from that shot to target dose 1 is 28 days',
    behavior:
      'Sep 2023 age-5-through-under-12 CVX313 accepted dose-1 exceptions forecast the next target dose 1 attempt 28 days after that accepted CVX313.',
    testId: 'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1/Exception 2: If the patient is < 12y as of the evaluation date and the recommended due date, and the most recent shot was COVID19_INVALID_CVX_313_SEPT2023GTE5SERIES_OTHERWISE_WOULD_BE_CONSIDERED_VALID_FOR_TARGET_DOSE_1, return recommended reason code ADMINISTER_mRNA_VACCINE',
    behavior:
      'Sep 2023 age-5-through-under-12 CVX313 accepted dose-1 exceptions recommend ADMINISTER_mRNA_VACCINE for the next target dose 1 attempt.',
    testId: 'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1/Exception 3: There are no other shots administered after the CVX 211; _also_ override default earliestIntervalCheck',
    behavior:
      'Sep 2023 pre-2023-10-04 CVX211 accepted exceptions forecast the next target dose 1 attempt 28 days after that accepted CVX211.',
    testId: 'assertCovid19Sep2023Cvx211AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Pfizer__ < 5yrs Series): if the patient has 1 dose of a prior or current Pfizer vaccine formulation administered prior to the season start date at < 5yrs of age, set the recommendation dose number to 2',
    behavior:
      'Sep 2023 Pfizer under-5 forecasts with one qualifying Pfizer-family prior-season dose skip target dose 1, recommend target dose 2, and date it from the prior-season interval.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Pfizer__ < 5yrs Series): if the patient has >= 2 doses of a prior or current Pfizer formulation administered prior to the season start date at < 5yrs of age, set the recommendation dose number to 3',
    behavior:
      'Sep 2023 Pfizer under-5 forecasts with two or more qualifying Pfizer-family prior-season doses skip to target dose 3 and date it from the latest prior-season dose interval.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Mixed Product__ < 5yrs Series): if the patient has 1 dose of a prior or current (any) formulation administered prior to the season start date at < 5yrs of age, set the recommendation dose number to 2',
    behavior:
      'Sep 2023 mixed-product under-5 forecasts with one qualifying prior-season COVID-19 dose skip target dose 1, recommend target dose 2, and date it from the prior-season interval.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Mixed Product__ < 5yrs Series): if the patient has >= 2 doses of a prior (any) formulation administered prior to the season start date at < 5yrs of age, set the recommendation dose number to 3',
    behavior:
      'Sep 2023 mixed-product under-5 forecasts with two or more qualifying prior-season COVID-19 doses skip to target dose 3 and date it from the latest prior-season dose interval.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Moderna__ < 5yrs Series): if the patient has >= 1 doses of a priori Moderna formulation administered prior to the season start date at < 5yrs of age, set the recommendation dose number to 2',
    behavior:
      'Sep 2023 Moderna under-5 forecasts with qualifying Moderna-family prior-season doses skip target dose 1, recommend target dose 2, and date it from the prior-season interval.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer/Moderna/Mixed Product < 5yrs Series): For target dose 1 of the current series\' season: no shots have been administered in the current season but there have been shots administered in a prior season. Enforce the earliest/recommended recommendation interval for the current series dose from the most recent shot in the prior season',
    behavior:
      'Sep 2023 under-5 forecasts with no current-season COVID-19 shots but prior-season COVID-19 history use an 8-week interval from the latest prior-season shot for earliest and recommended dates.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer/Moderna/Mixed Product < 5yrs Series): For target dose > 1: If no shots have been administered in the current season. Enforce the earliest/recommended recommendation interval for the current series dose from the most recent shot in a previous season',
    behavior:
      'Sep 2023 under-5 skipped target-dose forecasts with no current-season COVID-19 shots use an 8-week interval from the latest prior-season shot for earliest and recommended dates.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Moderna__ < 5yrs Series): For target dose > 1: If 2 or more doses of the prior Moderna vaccine formulation were administered in the prior season, earliest/recommended interval to the next dose is 8 weeks',
    behavior:
      'Sep 2023 Moderna under-5 skipped target-dose forecasts use an 8-week interval from the latest prior Moderna-family season dose.',
    testId: 'assertCovid19Sep2023Lt5PriorSeasonDosesSkipTargetDose',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a prior formulation COVID-19 vaccine (excluding non-US vaccines that do not count towards US vaccination) or a non-Pfizer updated seasonal COVID-19 vaccine is administered as target dose 1 or target dose 2, the minimum/recommended interval to the next dose is 28 days(*earliestIntervalCheck*)',
    behavior:
      'Sep 2023 Pfizer under-5 retry recommendations after a non-Pfizer or prior-formulation current-season attempt use a 28-day interval.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the minimum/recommended interval from that shot to the next shot is 28 days (*earliestIntervalCheck*)',
    behavior:
      'Sep 2023 Pfizer under-5 retry recommendations after an invalid below-minimum-age current-season attempt use a 28-day interval.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Moderna < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the minimum/recommended interval from that shot to the next shot is 28 days (*earliestIntervalCheck*)',
    behavior:
      'Sep 2023 Moderna under-5 retry recommendations after an invalid below-minimum-age current-season attempt use a 28-day interval.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the minimum/recommended interval from that shot to the next shot is 28 days (*earliestIntervalCheck*)',
    behavior:
      'Sep 2023 mixed-product under-5 retry recommendations after an invalid below-minimum-age current-season attempt use a 28-day interval.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5yrs Series): If the most recent shot administered was a Novavax (CVX 313) to a patient age >= 6m-4d and < 5 yrs and the series is not complete, return recommended reason code ADMINISTER_mRNA_VACCINE',
    behavior:
      'Sep 2023 mixed-product under-5 forecasts after a Novavax CVX313 attempt before age 5 recommend ADMINISTER_mRNA_VACCINE.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Pfizer/Moderna/Mixed Product < 5yrs): For target dose 1 of the current series\' season: shot(s) have been administered in the current season and there are also shots in a prior season but none of them are (valid) doses. Recommend earliest/recommended/overdue interval of 8w from the most recent shot in the previous season',
    behavior:
      'Sep 2023 under-5 forecasts with current-season attempts, prior-season COVID-19 history, and no valid in-season doses use an 8-week interval from the latest prior-season shot.',
    testId: 'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): For the 2023-2024 season, the minimum interval and recommended interval from dose 3 to dose 4 are, respectively, to 4m and 4m (*earliestIntevalCheck*)',
    behavior:
      'Sep 2023 Novavax target dose 4 recommendations use a 4-month interval from the latest valid prior dose.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): For the 2023-2024 season, the minimum interval and recommended interval from dose 3 to dose 4 are, respectively, to 4m and 4m (*recommendationIntervalCheck*)',
    behavior:
      'Sep 2023 Novavax target dose 4 recommendations use a 4-month interval from the latest valid prior dose.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series):activation-group extension => If a CVX 313 is administered as (valid) dose 1 to a patient >= 5 yrs and < 12 yrs, recommend earliest/recommended interval of 4 weeks from dose 1',
    behavior:
      'Sep 2023 Novavax CVX313 dose 1 administered at age 5 through under 12y-4d forecasts dose 2 at a 4-week interval.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If a CVX 313 is administered as (valid) dose 1 to a patient >= 5 yrs and < 12 yrs-4 days, recommend earliest/recommended interval of 4 weeks from dose 1',
    behavior:
      'Sep 2023 Novavax CVX313 dose 1 administered at age 5 through under 12y-4d forecasts dose 2 at a 4-week interval.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If the patient is < 12 years as of the evaluation date and is < 12 years at the recommended due date), return recommended reason code ADMINISTER_mRNA_VACCINE.',
    behavior:
      'Sep 2023 Novavax recommendations for patients under age 12 at evaluation and recommendation date use ADMINISTER_mRNA_VACCINE.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): For target dose 4, the earliest & recommended date is the latter of the calculated forecast date or 2/28/2024',
    behavior:
      'Sep 2023 Novavax target dose 4 forecast dates are no earlier than 2024-02-28.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 Novavax Series): If the recommendation date for dose 4 is >= 1 year from the evaluation date, recommendation is NOT_RECOMMENDED / COMPLETE',
    behavior:
      'Sep 2023 Novavax target dose 4 recommendations at least one year after evaluation are converted to NOT_RECOMMENDED with COMPLETE reason.',
    testId: 'assertCovid19Sep2023NovavaxIntervals',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 __Novavax__ Series): If CVX 313 was administered for dose 1 or dose 2, dose 3 is not needed. Skip to target dose 4',
    behavior:
      'Sep 2023 Novavax forecasts skip target dose 3 and forecast target dose 4 when CVX313 was administered for dose 1 or 2.',
    testId: 'assertCovid19Sep2023NovavaxCvx313SkipsDose3',
  },
  {
    ruleName:
      'COVID-19: If dose 1 was administered at >= 6 yrs of age and and the execution date >= 4/19/2023, override default earliest interval and recommend earliest interval of 8 weeks',
    behavior:
      'Dec 2020 Moderna incomplete-series patients whose latest valid dose was administered at age 6 or older and evaluated on or after 2023-04-19 receive an 8-week earliest recommendation interval.',
    testId: 'assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations',
  },
  {
    ruleName:
      'COVID-19: If dose 1 was administered at >= 6 yrs of age and and the execution date >= 4/19/2023, override default recommended interval and recommend recommended interval of 8 weeks',
    behavior:
      'Dec 2020 Moderna incomplete-series patients whose latest valid dose was administered at age 6 or older and evaluated on or after 2023-04-19 receive an 8-week recommended interval.',
    testId: 'assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations',
  },
  {
    ruleName:
      'COVID-19: If dose 1 was administered at >= 5 yrs of age and and the execution date >= 4/19/2023, override default earliest interval and recommend earliest interval of 8 weeks',
    behavior:
      'Dec 2020 Pfizer and mixed incomplete-series patients whose latest valid dose was administered at age 5 or older and evaluated on or after 2023-04-19 receive an 8-week earliest recommendation interval.',
    testId: 'assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations',
  },
  {
    ruleName:
      'COVID-19: If dose 1 was administered at >= 5 yrs of age and and the execution date >= 4/19/2023, override default recommended interval and recommend recommended interval of 8 weeks',
    behavior:
      'Dec 2020 Pfizer and mixed incomplete-series patients whose latest valid dose was administered at age 5 or older and evaluated on or after 2023-04-19 receive an 8-week recommended interval.',
    testId: 'assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations',
  },
  {
    ruleName:
      'COVID-19: If the series is complete, override allowable vaccine check, as the allowable vaccines for additional and booster doses are verified by each rule',
    behavior:
      'COVID-19 Dec 2020 completed-series histories route unused COVID-19 shots through post-completion additional/booster eligibility checks instead of primary-series allowable-vaccine gates.',
    testId: 'assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date is < 9/2/2022 and at >= 5 yrs and < 18 yrs of age for an Additional Dose is administered in the __Moderna Series__, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 Moderna completed-series patients age 5 through before 18 may have one pre-2022-09-02 additional dose recorded as valid.',
    testId: 'assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date is < 9/2/2022 and at >= 18 yrs and < 50 yrs of age for an Additional Dose and/or 1st Booster Dose is administered in the __Moderna Series__, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 Moderna completed-series patients age 18 through before 50 may have up to two pre-2022-09-02 post-completion doses recorded as valid.',
    testId: 'assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date < 9/2/2022 and at >= 5 yrs and < 50 yrs of age for an Additional Dose and/or 1st Booster Dose in the __Pfizer, Mixed Product, Janssen or Series not authorized by the FDA but authorized by the WHO__, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 Pfizer, mixed, Janssen, Novavax, and WHO-authorized completed-series patients age 5 through before 50 may have up to two pre-2022-09-02 post-completion doses recorded as valid.',
    testId: 'assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date is < 9/2/2022 and at >= 50 yrs of age for an Additional Dose, 1st Booster Dose or 2nd Booster Dose in the __Pfizer, Moderna, Mixed Product, Janssen, Novavax or Series not authorized by the FDA but authorized by the WHO__, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 completed-series patients age 50 or older may have up to three pre-2022-09-02 post-completion doses recorded as valid.',
    testId: 'assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date >= 9/2/2022 and at >= 5 yrs of age and an Additional (monovalent) Dose is administered in the __Pfizer, Moderna, Mixed Product, Janssen or Series not authorized by the FDA but authorized by the WHO__, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 completed-series patients age 5 or older may have one monovalent post-completion dose on or after 2022-09-02 recorded as valid.',
    testId: 'assertCovid19Dec2020PostBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date is >= 9/2/2022 at >= 12 yr of age and have had an Additional Dose and/or 3 Booster Doses is administered in the __Pfizer, Moderna, Mixed Product, Janssen, Novavax or WHO-approved Series__, with not more than 1 booster after 9/2/2022, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 completed-series patients age 12 or older may have one post-2022-09-02 booster before 2023-04-19 recorded as valid.',
    testId: 'assertCovid19Dec2020PostBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date is >= 10/12/2022 at >= 5 yr of age and have had an Additional Dose and/or 3 Booster Doses is administered in the __Pfizer, Moderna, Mixed Product, Janssen, Novavax or WHO-approved Series__, with not more than 1 booster after 9/2/2022, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 completed-series patients age 5 or older may have one post-2022-10-12 booster before 2023-04-19 recorded as valid.',
    testId: 'assertCovid19Dec2020PostBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: If the shot administration date is >= 12/8/2022 at >= 6 months of age and have had an Additional Dose and/or 3 Booster Doses is administered in the __Moderna Series__, with not more than 1 booster after 9/2/2022, the shot is permitted',
    behavior:
      'COVID-19 Dec 2020 Moderna completed-series patients age 6 months or older may have one post-2022-12-08 booster before 2023-04-19 recorded as valid.',
    testId: 'assertCovid19Dec2020PostBivalentAdditionalBoosterPermissions',
  },
  {
    ruleName:
      'COVID-19: Supplemental Text- If an additional and/or 1st booster dose is administered < 4/19/2023 to an already completed __Janssen Series or Novavax Series__ < 8 weeks after prior dose, include supplemental text that follows guidelines regarding minimum ages/intervals',
    behavior:
      'COVID-19 Dec 2020 Janssen and Novavax first post-completion doses before 2023-04-19 carry COVID19_MIN_INTERVAL_8W_1ST_BOOSTER supplemental text when less than 8 weeks after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020PostCompletionIntervalSupplementalText',
  },
  {
    ruleName:
      'COVID-19: Supplemental Text- If the shot administration date is < 9/2/2022 and an additional dose and/or 1st booster dose is administered to an already completed __Pfizer, Mixed Product, Moderna or WHO  Series__ < 5 months, include supplemental text that follow guidelines regarding minimum ages/intervals',
    behavior:
      'COVID-19 Dec 2020 Pfizer, Moderna, mixed, and WHO-series first post-completion doses before 2022-09-02 carry COVID19_MIN_INTERVAL_5M_1ST_BOOSTER supplemental text when less than 5 months after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020PostCompletionIntervalSupplementalText',
  },
  {
    ruleName:
      'COVID-19: Supplemental Text- If the shot administration date is >= 9/2/2022 & < 4/19/2023 and that additional dose and/or 1st booster dose was administered to an already completed __Pfizer, Mixed Product, Moderna or WHO  Series__ < 8 weeks, include supplemental text that follow guidelines regarding minimum ages/intervals',
    behavior:
      'COVID-19 Dec 2020 first post-completion doses from 2022-09-02 through before 2023-04-19 carry COVID19_MIN_INTERVAL_8W_1ST_BOOSTER supplemental text when less than 8 weeks after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020PostCompletionIntervalSupplementalText',
  },
  {
    ruleName:
      'COVID-19: Supplemental Text- If the shot administration date is < 9/2/2022 and that 2nd booster dose was administered to an already completed __Pfizer, Moderna, Mixed Product, Janssen or WHO  Series__ < 4 months, include supplemental text that follow guidelines regarding minimum ages/intervals',
    behavior:
      'COVID-19 Dec 2020 second post-completion doses before 2022-09-02 carry COVID19_MIN_INTERVAL_4M_2ND_BOOSTER supplemental text when less than 4 months after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020PostCompletionIntervalSupplementalText',
  },
  {
    ruleName:
      'COVID-19: Supplemental Text- If the shot administration date is >= 9/2/2022 & < 4/19/2023 and that 2nd booster dose was administered to an already completed __Pfizer, Moderna, Mixed Product, Janssen or WHO  Series__ < 8 weeks, include supplemental text that follow guidelines regarding minimum ages/intervals',
    behavior:
      'COVID-19 Dec 2020 second post-completion doses from 2022-09-02 through before 2023-04-19 carry COVID19_MIN_INTERVAL_8W_2ND_BOOSTER supplemental text when less than 8 weeks after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020PostCompletionIntervalSupplementalText',
  },
  {
    ruleName:
      'COVID-19: If the 3rd booster dose is administered >= 9/2/2022 & < 4/19/2023 to an already completed __Pfizer, Moderna, Mixed Product, Janssen or WHO  Series__ < 8 weeks - 4 days, evaluate the shot as Invalid / BELOW_MINIMUM_INTERVAL',
    behavior:
      'COVID-19 Dec 2020 third or fourth post-completion booster attempts from 2022-09-02 through before 2023-04-19 are invalid with BELOW_MINIMUM_INTERVAL when less than 8 weeks minus 4 days after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals',
  },
  {
    ruleName:
      'COVID-19: If the first bivalent dose on >= 3/17/2023 after series completion was administered < 8 weeks from the prior COVID-19 shot, include supplemental text regarding an 8 week minimum interval',
    behavior:
      'COVID-19 Dec 2020 Pfizer first bivalent post-completion dose on or after 2023-03-17 carries COVID19_MIN_INTERVAL_8W supplemental text when less than 8 weeks after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals',
  },
  {
    ruleName:
      'COVID-19: If the first bivalent dose on >= 4/19/2023 after series completion was administered < 8 weeks from the prior COVID-19 shot, include supplemental text regarding an 8 week minimum interval',
    behavior:
      'COVID-19 Dec 2020 non-Pfizer first bivalent post-completion dose on or after 2023-04-19 carries COVID19_MIN_INTERVAL_8W supplemental text when less than 8 weeks after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals',
  },
  {
    ruleName:
      'COVID-19: If a shot was administered to a patient >= 65 yrs of age, and if 1 bivalent dose was previously administered or, alternatively, 1 was prior dose was administered on >= 4/19/2023, evaluate the shot as Valid',
    behavior:
      'COVID-19 Dec 2020 patients age 65 or older may receive a second valid current-era dose on or after 2023-04-19 when exactly one prior bivalent/current-era post-completion dose exists.',
    testId: 'assertCovid19Dec2020Age65SecondBivalentValidAndIntervalSupplemental',
  },
  {
    ruleName:
      'COVID-19: If a 2nd bivalent dose was administered to a patient >= 65 yrs of age at < 4 months from the previous shot, include supplemental text regarding a 4 month minimum intervals',
    behavior:
      'COVID-19 Dec 2020 age-65 second bivalent/current-era valid doses on or after 2023-04-19 carry COVID19_MIN_INTERVAL_4M supplemental text when less than 4 months after the prior valid COVID-19 dose.',
    testId: 'assertCovid19Dec2020Age65SecondBivalentValidAndIntervalSupplemental',
  },
  ...[
    'COVID-19: If the patient received a (valid) dose of _any_ vaccine allowed in the Pfizer series at >= 5 years of age on >= 4/19/2023 and the series is not complete, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose of an _applicable_ _bivalent_ vaccine (CVX 300, CVX 301) in the Pfizer series at >= 5 years of age and the series is not complete, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose _any_ vaccine allowed in the Moderna series at >= 6 years of age on >= 4/19/2023 and the series is not complete, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose of an _applicable_ _bivalent_ vaccine (CVX 229) in the Moderna series at >= 6 years of age, the series is not complete, and the execution date is >= 4/19/2023, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose of _any_ vaccine allowed in the Mixed Product series (excluding Novavax) at >= 5 years of age, the series is not complete, and the shot was administered >= 4/19/2023, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose of an _applicable_ Pfizer _bivalent_ vaccine (CVX 300, CVX 301) in the Mixed Product series at >= 5 years of age, the series is not complete, and the execution date is >= 4/19/2023, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose of _any_ Moderna vaccine allowed in the Mixed Product primary series at >= 6 years of age, the series is not complete, and the shot was administered >= 4/19/2023, mark the series is complete',
    'COVID-19: If the patient received a (valid) dose of an _applicable_ Moderna _bivalent_ vaccine (CVX 229) in the Mixed Product primary series at >= 6 years of age, the series is not complete, and the execution date is >= 4/19/2023, mark the series is complete',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'COVID-19 Dec 2020 incomplete Pfizer, Moderna, and Mixed Product series are treated as complete when a qualifying valid current-era or bivalent dose is present at the required age threshold on or after the April 2023 policy date.',
    testId: 'assertCovid19Dec2020PostApr2023IncompleteSeriesCompletion',
  })),
  ...[
    'COVID-19: If 2 or more doses were administered >= 5 years of age in the Pfizer or Mixed Product series, then the 3rd dose is not required and the series is complete',
    'COVID-19: If 2 doses of CVX 208, CVX 217, CVX 218, CVX 300 or CVX 301 were previously administered in the Pfizer Series or Mixed Product Series and the series is not complete, target dose 3 is not needed and the series is complete',
    'COVID-19: If 2 doses of CVX 207, CVX 221, CVX 227, CVX 228, or CVX 229 were previously administered in the Mixed Product Series and the series is not complete, target dose 3 is not needed and the series is complete',
    'COVID-19: If 2 or more doses of CVX 211 (Novavax) were administered in the Mixed Product series, then the 3rd dose is not required and the series is complete',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'COVID-19 Dec 2020 incomplete Pfizer and Mixed Product primary series are treated as complete after qualifying two-dose age/product patterns, so target dose 3 is not needed.',
    testId: 'assertCovid19Dec2020TwoDoseIncompleteSeriesCompletion',
  })),
  {
    ruleName:
      'COVID-19: If CVX 212 is administered below the age of 18y-4d in the Janssen Series, override absolute vaccine minimum age check _and_ return supplemental text that the shot does not follow guidelines for minimum age',
    behavior:
      'COVID-19 Dec 2020 Janssen CVX 212 administered below 18y-4d removes the absolute minimum-age invalid reason and returns COVID19_MIN_AGE supplemental text.',
    testId: 'assertCovid19Dec2020MinimumAgeOverrides',
  },
  {
    ruleName:
      'COVID-19: If a shot administered below the age of 6 months, override absolute vaccine minimum age check _and_ return supplemental text that the shot does not follow guidelines for minimum age',
    behavior:
      'COVID-19 Dec 2020 shots administered below age 6 months remove the absolute minimum-age invalid reason and return COVID19_MIN_AGE supplemental text.',
    testId: 'assertCovid19Dec2020MinimumAgeOverrides',
  },
  {
    ruleName:
      'COVID-19: For patients >= 18 yrs of age, if shot in the Pfizer, Mixed Product or Moderna series is administered prior to 10/25/2021 and the series is not complete, override series interval logic',
    behavior:
      'COVID-19 Dec 2020 Pfizer, Moderna, and Mixed Product adult primary-series doses before 2021-10-25 bypass the default absolute minimum interval to the immediately prior dose.',
    testId: 'assertCovid19Dec2020CustomIntervalOverrides',
  },
  {
    ruleName:
      'COVID-19: If a shot is administered in the Moderna series >= 4/19/2023 and dose 1 was administered at >= 6 years of age, the absolute minimum interval between dose 1 and dose 2 is 8 weeks- 4 days',
    behavior:
      'COVID-19 Dec 2020 Moderna dose 2 on or after 2023-04-19 requires an 8-week minus 4-day absolute minimum interval when dose 1 was administered at age 6 years or older.',
    testId: 'assertCovid19Dec2020CustomIntervalOverrides',
  },
  {
    ruleName:
      'COVID-19: If a shot is administered in the Pfizer or Mixed Product series >= 4/19/2023 and dose 1 was administered at >= 5 years of age, the absolute minimum interval between dose 1 and dose 2 is 8 weeks- 4 days',
    behavior:
      'COVID-19 Dec 2020 Pfizer and Mixed Product dose 2 on or after 2023-04-19 require an 8-week minus 4-day absolute minimum interval when dose 1 was administered at age 5 years or older.',
    testId: 'assertCovid19Dec2020CustomIntervalOverrides',
  },
  {
    ruleName:
      'COVID-19: If CVX 302 is administered for target dose 3 in the Pfizer series, there is no absolute maximum age for the vaccine',
    behavior:
      'COVID-19 Dec 2020 Pfizer CVX302 targeting dose 3 is not invalidated by a vaccine maximum age check.',
    testId: 'assertCovid19Dec2020PfizerCvx302Dose3NoMaximumAge',
  },
  ...[
    'COVID-19: For patients >= 18y, enforce absolute minimum interval of 24 days *from* any prior Moderna or CVX 213 shots (in any Series) if after 10/25/2021',
    'COVID-19: For patients >= 18y, enforce absolute minimum interval of 24 days *to* any Moderna or CVX 213 shots (in any Series) if after 10/25/2021',
    'COVID-19: For patients < 18y, always enforce absolute minimum interval of 24 days *from* any prior Moderna or CVX 213 shots (in any Series)',
    'COVID-19: For patients < 18y, always enforce absolute minimum interval of 24 days *to* any prior Moderna or CVX 213 shots (in any Series)',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'COVID-19 Dec 2020 primary-series doses enforce a 24-day absolute minimum interval when either the prior dose or current dose is Moderna-family/CVX213, with adult enforcement starting on 2021-10-25 and pediatric enforcement always active.',
    testId: 'assertCovid19Dec2020ModernaCvx213TwentyFourDayIntervals',
  })),
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series): If dose 1 is subsequently fulfilled after a CVX 313 for target dose 1 was evaluated as Accepted / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE, change the evaluation for the CVX 313 to Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
    behavior:
      'Sep 2023 COVID-19 age-5-through-under-12 CVX313 accepted dose-1 exceptions switch to VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN after a later valid dose 1 is fulfilled.',
    testId: 'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 1/Exception 2: If a shot of CVX 313 is administered for target dose 1 to a patient age 5y and < 12y-4d, and it is the only dose on record, and the CVX 313 would otherwise be considered valid, target dose 1 is not fulfilled',
    behavior:
      'Sep 2023 COVID-19 CVX313 given for dose 1 at age 5 through under 12y-4d is accepted and non-counting with VACCINE_NOT_ALLOWED_FOR_THIS_DOSE.',
    testId: 'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 1/Exception 2: If a shot of CVX 313 was previously administered for target dose 1 and evaluated as Accepted / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE and the current shot is < 24 days apart, evaluate the shot as Invalid / BELOW_MINIMUM_INTERVAL',
    behavior:
      'Sep 2023 COVID-19 dose 1 after the age-5-through-under-12 CVX313 accepted exception is invalid when administered less than 24 days after the accepted CVX313 dose.',
    testId: 'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 1/Exception 2: If a shot of CVX 313 was previously administered for target dose 1 and evaluated as Accepted / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE and the current shot is >= 24 days apart, override default absolute minimum interval check (not BELOW_MINIMUM_INTERVAL)',
    behavior:
      'Sep 2023 COVID-19 dose 1 after the age-5-through-under-12 CVX313 accepted exception may fulfill dose 1 at 24 days, overriding the broader 8-week prior-COVID interval.',
    testId: 'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series): For the 2023-2024 season, the absolute minimum interval from (invalid) dose 1 is 4m-4d (*doseIntervalCheck*)',
    behavior:
      'Sep 2023 COVID-19 >=5 years series current dose 1 or 2 is invalid below the 2023-2024 4-month minus 4-day interval from the latest prior evaluated target-series dose, unless a custom 24-day exception interval applies.',
    testId: 'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 1/Exception 3: If a CVX 211 is administered prior to 10/4/23, evaluate the shot as Accepted / VACCINE_NOT_PART_OF_THIS_SERIES (override allowableVaccineCheck)',
    behavior:
      'Sep 2023 COVID-19 CVX211 administered before 2023-10-04 is accepted and non-counting with VACCINE_NOT_PART_OF_THIS_SERIES.',
    testId: 'assertCovid19Sep2023Cvx211AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 1/Exception 3: If a shot of CVX 211 was previously administered for target dose 1 and evaluated as Accepted / VACCINE_NOT_PART_OF_THIS_SERIES and the current shot is < 24 days apart, evaluate the shot as Invalid / BELOW_MINIMUM_INTERVAL',
    behavior:
      'Sep 2023 COVID-19 dose 1 after an accepted CVX211 exception is invalid when administered less than 24 days after the accepted CVX211 dose.',
    testId: 'assertCovid19Sep2023Cvx211AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 1/Exception 3: If a shot of CVX 211 was previously administered for target dose 1 and evaluated as Accepted / VACCINE_NOT_PART_OF_THIS_SERIES and the current shot is >= 24 days apart, do not evaluate as Invalid',
    behavior:
      'Sep 2023 COVID-19 dose 1 after an accepted CVX211 exception may fulfill dose 1 at 24 days, overriding the broader prior-COVID interval.',
    testId: 'assertCovid19Sep2023Cvx211AcceptedException',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 2: If a shot is administered before the absolute minimum age and permitted for this dose, evaluate as Accepted with reason code OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Sep 2023 COVID-19 dose 2 shots permitted for the >=5 years series but administered before age 65y-4d are accepted as OUTSIDE_ROUTINE_SERIES instead of invalidating below the dose absolute minimum age.',
    testId: 'assertCovid19Sep2023Dose2Under65AcceptedOutsideRoutine',
  },
  {
    ruleName:
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series)-->TargetDose 2: If a CVX 310 or CVX 311 is administered < the series absolute minimum age for the dose and <= the CVX code absolute maximum age, evaluate as Accepted with reason code OUTSIDE_ROUTINE_SERIES',
    behavior:
      'Sep 2023 COVID-19 CVX310/CVX311 dose 2 shots administered before age 65y-4d are accepted as OUTSIDE_ROUTINE_SERIES on the non-allowed-dose path.',
    testId: 'assertCovid19Sep2023Dose2Under65AcceptedOutsideRoutine',
  },
  {
    ruleName:
      'ProcessResults(COVID-19 Abstract): Return COVID-19 Season Evaluations - CB1 - determine if dose number should be reset to dose 1 at the beginning of the Sept 2023, Aug 2024 and Aug 2025 season start dates if COVID19_SEP2023_DOSE_NUMBER_RESET_DISABLED is _not_ set',
    behavior:
      'COVID-19 TypeScript results expose normalized target-series dose numbers directly, including the seasonal reset behavior represented by each selected season match.',
    testId: 'assertCovid19DoseNumberResultShape',
  },
  {
    ruleName:
      'COVID-19(9/12/2023+ Abstract): If a COVID-19 shot that does not count towards U.S. vaccination is administered (for any Sept 2023+ COVID-19 Series), absolute minimum interval from the most recent shot to the current shot is 8w-4d',
    behavior:
      'Sep 2023+ COVID-19 non-counting prior shots enforce the 8-week-minus-4-day absolute minimum interval unless a narrower product exception applies.',
    testId: 'assertCovid19Sep2023NonCountingPriorBelow8WeeksMinus4DaysInvalid',
  },
  ...[
    [
      'COVID-19(Aug2025 2-64yrs/65+ Series abstract): If prior shot is CVX 313 and current shot is CVX 313 for target dose 1, evaluate using absolute minimum interval of 17 days',
      'assertCovid19Aug2025AdultCvx313To313Below17DaysInvalid',
    ],
    [
      'COVID-19(Aug2025 2-64yrs/65+ Series Abstract): If prior shot is NOT CVX 313 and target dose 1 is being administered, evaluate using absolute minimum interval of 8w-4d',
      'assertCovid19Aug2025AdultNon313PriorBelow8WeeksMinus4DaysInvalid',
    ],
    [
      'COVID-19(Aug2025 2-64yrs/65+ Series Abstract): If prior shot is CVX 313 and non-313 target dose 1 is being administered, evaluate using absolute minimum interval of 8w-4d',
      'assertCovid19Aug2025AdultCvx313ToNon313Below8WeeksMinus4DaysInvalid',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'Aug 2025 COVID-19 2-64 and 65+ target dose 1 evaluation applies the product-specific prior-dose absolute minimum interval override.',
    testId,
  })),
  ...[
    [
      'COVID-19(Aug2025 LT2y Series abstract)-->TargetDose 1: If patient has no doses on record but >= 1 invalid shot(s) administered prior to the season start date (*IntervalCheck*)',
      'assertCovid19Aug2025Lt2InvalidOtherOnlyCurrentShotBelow24DaysInvalid',
    ],
    [
      'COVID-19(Aug2025 LT2y Series abstract)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date (*IntervalCheck*)',
      'assertCovid19Aug2025Lt2NonModernaPriorCurrentShotBelow17DaysInvalid',
    ],
    [
      'COVID-19(Aug2025 LT2y Series abstract): Evaluating a shot in current season and exactly one prior valid CVX 311/312 before season start',
      'assertCovid19Aug2025Lt2PriorModernaCurrentShotTargetsDose2',
    ],
    [
      'COVID-19(Aug2025 LT2y Series abstract)-->TargetDose 1: If patient has no doses on record but >= 1 invalid shot(s) administered prior to the season start date (*recommendations*)',
      'assertCovid19Aug2025Lt2InvalidOtherOnlyForecast28Days',
    ],
    [
      'COVID-19(Aug2025 LT2y Series abstract)-->TargetDose 1: If patient has any of CVX 213, 308, 309, 310, 313 administered prior to the season start date (*recommendations*)',
      'assertCovid19Aug2025Lt2NonModernaPriorForecast21Days',
    ],
    [
      'COVID-19(Aug2025 LT2y Series abstract)-->TargetDose 2: If exactly one prior valid CVX 311/312 before season start (*recommendations*)',
      'assertCovid19Aug2025Lt2PriorModernaSkipsToDose2Forecast',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'Aug 2025 COVID-19 under-2 abstract interval/recommendation branches are implemented by the product-specific pre-season dose and invalid-dose hooks.',
    testId,
  })),
  ...[
    [
      'COVID-19(Abstract): Determination if additional dose and/or up to 3 booster dose(s) is permitted when administered < 4/19/2023 and >= 9/2/22 for >= 12 yrs of age, >= 10/12/2022 for >=5 yrs of age and < 12 yrs of age, or >= 12/8/2022 for >= 6 months of age in the Moderna Series',
      'assertCovid19Dec2020PreBivalentAdditionalBoosterPermissions',
    ],
    [
      'COVID-19(Administration of 1st Bivalent Dose in the Pfizer Series After Series Completion): If a shot is administered in the Pfizer series on >= 3/17/2023, the series is complete, and the patient has not received a dose of any bivalent vaccines < 3/17/2023 nor any COVID-19 dose >= 4/19/2023, evaluate the shot as Valid',
      'assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals',
    ],
    [
      'COVID-19(Administration of 1st Bivalent Dose in a non-Pfizer Series After Series Completion): If a shot is administered on >= 4/19/2023, the series is complete, and the patient has not received a dose of any bivalent vaccines < 4/19/2023 nor any COVID-19 dose >= 4/19/2023, evaluate the shot as Valid',
      'assertCovid19Dec2020ThirdBoosterAndFirstBivalentIntervals',
    ],
    [
      'COVID-19(Abstract): For any vaccine administered in a COVID-19 series, override the absolute vaccine minimum age check',
      'assertCovid19Dec2020MinimumAgeOverrides',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'Dec 2020 COVID-19 abstract post-completion/minimum-age behavior is represented by the TS post-completion and minimum-age override hooks.',
    testId,
  })),
  ...[
    'COVID-19(Abstract): If the execution date is >= 9/2/2022, determine recommendation for completed the Pfizer, Moderna, Mixed Product, Janssen or WHO-approved Series along with up to an additional dose and/or 3 extra doses',
    'COVID-19(Abstract): Prior booster dose was administered in the Pfizer, Moderna, Mixed Product, Janssen or WHO-approved Series on or after 9/2/2022',
    'COVID-19(Abstract): If the execution date is >= 3/17/2023, determine recommendation for __completed__ __Pfizer__, __Mixed Product__, __Moderna__, __Janssen__ or __Novavax__ COVID-19 Series',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Dec 2020 COVID-19 completed-series recommendations after the bivalent/current-era policy dates are handled by the TS completed-series recommendation logic.',
    testId: 'assertCovid19Dec2020BivalentEraRecommendations',
  })),
  ...[
    [
      'COVID-19: If the Series is not complete and the last shot administered was CVX 213 or shot not authorized by the FDA, recommend earliest and recommended interval of 28 days',
      'assertCovid19Dec2020IncompleteWhoIntervalRecommendations',
    ],
    [
      'COVID-19(Abstract): If dose 1 was administered at >= 6 yrs of age in the Moderna Series and the execution date >= 4/19/2023, recommend earliest and recommended interval of 8 weeks',
      'assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations',
    ],
    [
      'COVID-19(Abstract): If dose 1 was administered at >= 5 yrs of age in the Pfizer or Mixed Product Series and the execution date >= 4/19/2023, recommend earliest and recommended interval of 8 weeks',
      'assertCovid19Dec2020PostApr2023IncompleteIntervalRecommendations',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'Dec 2020 COVID-19 incomplete-series recommendation interval abstract branches are implemented by the product/date-specific recommendation interval hooks.',
    testId,
  })),
  ...[
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series Abstract): If the patient has >= 1 COVID-19 shot(s) on record prior to target dose 1, the absolute minimum interval of 8w-4d is not met IF none of the exceptions apply',
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series Parent Rule): If a shot of CVX 313 is administered for target dose 1, and there are no previous doses on record, evaluate the shot as Accepted / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
      'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series Abstract)-->TargetDose 1/Exception 2: If a previous shot of CVX 313 administered for target dose 1 was determined to be COVID19_INVALID_CVX_313_SEPT2023GTE5SERIES_OTHERWISE_WOULD_BE_CONSIDERED_VALID_FOR_TARGET_DOSE_1, the absolute minimum interval from that shot to target dose 1 is 24 days',
      'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series Abstract)-->TargetDose 1/Exception 3: If a shot of CVX 211 was previously administered for target dose 1 and evaluated as Accepted / VACCINE_NOT_PART_OF_THIS_SERIES, the absolute minimum interval from that shot to target dose 1 is 24 days',
      'assertCovid19Sep2023Cvx211AcceptedException',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs Series (Abstract); 2023-2024 Season): If a shot was administered prior to target dose 1 (prior season), the absolute minimum interval from the prior shot to the current shot is 8w-4d',
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'Sep 2023/Aug 2024 COVID-19 >=5 abstract interval branches are implemented by the prior-season and exception-specific evaluation hooks.',
    testId,
  })),
  ...[
    [
      'COVID-19(Sep2023/Aug2024 Moderna < 5yrs Series Abstract): Recommend the appropriate age-specific vaccine',
      'assertCovid19Sep2023RecommendationProducts',
    ],
    [
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series Abstract): Recommend the appropriate age-specific vaccine',
      'assertCovid19Sep2023RecommendationProducts',
    ],
    [
      'COVID-19(Sep2023/Aug2024): If there are no shots administered, set the earliest/recommended/overdue age to the latter of age 6 months or the current season start date (*recommendationAgeCheck*)',
      'assertCovid19Sep2023RecommendationProducts',
    ],
    [
      'COVID-19(Sep2023/Aug2024): For the 2023-2024 season, the minimum interval and recommended interval from the most recent shot prior to 9/12/2023, when there are no doses on record, are 8w (*recommendationIntervalCheck*)',
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs): For the 2023-2024 season, the minimum interval and recommended interval from dose 1 to dose 2 are, respectively, to 4m and 4m (*recommendationIntervalCheck*)',
      'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs): If the patient has >= 1 COVID-19 shot(s) on record prior to dose 1, the recommended earliest & recommended interval is 8w from target dose 1 to the next target dose IF none of the exceptions apply (*recommendationIntervalCheck*)',
      'assertCovid19Sep2023Gte5Dose1ToDose2Interval',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs): If the interval from the most recent shot administered >= the season start date has elapsed and the patient also turns 5 years of age >= season start date, set the recommended age for target dose 1 to the season start date (*recommendationAgeCheck*)',
      'assertCovid19Sep2023SeriesSelection',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1: If there are no shots in the current season but there are shots in a prior season, set the earlest and recommended date for target dose 1 to the latter of age 6 months or the season start date (*recommendationAgeCheck*)',
      'assertCovid19Sep2023PreSeasonPriorBelow8WeeksMinus4DaysInvalid',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1/Exception 2: If a previous shot of CVX 313 administered for target dose 1 was determined to be COVID19_INVALID_CVX_313_SEPT2023GTE5SERIES_OTHERWISE_WOULD_BE_CONSIDERED_VALID_FOR_TARGET_DOSE_1, the recommended interval to the next dose is 28 days',
      'assertCovid19Sep2023Cvx313Age5ToUnder12AcceptedException',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1/Exception 3: If a shot of CVX 211 was previously administered for target dose 1 and evaluated as Accepted, the recommended interval from that shot to target dose 1 is 28 days',
      'assertCovid19Sep2023Cvx211AcceptedException',
    ],
    [
      'COVID-19(Sep2023/Aug2024 >= 5yrs)->TargetDose 1/Exception 3: There are no other shots administered after the CVX 211; _also_ override default recommendationIntervalCheck',
      'assertCovid19Sep2023Cvx211AcceptedException',
    ],
    [
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a prior formulation COVID-19 vaccine (excluding non-US vaccines that do not count towards US vaccination) or a non-Pfizer updated seasonal COVID-19 vaccine is administered on or after 9/12/2023 for target dose 1 or target dose 2, the minimum/recommended interval to the next dose is 28 days(*recommendationIntervalCheck*)',
      'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
    ],
    [
      'COVID-19(Sep2023/Aug2024 Pfizer < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the minimum/recommended interval from that shot to the next shot is 28 days (*recommendationIntervalCheck*)',
      'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
    ],
    [
      'COVID-19(Sep2023/Aug2024 Moderna < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the minimum/recommended interval from that shot to the next shot is 28 days (*recommendationIntervalCheck*)',
      'assertCovid19Sep2023ModernaSkipDose2PriorSeasonInterval',
    ],
    [
      'COVID-19(Sep2023/Aug2024 Mixed Product < 5yrs Series): If a shot was previously administered for target dose 1 or target dose 2 and evaluated as Invalid / BELOW_MINIMUM_AGE_SERIES and the series is not complete, the minimum/recommended interval from that shot to the next shot is 28 days (*recommendationIntervalCheck*)',
      'assertCovid19Sep2023Lt5TwentyFourDayIntervals',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'Sep 2023/Aug 2024 COVID-19 abstract recommendation age/product/interval branches are implemented by the seasonal recommendation hooks.',
    testId,
  })),
  ...[
    [
      'SeriesSelection(COVID-19 Aug2025+ Abstract): In Aug2025 season, determine date at which patient turns 2 and 65 years of age',
      'assertCovid19Aug2025SeriesSelection',
    ],
    [
      'SeriesSelection(COVID-19 Sep2023/Aug2024 Abstract): In Sep2023/Aug2024 seasons, determine date at which patients turns 5 years of age',
      'assertCovid19Sep2023SeriesSelection',
    ],
    [
      'SeriesSelection(COVID-19 Sep2023/Aug2024 Abstract): In Sep2023/Aug2024 seasons, determine date at which patients turns 12y-4d years of age',
      'assertCovid19Sep2023SeriesSelection',
    ],
  ].map(([ruleName, testId]) => ({
    ruleName,
    behavior:
      'COVID-19 seasonal series selection computes age-boundary dates directly when choosing the applicable season/age series.',
    testId,
  })),
  {
    ruleName:
      'Zoster: Evaluate CVX 187 as Invalid/Below Minimum Interval if administered CVX 187 < 52 days after CVX 121 or CVX 188',
    behavior:
      'Zoster recombinant CVX 187 is invalid if it follows legacy zoster CVX 121/188 by less than 52 days.',
    testId: 'assertZosterLegacyToRecombinantMinimumInterval',
  },
  {
    ruleName:
      'Zoster: Evaluate CVX 187 as Invalid/Below Minimum Interval if administered on same day as CVX 121 or CVX 188',
    behavior:
      'Zoster recombinant CVX 187 is invalid if administered the same day as legacy zoster CVX 121/188.',
    testId: 'assertZosterLegacyToRecombinantSameDayInvalid',
  },
  {
    ruleName:
      'Zoster: Evaluate shot as Accepted/VACCINE_NOT_PART_OF_THIS_SERIES if administered CVX 121 or CVX 188',
    behavior:
      'Legacy zoster CVX 121/188 is accepted but does not count for the recombinant zoster series.',
    testId: 'assertZosterLegacyAcceptedNonCounting',
  },
  {
    ruleName: 'Zoster: Always recommend Zoster recombinant (CVX 187)',
    behavior:
      'Zoster next-dose forecasts recommend recombinant zoster CVX 187.',
    testId: 'assertZosterAlwaysRecommendsCvx187',
  },
  {
    ruleName:
      'Zoster: If patient is administered adult varicella (CVX 21) doses, the minimum interval and recommended interval between the adult varicella (CVX 21) doses to Zoster is 8 weeks',
    behavior:
      'Zoster forecast earliest and recommended dates are at least 8w after the latest adult varicella CVX 21 dose.',
    testId: 'assertZosterAdultVaricellaIntervalForecast',
  },
  {
    ruleName:
      'Zoster: If patient is administered a CVX 121 or 188, the minimum interval and recommended interval is 8 weeks',
    behavior:
      'Zoster forecast earliest and recommended dates are at least 8w after the latest legacy zoster CVX 121/188 dose.',
    testId: 'assertZosterLegacyIntervalForecast',
  },
  {
    ruleName:
      'Cholera: Always include supplemental text with the recommendation indicating Cholera is not routinely recommended in the U.S., except when the recommendation is Not Recommended / COMPLETE',
    behavior:
      'Incomplete Cholera recommendations include supplemental ACIP/CDC Yellow Book context.',
    testId: 'assertCholeraSupplementalText',
  },
  {
    ruleName:
      'Cholera: Patient < 2 years old, Not Recommended with supplemental text',
    behavior:
      'Cholera is not recommended before age 2 and includes Cholera supplemental text.',
    testId: 'assertCholeraUnder2NotRecommended',
  },
  {
    ruleName:
      'Cholera: Patient >= 2 years old and < 65 years old, Conditional/High Risk with supplemental text',
    behavior:
      'Cholera is conditionally recommended for age 2 through 64 with HIGH_RISK and supplemental text.',
    testId: 'assertCholeraAge2Through64Conditional',
  },
  {
    ruleName:
      'Cholera: Patient >= 65 years old, Not Recommended / TOO_OLD with supplemental text',
    behavior:
      'Cholera is not recommended at age 65 or later with TOO_OLD and supplemental text.',
    testId: 'assertCholeraAge65TooOld',
  },
  {
    ruleName:
      'Typhoid: Always include supplemental text with the recommendation indicating Typhoid is not routinely recommended in the U.S.',
    behavior:
      'Typhoid recommendations include supplemental ACIP/CDC Yellow Book context.',
    testId: 'assertTyphoidSupplementalText',
  },
  {
    ruleName:
      'Typhoid: Patient < 2 years old, Not Recommended with SUPPLEMENTAL_TEXT',
    behavior:
      'Typhoid is not recommended before age 2 and includes Typhoid supplemental text.',
    testId: 'assertTyphoidUnder2NotRecommended',
  },
  {
    ruleName:
      'Typhoid: Patient >= 2 years old and not complete, Conditional/High Risk',
    behavior:
      'Incomplete Typhoid is conditionally recommended at age 2 or later with HIGH_RISK and supplemental text.',
    testId: 'assertTyphoidAge2PlusConditional',
  },
  {
    ruleName:
      'Typhoid: Patient is complete for typhoid, Conditional/Complete_High_Risk',
    behavior:
      'Complete Typhoid remains conditionally recommended with COMPLETE_HIGH_RISK and supplemental text.',
    testId: 'assertTyphoidCompleteHighRisk',
  },
  {
    ruleName:
      'Yellow Fever: Always include supplemental text with the recommendation indicating Yellow Fever is not routinely recommended in the U.S.',
    behavior:
      'Yellow Fever recommendations include live-vaccine minimum interval ACIP/CDC Yellow Book supplemental context.',
    testId: 'assertYellowFeverSupplementalText',
  },
  {
    ruleName:
      'Yellow Fever: Patient < 6 months old, Not Recommended with SUPPLEMENTAL_TEXT',
    behavior:
      'Yellow Fever is not recommended before age 6 months and includes Yellow Fever supplemental text.',
    testId: 'assertYellowFeverUnder6MonthsNotRecommended',
  },
  {
    ruleName:
      'Yellow Fever: Patient >= 6 months and < 9 months and not complete, Conditional/High Risk/Below Recommended Age for Series',
    behavior:
      'Yellow Fever is conditionally recommended from 6 months through under 9 months with BELOW_REC_AGE_SERIES and HIGH_RISK.',
    testId: 'assertYellowFeverSixThroughEightMonthsConditional',
  },
  {
    ruleName:
      'Yellow Fever: Patient >= 9 months months old, Conditionally Recommended HIGH_RISK with SUPPLEMENTAL_TEXT',
    behavior:
      'Incomplete Yellow Fever is conditionally recommended at age 9 months or later with HIGH_RISK.',
    testId: 'assertYellowFeverNineMonthsPlusConditional',
  },
  {
    ruleName:
      'Yellow Fever: Patient is complete for yellow fever, Conditional/Complete_High_Risk',
    behavior:
      'Complete Yellow Fever remains conditionally recommended with COMPLETE_HIGH_RISK and supplemental text.',
    testId: 'assertYellowFeverCompleteHighRisk',
  },
  {
    ruleName: 'YellowFever.adjustEarliestDateDueToYellowFeverVaccine',
    behavior:
      'Completed Yellow Fever pushes other live-virus forecast earliest dates to at least 30d after the Yellow Fever dose.',
    testId: 'assertYellowFeverAdjustsOtherLiveVirusEarliestDate',
  },
  {
    ruleName:
      'Polio: Modify the absolute minimum interval from dose 1 to dose 2 to 24 days if shot administered at >= 13 yrs of age',
    behavior:
      'Varicella dose 2 evaluation uses a 24d absolute minimum interval from dose 1 when dose 2 is administered at age 13 or later.',
    testId: 'assertVaricellaTeenDose2AbsoluteMinimumInterval',
  },
  {
    ruleName:
      'Varicella: Recommend conditional/high risk if born prior to 1/1/1980 and series not complete',
    behavior:
      'Incomplete Varicella for patients born before 1980 is conditionally recommended for high-risk groups.',
    testId: 'assertVaricellaBornBefore1980Conditional',
  },
  {
    ruleName:
      'Varicella: 28 day Earliest Interval From Dose 1 to Dose 2 if >= 13 Years of Age',
    behavior:
      'Varicella dose 2 earliest forecast date is dose 1 plus 28d when the patient is at least 13 years old.',
    testId: 'assertVaricellaTeenDose2ForecastInterval',
  },
  {
    ruleName:
      'Varicella: 28 day Recommended Interval From Dose 1 to Dose 2 if >= 13 Years of Age',
    behavior:
      'Varicella dose 2 recommended forecast date is dose 1 plus 28d when the patient is at least 13 years old.',
    testId: 'assertVaricellaTeenDose2ForecastInterval',
  },
  {
    ruleName:
      'Varicella: 28-day Earliest Interval for Valid Dose 1 When Previously Administered Shots are Invalid',
    behavior:
      'Varicella forecast for dose 1 is delayed to 28d after the latest invalid prior Varicella shot.',
    testId: 'assertVaricellaInvalidDose1RetryForecast',
  },
  {
    ruleName:
      'Varicella: 28-day Recommended Interval for Valid Dose 1 When Previously Administered Shots are Invalid',
    behavior:
      'Varicella recommended forecast for dose 1 is delayed to 28d after the latest invalid prior Varicella shot.',
    testId: 'assertVaricellaInvalidDose1RetryForecast',
  },
  {
    ruleName:
      'Meningococcal: Mark the Series as Complete Before Evaluation of Shot if Prior Dose 1 is Administered >= 16yrs and < 19yrs of Age',
    behavior:
      'MCV 2-dose series is complete with one valid dose administered from age 16 through under 19 when no earlier dose exists.',
    testId: 'assertMcvOneDoseAt16Through18CompletesSeries',
  },
  {
    ruleName:
      'Meningococcal: Evaluate shot as Accepted/Below Recommended Age and does not count towards series completion if given below the minimum age for the series and above the vaccine minimum age; skip base rules',
    behavior:
      'MCV dose 1 below the series absolute minimum age but at or above the vaccine minimum age is accepted and non-counting.',
    testId: 'assertMcvBelowSeriesMinimumAccepted',
  },
  {
    ruleName:
      'Meningococcal: Do not run base rules for minimum age for vaccine if given below the minimum age for the series and above the vaccine minimum age',
    behavior:
      'MCV accepted-below-series-age shots do not also receive vaccine minimum-age invalidation.',
    testId: 'assertMcvBelowSeriesMinimumAccepted',
  },
  {
    ruleName:
      'Meningococcal: Skip age evaluation of the Shot if given below the minimum age for the series and below the vaccine minimum age; skip age base rules',
    behavior:
      'MCV shots below the vaccine minimum age remain invalid through the series age constraint without adding vaccine minimum-age handling.',
    testId: 'assertMcvBelowVaccineMinimumInvalid',
  },
  {
    ruleName:
      'Evaluate Shot as Accepted & Above Recommended Age if age at administration >= 22yrs and has not completed series < 22yrs of age',
    behavior:
      'MCV shots at age 22 or later are accepted and non-counting if the routine series was not completed before age 19.',
    testId: 'assertMcvAge22AcceptedAboveRecommended',
  },
  {
    ruleName:
      'Meningococcal: Mark the Series Complete if Dose 1 is Administered >= 16yrs and < 19yrs of Age',
    behavior:
      'MCV forecasting marks the series complete when one valid dose was administered from age 16 through under 19.',
    testId: 'assertMcvOneDoseAt16Through18CompletesSeries',
  },
  {
    ruleName:
      'Meningococcal: Recommend Dose 1 at 16yrs of age if Patient >= 16yrs and < 19yrs of Age',
    behavior:
      'MCV dose 1 recommended forecast date is the 16th birthday for patients age 16 through under 19 with no valid doses.',
    testId: 'assertMcvDose1RecommendedAt16ForTeen',
  },
  {
    ruleName:
      'Meningococcal: If a patient completed the series, recommendation is Not Recommended / COMPLETE_HIGH_RISK',
    behavior:
      'Complete MCV forecast is not recommended with COMPLETE_HIGH_RISK.',
    testId: 'assertMcvCompleteHighRisk',
  },
  {
    ruleName:
      'Meningococcal: If a patient is >= 19 years and did NOT complete the series before 19 years of age, Recommendation is Conditional/HIGH_RISK and Mark that the Series cannot be Completed',
    behavior:
      'Incomplete MCV at age 19 or later is conditionally recommended with HIGH_RISK.',
    testId: 'assertMcvAge19ConditionalHighRisk',
  },
  {
    ruleName:
      'Influenza: Evaluate the H1N1 Shot as Outside Flu Season if it does not fall within the Season Start and Stop Dates',
    behavior:
      'H1N1 shots outside the imported 2009 H1N1 season are invalid with OUTSIDE_FLU_SEASON.',
    testId: 'assertH1n1OutsideSeasonInvalid',
  },
  {
    ruleName:
      'H1N1: Post Recommendation Check: Recommend Not Recommended and Vaccine Group No Longer Recommended if Final Recommendation Date after Season End Date',
    behavior:
      'H1N1 forecasts become not recommended with VAC_GROUP_NO_LONGER_REC when the recommendation date is after the season end.',
    testId: 'assertH1n1RecommendationDateAfterSeasonEnd',
  },
  {
    ruleName:
      'H1N1: Recommend Not Recommended with reason of Complete if Series is Complete',
    behavior: 'Complete H1N1 forecasts are not recommended with COMPLETE.',
    testId: 'assertH1n1CompleteNotRecommended',
  },
  {
    ruleName:
      'H1N1: Recommend Not Recommended with reason of Vaccine Group No Longer Recommended if Series Not Complete and after Season End Date',
    behavior:
      'Incomplete H1N1 forecasts after the imported season end are not recommended with VAC_GROUP_NO_LONGER_REC.',
    testId: 'assertH1n1AfterSeasonEndNotRecommended',
  },
  {
    ruleName: 'SeriesSelection: Select Only H1N1 Series',
    behavior:
      'H1N1 selection chooses the only candidate when one H1N1 series is available.',
    testId: 'assertH1n1SelectOnlySeries',
  },
  {
    ruleName:
      'SeriesSelection: For the H1N1 2009 season, patient < 10yrs, 2-dose series applies',
    behavior:
      'H1N1 selection chooses the 2-dose series for patients under age 10.',
    testId: 'assertH1n1Under10SelectsTwoDose',
  },
  {
    ruleName:
      'SeriesSelection: For the H1N1 2009 season, patient >= 10yrs and number of effective doses <= 1 at last shot date, 1-dose series applies',
    behavior:
      'H1N1 selection chooses the 1-dose series for patients age 10 or older.',
    testId: 'assertH1n1Age10SelectsOneDose',
  },
  {
    ruleName:
      'SeriesSelection: For the H1N1 2009 season, if effective number of doses >=2 on the date of the last shot, the 2-dose series applies',
    behavior:
      'H1N1 selection keeps the 2-dose series when a valid second dose was administered before age 10.',
    testId: 'assertH1n1ValidDose2Before10SelectsTwoDose',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Rotavirus Rule #1a: If shot administered >= 1/1/2000 and one of the doses is CVX 74, evaluate CVX 74 as Invalid / DUPLICATE_SAME_DAY and other Rotavirus CVX as Valid',
    behavior:
      'Rotavirus same-day duplicate evaluation after 2000 invalidates CVX 74 when another rotavirus product is present.',
    testId: 'assertRotavirusPost2000Cvx74DuplicateInvalid',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Rotavirus Rule #1b: If shot administered >= 1/1/2000, neither of the doses is CVX 74 and one of the doses is CVX 119, evaluate CVX 119 as Invalid / DUPLICATE_SAME_DAY and other Rotavirus CVX as Valid',
    behavior:
      'Rotavirus same-day duplicate evaluation after 2000 invalidates CVX 119 when no CVX 74 is present and another rotavirus product is present.',
    testId: 'assertRotavirusPost2000Cvx119DuplicateInvalid',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Rotavirus Rule #2a: If shot administered < 1/1/2000 and one of the doses is CVX 74, evaluate CVX 74 as Valid and other Rotavirus CVX as Invalid / DUPLICATE_SAME_DAY',
    behavior:
      'Rotavirus same-day duplicate evaluation before 2000 keeps CVX 74 valid and invalidates the other rotavirus product.',
    testId: 'assertRotavirusPre2000Cvx74Wins',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day Rotavirus Rule #2b: If shot administered < 1/1/2000, neither of the doses is CVX 74 and one of the doses is CVX 119, evaluate CVX 119 as Invalid / DUPLICATE_SAME_DAY and other Rotavirus CVX as Valid',
    behavior:
      'Rotavirus same-day duplicate evaluation before 2000 invalidates CVX 119 when no CVX 74 is present and another rotavirus product is present.',
    testId: 'assertRotavirusPre2000Cvx119DuplicateInvalid',
  },
  {
    ruleName:
      'Rotavirus: Mark Dose as Accepted if Patient Greater Than 8 Months of Age',
    behavior:
      'Rotavirus shots administered after age 8 months are accepted and non-counting with ABOVE_REC_AGE_SERIES.',
    testId: 'assertRotavirusAfter8MonthsAccepted',
  },
  {
    ruleName:
      'Rotavirus: Mark Shot with Invalid Vaccine as Invalid but do _not_ indicate VACCINE_NOT_ALLOWED_FOR_DOSE reason (overrides base vaccine check rule)',
    behavior:
      'Rotavirus vaccines not allowed for a selected Rotavirus series are recorded invalid without VACCINE_NOT_ALLOWED_FOR_DOSE.',
    testId: 'assertRotavirusInvalidSeriesVaccineNoVaccineNotAllowedReason',
  },
  {
    ruleName: 'Rotavirus: Not Recommended When >= 105 days and No Valid Shots',
    behavior:
      'Rotavirus initiation is not recommended at age 105 days or later with TOO_OLD_TO_INITIATE when no valid doses exist.',
    testId: 'assertRotavirusTooOldToInitiate',
  },
  {
    ruleName:
      'Rotavirus: Series is Complete if Over 8 Years of Age or Will Be as of the Routine Recommendation Date',
    behavior:
      'Rotavirus is not recommended with TOO_OLD if the patient is over 8 months or will be over 8 months on the recommended date.',
    testId: 'assertRotavirusTooOldByRecommendedDate',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day(MMR): If any MMR vaccine other than MMRV is administered on the same day as MMRV, evaluate the MMRV shot first',
    behavior:
      'MMR same-day duplicate ordering gives MMRV CVX 94 priority over other MMR vaccines.',
    testId: 'assertMmrMmrvWinsSameDay',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day(MMR): If a measles/mumps/rubella vaccine other than an MMR is administered on the same day as an MMR (excluding MMRV), evaluate the MMR shot first',
    behavior:
      'MMR same-day duplicate ordering gives MMR CVX 03 priority over other non-MMRV MMR vaccines.',
    testId: 'assertMmrCvx03WinsSameDay',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day(MMR): If one of those shots is an MMR (CVX 03) and the other is not (excluding MMRV), evaluate the MMR as Valid and evaluate the other as Invalid / Duplicate Shot/Same Day',
    behavior:
      'MMR CVX 03 is valid and other same-day non-MMRV MMR vaccines are invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertMmrCvx03WinsSameDay',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day(MMR): If one of those shots is an MMRV (CVX 94) and the other is not, evaluate the MMRV as Valid and evaluate the other as Invalid / Duplicate Shot/Same Day',
    behavior:
      'MMRV CVX 94 is valid and other same-day MMR vaccines are invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertMmrMmrvWinsSameDay',
  },
  {
    ruleName:
      'MMR: If a CVX 03, CVX 04, or CVX 05 is administered at >= 6 months-4 days and < the absolute minimum age (i.e., < 1 year-4 days), evaluate as Accepted with reason code OUTSIDE_ROUTINE_SERIES',
    behavior:
      'MMR CVX 03/04/05 from 6m-4d through before 1y-4d is accepted and non-counting with OUTSIDE_ROUTINE_SERIES.',
    testId: 'assertMmrEarlyInfantAcceptedOutsideRoutine',
  },
  {
    ruleName:
      'MMR: Mark Target Dose 2 as Accepted / EXTRA_DOSE if the shot is administered when patient >= 19 yrs',
    behavior:
      'MMR dose 2 administered at age 19 or later is accepted and non-counting with EXTRA_DOSE.',
    testId: 'assertMmrAdultDose2AcceptedExtraDose',
  },
  {
    ruleName:
      'MMR: Mark the series complete if Patient >= 19 yrs and there is 1 dose in the Series',
    behavior:
      'MMR series is complete with one valid dose when forecasting at age 19 or later.',
    testId: 'assertMmrAdultOneDoseComplete',
  },
  {
    ruleName: 'Live Vaccine interval between MMR and MMRV is 28 days',
    behavior:
      'MMRV CVX 94 is invalid with TOO_EARLY_LIVE_VIRUS if administered less than 28d after a prior dose-1 live MMR/MMRV/varicella shot.',
    testId: 'assertMmrMmrvLiveVirusInterval',
  },
  {
    ruleName:
      'MMR: Recommend conditional/high risk if born prior to 1/1/1957 and series not complete',
    behavior:
      'Incomplete MMR for patients born before 1957 is conditionally recommended for high-risk groups.',
    testId: 'assertMmrBornBefore1957Conditional',
  },
  {
    ruleName:
      'MMR: If a patient completed the series, recommendation is Not Recommended / COMPLETE_HIGH_RISK',
    behavior:
      'Complete MMR forecast is not recommended with COMPLETE_HIGH_RISK.',
    testId: 'assertMmrCompleteHighRisk',
  },
  {
    ruleName:
      'MMR: If the recommended due date for Target Dose 2 is >= 19 years old, then that dose is not required; the series is complete with 1 dose',
    behavior:
      'MMR dose 2 is not required when the patient has one valid dose and forecasting at age 19 or later.',
    testId: 'assertMmrAdultOneDoseComplete',
  },
  {
    ruleName:
      'JE-VC Risk 2-dose Series: If target dose 2 is administered when the patient is >= 18 years old and < 66 years old, apply accelerated intervals',
    behavior:
      'Japanese Encephalitis standard 2-dose series dose 2 can use accelerated absolute minimum intervals when administered from age 18 through 65.',
    testId: 'assertJapaneseEncephalitisStandardAdultAcceleratedInterval',
  },
  {
    ruleName:
      'JE-VC Risk 2-dose Accelerated Series: If target dose 2 is administered when the patient is >= 66 years old, apply standard intervals',
    behavior:
      'Japanese Encephalitis accelerated 2-dose series dose 2 switches back to the standard absolute minimum interval when administered at age 66 or later.',
    testId: 'assertJapaneseEncephalitisAcceleratedAge66StandardInterval',
  },
  {
    ruleName:
      'Japanese Encephalitis: Always include supplemental text with the recommendation',
    behavior:
      'Japanese Encephalitis recommendations include JE_NOT_ROUTINE_ACCEL_18_65_SEE_ACIP supplemental text.',
    testId: 'assertJapaneseEncephalitisSupplementalText',
  },
  {
    ruleName:
      'Japanese Encephalitis: Patient < 2 months old, Not Recommended with SUPPLEMENTAL_TEXT',
    behavior:
      'Japanese Encephalitis is not recommended before age 2 months and includes the supplemental ACIP text.',
    testId: 'assertJapaneseEncephalitisUnder2MonthsNotRecommended',
  },
  {
    ruleName:
      'Japanese Encephalitis: Patient >= 2 months old and not complete, Conditional/High Risk',
    behavior:
      'Incomplete Japanese Encephalitis at age 2 months or later is conditionally recommended for high-risk patients.',
    testId: 'assertJapaneseEncephalitisTwoMonthsPlusConditional',
  },
  {
    ruleName:
      'Japanese Encephalitis: Patient is complete for Japanese Encephalitis, Conditional/Complete_High_Risk',
    behavior:
      'Complete Japanese Encephalitis forecast remains conditionally recommended with COMPLETE_HIGH_RISK.',
    testId: 'assertJapaneseEncephalitisCompleteHighRisk',
  },
  {
    ruleName:
      'Japanese Encephalitis: Suppress Latest Recommended Interval Check for accelerated schedule when 66 or older',
    behavior:
      'Accelerated Japanese Encephalitis dose 2 forecast suppresses the latest recommended interval when dose 1 was within 7 days of age 66.',
    testId: 'assertJapaneseEncephalitisAcceleratedForecastAt66',
  },
  {
    ruleName:
      'Japanese Encephalitis: Patient on accelerated schedule is 66 or older for recommended second dose',
    behavior:
      'Accelerated Japanese Encephalitis dose 2 forecast uses the standard 28-day recommendation when the accelerated date would be at age 66 or later.',
    testId: 'assertJapaneseEncephalitisAcceleratedForecastAt66',
  },
  {
    ruleName:
      'SeriesSelection.JapaneseEncephalitis.SelectJEVC_RISK_2_DOSE_SERIESIfPatientUnder18OrOver65YearsAtFirstDose',
    behavior:
      'Japanese Encephalitis selects the standard series when first valid dose age is under 18y-4d or at least 66 years.',
    testId: 'assertJapaneseEncephalitisSelectionByFirstDoseAge',
  },
  {
    ruleName:
      'SeriesSelection.JapaneseEncephalitis.SelectJEVC_RISK_2_DOSE_SERIESIfPatientUnder18OrOver65Years',
    behavior:
      'Japanese Encephalitis selects the standard series with no doses when evaluation age is under 18y-4d or at least 66 years.',
    testId: 'assertJapaneseEncephalitisSelectionByEvaluationAge',
  },
  {
    ruleName:
      'SeriesSelection.JapaneseEncephalitis.SelectJEVC_RISK_2_DOSE_ACCELERATED_SERIESIfPatientBetween18And65YearsAtFirstDose',
    behavior:
      'Japanese Encephalitis selects the accelerated series when first valid dose age is from 18y-4d through under 66 years.',
    testId: 'assertJapaneseEncephalitisSelectionByFirstDoseAge',
  },
  {
    ruleName:
      'SeriesSelection.JapaneseEncephalitis.SelectJEVC_RISK_2_DOSE_ACCELERATED_SERIESIfPatientBetween18And65Years',
    behavior:
      'Japanese Encephalitis selects the accelerated series with no doses when evaluation age is from 18y-4d through under 66 years.',
    testId: 'assertJapaneseEncephalitisSelectionByEvaluationAge',
  },
  {
    ruleName: 'Duplicate Shots/Same Day (Mpox): Evaluate CVX 325 last',
    behavior:
      'Mpox CVX 325 is evaluated after specific same-day Mpox products so product precedence can invalidate NOS doses.',
    testId: 'assertMpoxSameDaySpecificProductBeatsNos',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (Mpox): If CVX 206 and CVX 325 are given on the same day, mark 206 as valid and 325 as invalid',
    behavior:
      'Mpox CVX 206 takes precedence over same-day CVX 325, which is invalid as DUPLICATE_SAME_DAY.',
    testId: 'assertMpoxSameDaySpecificProductBeatsNos',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (Mpox): If CVX 75 or CVX 105 and CVX 325 are given on the same day, mark 75/105 as valid and 325 as invalid',
    behavior:
      'Mpox CVX 75 or 105 takes precedence over same-day CVX 325, which is invalid as DUPLICATE_SAME_DAY.',
    testId: 'assertMpoxSameDaySmallpoxProductBeatsNos',
  },
  {
    ruleName:
      'Duplicate Shots/Same Day (Mpox): If one of those shots is Valid and another shot on the same day is Accepted, mark the other Accepted shot Invalid/DUPLICATE_SAME_DAY',
    behavior:
      'Mpox accepted same-day duplicate shots on the same series dose are moved to invalid with DUPLICATE_SAME_DAY.',
    testId: 'assertMpoxSameDayAcceptedDoseBecomesInvalid',
  },
  {
    ruleName:
      'Mpox: If the administered vaccine is not permitted by default for the series, and the series is not complete, evaluate it as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
    behavior:
      'Mpox products that belong to the group but are not allowed for the current series dose are accepted and non-counting while the series is incomplete.',
    testId: 'assertMpoxNonAllowedProductAccepted',
  },
  {
    ruleName:
      'Mpox: If the dose 2 of the 2-dose series is administered prior to 28 days, include supplemental text that the dose does not follow the guidelines for minimum intervals',
    behavior:
      'Mpox 2-dose dose 2 before 28 days remains valid when above the absolute minimum and carries MPOX_MIN_INTERVAL_28D supplemental text.',
    testId: 'assertMpoxDose2Under28DaysSupplemental',
  },
  {
    ruleName: 'Mpox: If a booster dose is administered, evaluate the shot as Valid',
    behavior:
      'The first Mpox shot after series completion is recorded as a valid booster dose.',
    testId: 'assertMpoxBoosterAndExtraDoseHandling',
  },
  {
    ruleName:
      'Mpox: If a shot, VACCINE_CVX_75 or VACCINE_CVX_105, is evaluated as Invalid due to being below the live virus interval, mark the shot Valid if first shot is VACCINE_CVX_206',
    behavior:
      'Mpox recommendations after dose 1 CVX 206 ignore live-virus interval adjustment for the second dose.',
    testId: 'assertMpoxDose1RecommendsCvx206',
  },
  {
    ruleName:
      'Mpox: If additional shots are administered after booster shot, evaluated them as Accepted / EXTRA_DOSE',
    behavior:
      'Mpox shots after the first post-completion booster are accepted as EXTRA_DOSE.',
    testId: 'assertMpoxBoosterAndExtraDoseHandling',
  },
  {
    ruleName: 'Mpox: If no shots have been administered, recommended CONDITIONAL / HIGH_RISK',
    behavior:
      'Mpox with no administered doses is conditionally recommended for high-risk patients.',
    testId: 'assertMpoxNoDoseConditionalHighRisk',
  },
  {
    ruleName:
      'Mpox: If one dose has been administered in 2-dose Mpox series (and the series is therefore not complete), recommend CVX 206 at the vaccine level',
    behavior:
      'Mpox 2-dose series with one valid dose recommends CVX 206 specifically for the next dose.',
    testId: 'assertMpoxDose1RecommendsCvx206',
  },
  {
    ruleName:
      'SeriesSelection(Mpox): If a (valid) dose 1 of the Mpox 2-dose series was administered and no other doses were administered in another series prior to this shot, the Mpox 2-dose series applies',
    behavior:
      'Mpox selects the 2-dose series when its first valid dose is the earliest valid Mpox dose.',
    testId: 'assertMpoxSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(Mpox): If a (valid) dose 1 of the Mpox 1-dose series was administered and no other doses were administered in another series prior to this shot, the Mpox 1-dose series applies',
    behavior:
      'Mpox selects the 1-dose series when its first valid dose is the earliest valid Mpox dose.',
    testId: 'assertMpoxSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelect(Mpox): If a series was selected but another series was marked complete earlier, select the series that was complete earlier',
    behavior:
      'Mpox selection prefers the completed series whose completion dose occurred earliest.',
    testId: 'assertMpoxSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(Mpox): Select already _completed_ series if a different, _incomplete_ series was previously selected',
    behavior:
      'Mpox selection prefers complete series over incomplete series.',
    testId: 'assertMpoxSeriesSelection',
  },
  {
    ruleName:
      'SeriesSelection(Mpox): If no other series was selected, the Mpox 2-dose series applies',
    behavior: 'Mpox defaults to the 2-dose series when no other series rule selects.',
    testId: 'assertMpoxSeriesSelection',
  },
  {
    ruleName:
      'CandidateSeriesIdentification (Influenza): Initialize TargetSeries for *CURRENT* *Influenza* Season with Most Recent Prior Season Rules if Current Season Not Defined but Prior Season is Defined',
    behavior:
      'Influenza defaults modern/current seasons to the imported default influenza series when no fixed historical season applies.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'CandidateSeriesIdentification (Influenza): Initialize TargetSeries for *Current* or *Past* *Influenza* Season with Shots Administered with Most Recent Prior Season if No Applicable Season Defined at Time Shot Administered',
    behavior:
      'Influenza evaluates default-season shots against the imported default seasonal series when fixed season rules are unavailable.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'Influenza: 24 day absolute minimum interval between target dose 1 in current seasonal series and most recent shot from a prior season',
    behavior:
      'Influenza current-season dose 1 is invalid with BELOW_MINIMUM_INTERVAL if less than 24d after the latest prior-season influenza shot.',
    testId: 'assertInfluenzaPriorSeasonMinimumInterval',
  },
  {
    ruleName:
      'Influenza: Evaluate the Influenza Shot as Outside Flu Season if it does not fall within the Season Start and Stop Dates',
    behavior:
      'Influenza shots outside the target season date range are invalid with OUTSIDE_FLU_SEASON.',
    testId: 'assertInfluenzaOutsideSeasonInvalid',
  },
  {
    ruleName:
      'Influenza: Change invalid >= maximum age reason to Insufficient Antigen for vaccine CVX 161 (injectable quadrivalent, preservative-free, pediatric) is Administered',
    behavior:
      'Influenza CVX 161 administered at age 3 or later is invalid with INSUFFICIENT_ANTIGEN.',
    testId: 'assertInfluenzaCvx161InsufficientAntigen',
  },
  {
    ruleName:
      'Influenza: If CVX 194, 200, 201 202, 231, 331 or 337 is administered, evaluate the shot as Invalid / VACCINE_NOT_ALLOWED_IN_US',
    behavior:
      'Southern Hemisphere influenza CVX products are invalid with VACCINE_NOT_ALLOWED_IN_US.',
    testId: 'assertInfluenzaSouthernHemisphereNotAllowed',
  },
  {
    ruleName:
      'Influenza: Manually Set Not To Take Live Virus Intervals into Consideration During Recommendation',
    behavior:
      'Influenza forecasts are excluded from live-virus interval recommendation adjustment.',
    testId: 'assertInfluenzaIgnoresLiveVirusRecommendationInterval',
  },
  {
    ruleName:
      'Influenza(post-recommendation check): If the recommended date is after the season end date, recommend an interval of 4 weeks from the last shot administered, if the shot was administered on or after the absolute minimum age of target dose 1',
    behavior:
      'Influenza forecasts after season end can use four weeks after the latest eligible administered influenza shot as the recommendation date.',
    testId: 'assertInfluenzaPriorSeasonMinimumInterval',
  },
  {
    ruleName: 'SeriesSelection: DUMMY catch-all Influenza season rule, 2 dose-series applies',
    behavior:
      'Influenza selects a two-dose series when no higher-priority historical one-dose condition applies.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName: 'SeriesSelection: Select Only Influenza Series',
    behavior:
      'Influenza selects the only candidate series when the imported season yields a single candidate.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2017-2018, 2016-2017, 2015-2016, 2014-2015, 2013-2014 or 2012-2013 season if the patient < 9yrs and all 2-dose series conditions met, then 2-dose series applies',
    behavior:
      'Historical influenza selection uses the two-dose series for patients under 9 when one-dose prior-history conditions are not met.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2014-2015 season if the patient < 9yrs and 3rd 1-dose series condition met, then 1-dose series applies',
    behavior:
      'Historical influenza selection can choose the one-dose series for under-9 patients with sufficient prior-season influenza history.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2012-2013, 2013-2014 or 2014-2015 season if the patient < 9yrs and 2nd 1-dose series condition met, then 1-dose series applies',
    behavior:
      'Historical influenza selection can choose the one-dose series for under-9 patients meeting the pre-2010/H1N1 prior-history condition.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2012-2013, 2013-2014, 2014-2015 season if the patient < 9yrs and 1st 1-dose series condition met, then 1-dose series applies',
    behavior:
      'Historical influenza selection can choose the one-dose series for under-9 patients with at least two prior seasonal doses and one since July 2010.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2015-2016, 2016-2017 and 2017-2018 seasons if the patient < 9yrs and at least 2 doses of seasonal influenza vaccine during any prior influenza seasons, then 1-dose series applies',
    behavior:
      'Historical influenza selection can choose the one-dose series for under-9 patients with at least two prior seasonal influenza doses.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2012-2013, 2013-2014, 2014-2015, 2015-2016, 2016-2017, or 2017-2018 season if patient >= 9yrs and < 10yrs and 1-dose series conditions are met, then 1-dose series applies',
    behavior:
      'Historical influenza selection chooses the one-dose series for patients age 9 through under 10 unless specific two-dose conditions apply.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2012-2013, 2013-2014 or 2014-2015 season if patient >= 9yrs and < 10yrs and all 2-dose series conditions met, then 2-dose series applies',
    behavior:
      'Historical influenza selection can choose the two-dose series for age 9 through under 10 when the first current-season dose occurred before age 9 and prior-history conditions are unmet.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2015-2016, 2016-2017 and 2017-2018 season if patient >= 9yrs and < 10yrs and all 2-dose series conditions met, then 2-dose series applies',
    behavior:
      'Historical influenza selection can choose the two-dose series for age 9 through under 10 when the current-season first dose was before age 9 and prior seasonal dose count is insufficient.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName:
      'SeriesSelection: For the Influenza 2012-2013, 2013-2014, 2014-2015, 2015-2016, 2016-2017 and 2017-2018 seasons and patient >= 10yrs, 1-dose series applies',
    behavior:
      'Historical influenza selection chooses the one-dose series for patients age 10 or older.',
    testId: 'assertInfluenzaSelectionRules',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Hep B Due to Disease Documented',
    behavior:
      'Hep B documented disease evidence completes Hep B series and uses DISEASE_DOCUMENTED as the recommendation reason.',
    testId: 'assertHepBDiseaseDocumentedCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Hep B Due to Proof of Immunity',
    behavior:
      'Hep B proof-of-immunity evidence completes Hep B series and uses PROOF_OF_IMMUNITY as the recommendation reason.',
    testId: 'assertHepBProofOfImmunityCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Hep A Due to Disease Documented',
    behavior:
      'Hep A documented disease evidence completes Hep A series and uses DISEASE_DOCUMENTED as the recommendation reason.',
    testId: 'assertHepADiseaseDocumentedCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Hep A Due to Proof of Immunity',
    behavior:
      'Hep A proof-of-immunity evidence completes Hep A series and uses PROOF_OF_IMMUNITY as the recommendation reason.',
    testId: 'assertHepAProofOfImmunityCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Measles Due to Disease Documented',
    behavior:
      'Measles documented disease evidence contributes to MMR immunity completion.',
    testId: 'assertMmrDiseaseDocumentedCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Measles Due to Proof of Immunity',
    behavior:
      'Measles proof-of-immunity evidence contributes to MMR immunity completion.',
    testId: 'assertMmrProofOfImmunityCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Mumps Due to Disease Documented',
    behavior:
      'Mumps documented disease evidence contributes to MMR immunity completion.',
    testId: 'assertMmrDiseaseDocumentedCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Mumps Due to Proof of Immunity',
    behavior:
      'Mumps proof-of-immunity evidence contributes to MMR immunity completion.',
    testId: 'assertMmrProofOfImmunityCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Rubella Due to Disease Documented',
    behavior:
      'Rubella documented disease evidence contributes to MMR immunity completion.',
    testId: 'assertMmrDiseaseDocumentedCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Rubella Due to Proof of Immunity',
    behavior:
      'Rubella proof-of-immunity evidence contributes to MMR immunity completion.',
    testId: 'assertMmrProofOfImmunityCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Varicella Due to Disease Documented',
    behavior:
      'Varicella documented disease evidence completes varicella series and uses DISEASE_DOCUMENTED as the recommendation reason.',
    testId: 'assertVaricellaDiseaseDocumentedCompletesSeries',
  },
  {
    ruleName: 'Make Note of Disease Immunity for Varicella Due to Proof of Immunity',
    behavior:
      'Varicella proof-of-immunity evidence completes varicella series and uses PROOF_OF_IMMUNITY as the recommendation reason.',
    testId: 'assertVaricellaProofOfImmunityCompletesSeries',
  },
  ...[
    'Duplicate Shots/Same Day Hib: If one of the shots is a non-combination vaccine with components CVX 49 and the other shot is _not_ an NOS vaccine, then evaluate the CVX 49 as Invalid / DUPLICATE_SAME_DAY and evaluate the other specified Hib CVX as Valid',
    'Duplicate Shots/Same Day Hib: If one of the shots is a combination vaccine with components CVX 49 and the other is also a combination vaccine, non-NOS vaccine, evaluate the CVX 49 as Invalid / DUPLICATE_SAME_DAY and other Hib as Valid',
    'Hib: Mark Shot with Invalid Vaccine as Invalid but do _not_ indicate VACCINE_NOT_ALLOWED_FOR_DOSE reason (overrides base vaccine check rule)',
    'Evaluate Hib Shot As Accepted If Patient >=5 Yrs and Series Not Complete by 5yrs of Age',
    'Hib: Cancel Extra Dose Rule for Shot if Patient >=5 Yrs and Series Not Complete by 5yrs of Age',
    'Hib:Evaluate Hib Shot as Below Absolute Minimum Age for Final Dose of 4-Dose Hib Series if 4th Dose Administered < the Absolute Minimum Age (1y-4d) and received 0 Doses Prior to 7months of Age',
    'Hib: Allow Hib Booster Vaccine For Last Dose if 4th Dose Administered >= the Absolute Minimum Age of 1y-4d and Prior Doses Administered',
    'Hib: Allow Hib Booster Vaccine if Patient is >= 5yrs',
    'Hib: Booster Vaccine Not Allowed (Booster only) for patients less than 5y of age',
    'Hib: Set Dose Number to 2 in 4-Dose Hib Series if No Shots Administered and Patient Between 7 and 12 Months',
    'Hib: Set Dose Number to 3 in 4-Dose Hib Series if No Shots Administered and Patient Between 12 and 15 Months',
    'Hib: Set Dose Number to 4 in 4-Dose Hib Series if No Shots Administered and Patient Between 15 Months and 5 Years',
    'Hib: Skip Dose Number to 2 in 4-Dose Hib Series for Patient Between Between 7and12 Months',
    'Hib: Skip Dose Number to 4 in 4-Dose Hib Series if Patient Between 7and12 Months and has Received 1 Dose < 7 Months of Age and 1 Dose <= 12m-28d of Age',
    'Hib: Skip Dose Number to 3 in 4-Dose Hib Series if Patient Between 12and15 Months and has Received <2 Doses Administered at <12 Months of Age',
    'Hib: Skip Dose Number to 4 in 4-Dose Hib Series if Patient Between 12and15 Months and has Received 2 Doses Administered at <12 Months of Age',
    'Hib: Skip Dose Number to 4 in 4-Dose Hib Series for Patient over 15 Months',
    'Hib: Recommend Hib Conditional High Risk if Patient Age >=5yrs and Series Not Complete by 5yrs of Age and Cancel all other Recommendation Rules',
    'Hib: Include Recommendation with Date 7months in 4-Dose Hib Series and TargetDose 2 if Patient is between 7and12months and Received No Doses before 7months of Age',
    'Hib: Include Recommendation with Date 12months and TargetDose 3 in 4-Dose Hib Series if Patient between age 12and15months and Received <2 Doses before 12months of Age',
    'Hib: Set Recommendation Date to 12months and TargetDose 4 in 4-Dose Hib Series and Patient between age 12and15months and Received 2 Doses before 12months of Age',
    'Hib: Set Recommendation Date to 15months and TargetDose 4 in 4-Dose Hib Series if Patient between age 15months and 5years',
    'SeriesSelection(Hib): If the Series that was selected is Not Complete but the other Series is Complete, select the other (completed) Series instead',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Hib same-day duplicate, catch-up dose targeting, booster-only product, age-5, recommendation, and selection rules are handled by Hib-specific TypeScript engine hooks.',
    testId: 'ice-hib-rules',
  })),
  ...[
    'Duplicate Shot/Same Day (Abstract Hep A): Make notes if the adult vaccine (CVX 52) and pediatric vaccine (CVX  83 or CVX 84) duplicate shots',
    'Duplicate Shots/Same Day (Hep A): If a pediatric vaccine is administered to an adult >= 19 years of age in the Hep A 2-dose child/adult series and there are adult-formulated vaccines administered on the same day, evaluate the adult-formulated vaccine first',
    'Duplicate Shot/Same Day (Hep A): If shot administered at >= 19 years, evalute the adult vaccine (CVX 52) Valid and pediatric vaccine (CVX 83 and/or CVX 84) Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shot/Same Day (Hep A): If shot administered at < 19 years, evaluate the pediatric vaccine (CVX 83 or CVX 84) Valid and the adult vaccine (CVX 52) as Invalid / DUPLICATE_SAME_DAY',
    'Hep A: If a shot administered was evaluated and Not Valid due to ABOVE_MAXIMUM_AGE_VACCINE, ignore the shot when calculating intervals',
    'Hep A: Evaluate shot 2 as Valid if administered >= 6 months-4 days from Dose 1 in the 2-dose Series, even if there have been invalid shots administered',
    'Hep A: If CVX 104 (Twinrix) is administered at >= 18 years-4 days in the 3-dose Series or 4-dose Twinrix Series, there is no maximum age for the Hep A vaccine component (CVX 83)',
    'Hep A: If dose 1 and dose 2 are administered in the 3-dose Series at < 19y of age, and the interval between dose 1 and dose 2 is >= 6 months-4 day, then the Series is complete',
    'Hep A: Switch from 2-Dose Hep A series to 3-Dose Hep A series if CVX 104 dose is administered to a patient >= 19 years of age as target dose 1',
    'Hep A: Switch from 2-Dose Hep A series to 3-Dose Hep A series if CVX 104 administered at >= 19y targeting dose 2 >= 24d after last administered shot',
    'Hep A: Switch from 2-Dose Hep A series to 3-Dose Hep A series if CVX 104 dose 1 previously administered >= 18y-4d and CVX 104 targeting dose 2 >= 24d & < 6m-4d after last administered shot',
    'Hep A: Ensure the Absolute Minimum Interval Between Doses 1 and 3 in the HepA 3-dose Series is >= 6m-4d',
    'Hep A: Ensure the Absolute Minimum Interval Between Doses 1 and 4 in the HepA 4-dose Accelerated Twinrix Series is >= 12m-4d',
    'HepA: Recommend Conditional/High Risk when >= 19 years old and no shots',
    'HepA: Recommend both an earliest and recommended interval of 6 months between doses 1 & 3 for HepA 3-dose Series',
    'HepA: Recommend both an earliest and recommended interval of 12 months between doses 1 & 4 for HepA 4-dose Accelerated Twinrix Series',
    'Hep A: Recommend CVX 104 (Hep A-Hep B (Twinrix)) for the Hep A 3-dose Series if in sync with Hep B 3-dose Twinrix Series',
    'Hep A: Recommend CVX 104 (Hep A-Hep B (Twinrix)) for the Hep A 4-dose Accelerated Twinrix Series',
    'Hep A: Include supplemental text for target dose 4 in the Hep A 4-dose Accelerated Twinrix Series',
    'SeriesSelection(Hep A): Determine default series',
    'ABSTRACT SeriesSelection(Hep A): patient is >= 18 years - 4 days when first dose is administered',
    'SeriesSelection(Hep A): Select default series if patient has not received a dose of Hep A',
    'SeriesSelection(Hep A): Select default series if patient received a dose of Hep A < 18 years - 4 days',
    'SeriesSelection(Hep A): Select default series (2-dose or 3-dose) if patient is >= 18 years - 4 days when first dose is administered',
    'SeriesSelection(Hep A): Select 4-dose Accelerated Twinrix series if Hep B 4-dose Accelerated Twinrix Series was selected',
    'SeriesSelection(Hep A): Select 3-dose series if CVX 104 was administered as dose 1',
    'SeriesSelection(Hep A): Select 3-dose series if CVX 104 was administered as dose 1 and/or dose 2, and dose 2 was administered >= 24 days and < 6 months - 4 days from dose 1',
    'SeriesSelection(Hep A): Select 3-dose series if 3 doses administered and < 4 doses administered in 4-dose series',
    'SeriesSelection(Hep A): Select 3-dose series if Hep A 3-dose series with later dose has fewer doses remaining to complete the series than the Hep A 4-dose Accelerated Twinrix Series',
    'SeriesSelection(Hep A): If a shot in the Hep A 4-dose Accelerated Twinrix Series is invalid in the Hep A 3-dose Adult Series, mark any prior 3-dose Series doses as Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN in the 3-dose Series',
    'SeriesSelection(Hep A): If a shot in the Hep A 2-dose or 3-dose Series is invalid in the Hep A 2-dose Series, mark any prior 2-dose Series doses as Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN in the 2-dose Series',
    'SeriesSelection(Hep A): Select 2-dose series if 2-dose series is complete and 3-dose series is not complete or 2-dose series completed before 3-dose series',
    'SeriesSelection(Hep A): Finalize selection of the selected Hep A series if Hep B series selection is complete and Hep A series selection is not complete',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'HepA local series selection, same-day adult/pediatric precedence, final-dose interval overrides, Twinrix recommendation metadata, and adult high-risk recommendation are handled by HepA-specific TypeScript engine hooks.',
    testId: 'ice-hepa-rules',
  })),
  ...[
    'Hep B: Verify Adherence to the Maximum Valid Age for the Vaccine if HepB High Risk Infant Vaccine is Administered',
    'Hep B: Verify Adherence to the Maximum Valid Age for the Vaccine if Hep B Peds Less than 20 Vaccine is Administered',
    'Hep B: Ensure the Absolute Minimum Interval Between Doses 1 and 3 in the HepB 3-dose Twinrix Series is >= 6m-4d',
    'Hep B: Ensure the Absolute Minimum Interval Between Doses 1 and 4 in the HepB 4-dose Accelerated Twinrix Series is >= 12m-4d',
    'Hep B: Suppress check of the absolute minimum interval between doses when evaluating a CVX 189 if HEPLISAV-B Exception applies',
    'Hep B: Ensure the Absolute Minimum Interval Between Doses 1 and 3 in the HepB 3-dose Child/Adolescent Series is >= 108d',
    'Hep B: Ensure the Absolute Minimum Interval Between Doses 1 and 4 in the HepB 4-dose Child/Adolescent Series is >= 108d',
    'Hep B: Ensure the Absolute Minimum Interval Between Doses 2 and 4 in the HepB 4-dose Child/Adolescent Series is >= 52d',
    'Hep B: Enough is Enough Rule',
    'Hep B: Ensure the Absolute Minimum Interval Between Doses 1 and 3 in the 3-dose Adult Series is >= 16w-4d',
    'Hep B: Mark Series Complete if Two Adult Doses Given to Patient between >= 11 and < 16 Years of Age',
    'Hep B: Mark Series with 2 Doses of CVX 189 Complete regardless of any other prior Hep B shots administered',
    'Hep B: When evaluating a CVX 189 and the series is complete, if there is a prior VALID CVX 189, mark all intervening or prior Valid non-CVX 189 shots as ACCEPTED / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN',
    'Hep B: When evaluating a CVX 189, intervals to any prior non-CVX 189 shots are ignored if there is a prior valid CVX 189 dose at least 24 days apart',
    'Hep B: When evaluating a CVX 189, intervals to any prior non-CVX 189 shots are ignored and the prior shot is marked valid if there is a prior CVX 189 shot at least 24 days apart and the only reason it was not valid is BELOW_MINIMUM_INTERVAL',
    'Hep B: In Adult Series, remove evaluation reason VACCINE_NOT_ALLOWED_FOR_THIS_DOSE',
    'Hep B: Switch from Hep B 3-dose Child/Adolescent Series to 4-dose Series if dose 3 invalid only due to absolute minimum interval or absolute minimum age',
    'HepB: Recommend a Dose of HepB Conditionally if Patient >= 60 Years and No Previously Administered Doses',
    'HepB: Recommend both an earliest interval and recommended interval of 112 days between doses 1 & 3 for 3-dose Child/Adolescent Series',
    'HepB: Recommend both an earliest interval of 112 days and recommended interval of 6 months between doses 1 & 3 for Adult 3-dose Series',
    'HepB: Recommend both an earliest and recommended interval of 6 months between doses 1 & 3 for HepB 3-dose Twinrix Series',
    'HepB: Recommend both an earliest and recommended interval of 12 months between doses 1 & 4 for HepB 4-dose Accelerated Twinrix Series',
    'HepB: Recommend both an earliest and recommended interval of 16 weeks between doses 1 & 3 for the Hep-B 3-dose Child/Adolescent Series',
    'HepB: Recommend both an earliest and recommended interval of 16 weeks between doses 1 & 4 for the Hep-B 4-dose Child/Adolescent Series',
    'HepB: Recommend both an earliest and recommended interval of 56 days between doses 2 & 4 for the Hep-B 4-dose Child/Adolescent Series',
    'Hep B: Recommend CVX 189 (Hep B adjuvanted) for the Hep B 2-dose Adult Series',
    'Hep B: Recommend CVX 104 (Hep A-Hep B (Twinrix)) for the Hep B 3-dose Twinrix Series',
    'Hep B: Recommend CVX 104 (Hep A-Hep B (Twinrix)) for the Hep B 4-dose Accelerated Twinrix Series',
    'ABSTRACT SeriesSelection(Hep B): Determine child/adolescent series',
    'SeriesSelection(Hep B): Select already completed series that was completed on the same date and with the most doses if different completed series was previously selected',
    'SeriesSelection(Hep B): Select Hep B Child/Adolescent series if the patient is < 19 years of age when first shot was administered',
    'SeriesSelection(Hep B): Select Hep B Child/Adolescent Series if the patient is < 19 years of age, and no shots have been administered',
    'SeriesSelection(Hep B): Select the Hep B 3-dose Adult Series if the patient >= 19 years of age, and no shots have been administered',
    'SeriesSelection(Hep B): Select Hep B 3-dose Adult series if the patient is >= 19 years of age when first shot was administered ',
    'ABSTRACT SeriesSelection(Hep B): (valid) Dose 1 is CVX 189 administered at >= 18y-4d',
    'SeriesSelection(Hep B): Select Adult 2-dose Series is patient >= 18y-4d and < 19 years of age, 1 dose, and no other doses on record',
    'ABSTRACT SeriesSelection(Hep B): (valid) Dose 1 is CVX 189 administered at >= 18y-4d and < 19 years of age',
    'SeriesSelection(Hep B): For patient with CVX 189 dose 1 administered at >= 19 years of age, and no other doses on record, select the 2-dose Adult Series',
    'SeriesSelection(Hep B): For patient with CVX 189 dose at >= 18y-4d and < 19 years of age, and >= 1 dose and additional shots on record, select the Child/Adolescent Series if it has more doses than the Adult Series',
    'SeriesSelection(Hep B): For patient with CVX 189 at >= 18y-4d and < 19 years of age, and >= 1 dose and additional shots on record, select the 2-dose Adult Series if it has greater than or equal the number of doses as the Child/Adolescent Series',
    'ABSTRACT SeriesSelection(Hep B): (valid) Dose 1 is CVX 189 administered at >= 18y-4d and also >= 19 years of age',
    'SeriesSelection(Hep B): For patient with CVX 189 dose 1 administered at >= 19 years of age, and >= 1 dose and additional shots on record, select the 3-dose Adult Series if it has more doses than the 2-dose Adult Series',
    'SeriesSelection(Hep B): For patient with CVX 189 dose 1 administered at >= 19 years of age, and >= 1 dose and additional shots on record, select the 2-dose Adult Series if it has greater than or equal the number of doses as the Child/Adolescent Series',
    'SeriesSelection(Hep B): Select Child/Adolescent Series if it is complete',
    'SeriesSelection(Hep B): Select Child/Adolescent Series if Hep B Child/Adolescent Series has fewer doses remaining to complete the series than the Hep B 4-dose Accelerated Twinrix Series',
    'SeriesSelection(Hep B): If a shot in the Hep B 4-dose Accelerated Twinrix Series is invalid in the Hep B Child/Adolescent Series, mark any prior series doses as Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN in the Child/Adolescent Series',
    'SeriesSelection(Hep B): Select 3-dose Adult Series if Hep B 3-dose Adult Series has fewer doses remaining to complete the series than the Hep B 4-dose Accelerated Twinrix Series',
    'SeriesSelection(Hep B): If a shot in the Hep B 4-dose Accelerated Twinrix Series is invalid in the Hep B 3-dose Adult Series, mark any prior 3-dose Series doses as Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN in the 3-dose Series',
    'ABSTRACT SeriesSelection(Hep B): Dose 1 is CVX 104 and patient >= 18y-4d',
    'SeriesSelection(Hep B): Select 4-dose Accelerated Twinrix Series if Hep A and Hep B doses 1 and 2 are CVX 104 are 7-24 days apart and no prior Hep A doses administered',
    'SeriesSelection(Hep B): Select Child/Adolescent Series if Hep A and Hep B doses 1 and 2 are CVX 104 and 7-24 days apart and 3 doses administered and < 19 years of age',
    'SeriesSelection(Hep B): Select 3-dose Adult Series if Hep A and Hep B doses 1 and 2 are CVX 104 and 7-24 days apart and 3 doses administered and >= 19 years of age',
    'SeriesSelection(Hep B): Undo select of Hep B 3-dose Twinrix series if Hep A 3-dose Adult series was not selected',
    'SeriesSelection(Hep B): Undo select of Hep B 4-dose Twinrix series if Hep A 4-dose Twinrix series was not selected',
    'SeriesSelection(Hep B): Finalize selection of the Hep B 3-dose Twinrix series if Hep A 3-dose Adult series was selected',
    'SeriesSelection(Hep B): Finalize selection of the Hep B 4-dose Twinrix series if Hep A 4-dose Twinrix series was selected',
    'SeriesSelection(Hep B): Select 3-dose Twinrix Series if Hep A dose 1 is CVX 104 and no additional doses on record',
    'SeriesSelection(Hep B): Select 3-dose Twinrix Series if Hep A and Hep B doses 1 and 2 are CVX 104 and 24+ days apart',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'HepB selection, final-dose interval overrides, Heplisav-B completion, Twinrix product recommendation, and older-adult conditional recommendation are handled by HepB-specific TypeScript engine hooks.',
    testId: 'ice-hepb-rules',
  })),
  ...[
    'ABSTRACT SeriesSelection(MenB): Select MenB 4C 3-Dose Series if it has a (valid) dose 1 and but MenB 4C 2-Dose Series does not have a (valid) dose 1',
    'ABSTRACT SeriesSelection(MenB): Select MenB 4C 2-Dose Series if valid dose 1',
    'ABSTRACT SeriesSelection(MenB): Select MenB 4C 2-dose series if dose 1 is (CVX 163, CVX 328); target dose 2 (CVX 163, CVX 328) is Valid in 4C 2-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB 4C 3-dose series if dose 1 is (CVX 163, CVX 328) and target dose 2 (CVX 163, CVX 328) is Invalid for 4C 2-dose series but Valid for 4C 3-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB 4C 2-dose series if dose 1 is (CVX 163, CVX 328), target dose 2 (CVX 163, CVX 328) is Invalid in both 4C 2-dose series/3-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB FHbp 3-dose series if target dose 1 (CVX 162, CVX 316) is invalid for FHbp 2-dose series but valid for the FHbp 3-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB FHbp 2-dose series if target dose 1 (CVX 162, CVX 316) is Valid for both FHbp 2-dose series and FHbp 3-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB FHbp 2-dose series if dose 1 is (CVX 162, CVX 316); target dose 2 (CVX 162, CVX 316) is Valid in FHbp 2-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB FHbp 3-dose series if dose 1 is (CVX 162, CVX 316) and target dose 2 (CVX 162, CVX 316) is Invalid for FHbp 2-dose series but Valid for FHbp 3-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB FHbp 2-dose series if dose 1 is (CVX 162, CVX 316), target dose 2 (CVX 162, CVX 316) is Invalid in both FHbp 2-dose series/3-dose series',
    'ABSTRACT SeriesSelection(MenB): Select MenB 4C 2-Dose Series _or_ MenB 4C 3-Dose Series if both (CVX 162, CVX 316) and CVX 163 present, and latest shot date administered is CVX 163',
    'ABSTRACT SeriesSelection(MenB): Select MenB FHbp 2-Dose Series _or_ FHbp 4C 3-Dose Series if both (CVX 162, CVX 316) and CVX 163 present, and latest shot date administered is CVX 162',
    'Duplicate Shots/Same Day(MenB Abstract): If CVX 162 or CVX 316 is administered >= 10/25/2024 and on the same day as CVX 163 or CVX 328',
    'Duplicate Shots/Same Day (MenB- Series is Complete; $td Shot is Valid): If CVX 162 or CVX 316 is administered >= 10/25/2024 on the same day as CVX 163 on a date >= 10/25/2024, and the Series is complete, evaluate the shot that completes the Series as Valid and the other shot as Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day (MenB- Series is Complete; $tdother Shot is Valid): If CVX 162 or CVX 316 is administered >= 10/25/2024 on the same day as a CVX 163 or CVX 328 on a date >= 10/25/2024, and the Series is complete, evaluate the shot that completes the Series as Valid and the other shot as Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day (MenB- Series is Not Complete): If CVX 162 or CVX 316 is administered >= 10/25/2024 on the same day as CVX 163 or CVX 328 on a date >= 10/25/2024, and neither Series complete, evaluate the shot that completes the Series as Valid and the other shot as Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day MeningB Rule: If CVX 162 (or CVX 316) / CVX 163 (or CVX 328) reported on same day in the 4C 2-dose Series on a date < 10/25/2024, evaluate the CVX 162 as Invalid with reason DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day MeningB Rule: If CVX 162 (or CVX 316) / CVX 163 (or CVX 328) reported on same day in FBhp 2-dose or FBhp 3-dose Series < 10/25/2024, evaluate the CVX 163 as Invalid with reason DUPLICATE_SAME_DAY',
    'Mening B / FHbp 2-dose series: Evaluate CVX 163 as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN and Ignore Shot',
    'Mening B / FHbp 2-dose series: Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'Mening B / FBhp 2-dose series: Do not invoke default Absolute Minimum Age check for CVX 163 administered >= 10yrs-4days of age',
    'MenB(FHbp 3-Dose Series): Evaluate CVX 163 as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN and Ignore Shot',
    'MenB(FHbp 3-Dose Series): Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'MenB(FHbp 3-Dose Series): Regardless of the interval between dose 2 and target dose 3, if the Absolute Minimum Interval between dose 1 and target dose 3 >= 6 months-4 days, then evaluate the shot (target dose 3) as Valid',
    'MenB(4C 2-Dose Series): Evaluate CVX 162 or CVX 316 as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN and Ignore Shot',
    'MenB(4C 2-Dose Series): Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'MenB(4C 2-Dose Series): Do not invoke default Absolute Minimum Age check for CVX 162 or CVX 316 if administered on or after 10/25/2024 at >= 10 years-4 days of age',
    'MenB(4C 2-Dose Series): If dose 2 was administered >= 10/25/2024, the absolute minimum interval from the (valid) Dose 1 (_not_ necessarily the immediately prior shot) to target dose 2 is 6 months-4 days',
    'MenB(4C 2-Dose Series): If target dose 1 is administered < 10/25/2024, then modify DoseRule1 to the pre-10/25/2024 values as follows: (1) Absolute Minimum Age: 10y-4d; (2) Absolute Minimum Interval: 1m-4d',
    'MenB(4C 2-Dose Series): If target dose 2 is administered < 10/25/2024, then modify DoseRule1 to their pre-10/25/2024 values as follows: (i) Absolute Minimum Interval: 1m-4d',
    'MenB(4C 2-Dose Series): If dose 1 was administered < 10/25/2024, target dose 2 is CVX 163 is administered >= 10/25/2024, and the interval between the previous (unignored) shot is >= 4w-4d and < 4m-4d OR the interval from (valid) dose 1 is < 6m-4d, _switch_ to the 4C 3-dose Series',
    'MenB(4C 3-dose Series): Evaluate CVX 162 or CVX 316 as ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN and Ignore Shot',
    'MenB(4C 3-dose Series): Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'MenB(4C 3-dose Series): If a shot is administered < 10/25/2024 and the series is not complete, evaluate that shot as Invalid',
    'MenB(4C 3-Dose Series): Regardless of the interval between dose 2 and target dose 3, if the Absolute Minimum Interval between dose 1 and target dose 3 >= 6 months-4 days, then evaluate dose 3 as Valid',
    'Mening B: Do not recommend a specific vaccine if no (valid) doses have been administered',
    'Mening B: Recommend CVX 163 for the 2nd target dose in the MenB 4C 2-dose Series',
    'Mening B: Recommend CVX 163 for the 2nd target dose and later in the MenB 4C 3-dose Series',
    'Mening B: Recommend CVX 162 for the next target dose in the MenB FHbp 3-dose Series',
    'Mening B: Recommend CVX 162 for the next target dose in the MenB FHbp 2-dose Series',
    'Mening B: If a patient has at least one CVX 162 or CVX 316 and at least one CVX 163 or CVX 328, and a shot is recommended, include a recommendation with reason OTHER_VACCINE_PRODUCT_POSSIBLE',
    'Mening B: If the patient < 10yrs and no doses on record, recommendation is NOT_RECOMMENDED/BELOW_MINIMUM_AGE_HIGH_RISK_SERIES',
    'Mening B: If the patient >= 10yrs and < 16yrs and no doses on record, recommendation is CONDITIONAL/HIGH_RISK',
    'Mening B: If the patient >= 16yrs and < 24yrs and no doses on record, recommendation is CONDITIONAL/CLINICAL_PATIENT_DISCRETION',
    'Mening B: If the patient >= 24yrs and no doses on record, recommendation is CONDITIONAL/HIGH_RISK',
    'MeningB: Recommend minimum interval & recommended interval of at 6 months between doses 1 & 3 in FHbp 3-dose Series',
    'MenB(4C 3-Dose Series): Recommend minimum & recommended interval of at 6 months between doses 1 & 3',
    'MenB(4C 2-Dose Series): If (valid) dose 1 was >= 10/25/2024, the minimum interval & recommended interval is 6m from the (valid) dose 1 (*recommendationIntervalCheck*)',
    'MenB(4C 2-Dose Series): If the (valid) dose 1 was administered >= 10/25/2024, the minimum interval & recommended interval is 6m from the (valid) dose 1 (*earliestIntervalCheck*)',
    'MenB(4C 2-Dose Series; Target Dose 1; CRR): If no shots were administered and the evalTime < 10/25/2024, modify DoseRule1 as follows: (1) set the minimum age and recommended age to 10 years; (2) set the minimum interval and recommended interval from dose 1 to dose 2 to 1 month',
    'MenB(4C 2-Dose Series; Target Dose 1; CRR): If an (invalid) shot was 1 was administered < 10/25/2024, modify DoseRule1 as follows: (1) set the minimum age and recommended age to 10 years; (2) set the minimum interval and recommended interval from dose 1 to dose 2 to 1 month',
    'MenB(4C 2-Dose Series; Target Dose 2; CRR): If a (valid) dose 1 administered was < 10/25/2024, modify DoseRule1 as follows: (1) set the minimum age and recommended age to 10 years; (2) set the minimum interval and recommended interval from dose 1 to dose 2 to 1 month',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Meningococcal B product-family selection, same-day duplicate handling, wrong-family accepted doses, 2024 interval changes, and recommendation bands are handled by MenB-specific TypeScript engine hooks.',
    testId: 'ice-meningb-rules',
  })),
  ...[
    'Duplicate Shot/Same Day (Abstract): 2 shots administered on the same day',
    'Duplicate Shot/Same Day Overview Abstract Rule #5: Make notes if vaccines different, neither shot is an NOS CVX, neither shot is a combination, or both shots are a combination',
    'Duplicate Shots/Same Day: If a Series is potentially no longer complete after a shot has been marked Invalid / DUPLICATE_SAME_DAY, mark the series not complete if applicable',
    'Duplicate Shots/Same Day Overview Rule #1: If both shots are of the same CVX code, then evaluate the 1st CVX processed as Valid and evaluate the 2nd CVS processed as Invalid/Duplicate',
    'Duplicate Shots/Same Day Overview Rule (Dose Override): If one of the shots is a Dose Override marked as Valid and the other shot is not a Dose Override, evaluate the shot that is _not_ a Dose Override as Invalid with a reason code of DUPLICATE_SHOT_SAME_DAY',
    'Duplicate Shots/Same Day Overview Rule #2: If one of those shots is an NOS CVX, then evaluate the NOS as Invalid with a reason code of DUPLICATE_SAME_DAY and evaluate the other (non-NOS) CVX as Valid',
    'Duplicate Shots/Same Day Overview Rule #3: If neither shot is an NOS CVX, if one is a combination vaccine and the other is not a combination vaccine, then evaluate the combination CVX as Valid and evaluate the non-combination CVX as Invalid with a reason code of DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day Overview Rule #3 (Evaluation Order): If neither shot is an NOS CVX and is a combination vaccine that targets as many or more diseases than the other, then evaluate the combination CVX as Valid and evaluate the non-combination CVX as Invalid with a reason code of DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day Overview Rule #4: If both shots are an NOS CVX, then evaluate the 1st CVX processed as Valid and evaluate the 2nd CVX processed as Invalid with a reason code of DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day: If a shot is ACCEPTED/EXTRA_DOSE and has the same dose number as a valid shot, then evaluate ACCEPTED/EXTRA_DOSE as Invalid with a reason code of DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day: If a shot is INVALID with no reason code and there is a VALID dose on the same day, add the reason DUPLICATE_SHOT_SAME_DAY to the Invalid shot',
    'Duplicate Shot/Same Day: If this is a duplicate shot/same day, mark the dose number of the shot being evaluated as equal to prior shots administered on the same date; Invoke custom evaluation rules',
    'Duplicate Shot/Same Day: duplicate shots on same day where interval is 0 days are not marked with the same dose number; Invoke custom evaluation rules',
    'Not Duplicate Shot/Same Day: No duplicate shots to shot being evaluated; Invoke custom evaluation rules',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Shared same-day duplicate preclassification is represented by the TypeScript duplicate-dose ordering and invalidation pass before disease-specific hooks run.',
    testId: 'ice-dtp-rules/ice-pneumococcal-rules/ice-covid19-rules',
  })),
  ...[
    'RecommendationForecast: Make a Record of all Non-Seasonal TargetSeries of the Vaccine Group for Series Selection Display purposes, if the Series Selection Display Option is Enabled',
    'RecommendationForecast: Maka a Record of Seasonal TargetSeries in the Current Season of the Vaccine Group for Series Selection Display purposes, if the Series Selection Display Option is Enabled',
    'RecommendationForecast.findMostRecentAdministeredLiveVirusVaccineDate',
    'RecommendationForecast.setNextSeasonalTargetSeriesForRecommendation',
    'RecommendationForecast.setNextNonSeasonalTargetSeriesForRecommendation',
    'RecommendationForecast.applyPostRecommendationCheck',
    'RecommendationForecast.noteCompletionOfPostRecommendationCheck - Do _not_ reprocess recommendation rules',
    'RecommendationForecast.noteCompletionOfPostRecommendationCheck - _Do_ reprocess recommendation rules',
    'RecommendationForecast.finalizeRecommendationsForSeries',
    'RecommendationForecast.addAnyRecommendationsOnFactListToSeries',
    'RecommendationForecast.allRecommendationRulesProcessedForSeries',
    'RecommendationForecast.recommendBasedOnEarliestAgeRule',
    'RecommendationForecast.recommendBasedOnEarliestIntervalRule',
    'RecommendationForecast.recommendBasedOnLatestRecommendedAgeRule',
    'RecommendationForecast.recommendBasedOnLatestRecommendedIntervalRule',
    'RecommendationForecast.recommendBasedOnEarliestRecommendedAgeRule',
    'RecommendationForecast.recommendBasedOnRecommendedIntervalRule',
    'RecommendationForecast.Do Not Apply Earliest Interval for Dose 1 if Prior Shot for Target Dose 1 was Invalid due to Below Minimum Age',
    'RecommendationForecast.Do Not Apply Recommended Interval for Dose 1 if Prior Shot for Target Dose 1 was Invalid due to Below Minimum Age',
    'RecommendationForecast: Recommend Earliest Recommended Age Date in Next Series Season as Specified by Default Season Series Rule if no next Fully-Specified Season Defined and during the Off-Season of Current Seasonal Series',
    'RecommendationForecast: Recommend at Earliest Recommended Age Date in Next Series Season as Specified by TargetSeries if Fully-Specified Season Defined and if during the Off-Season of Current Seasonal Series',
    'RecommendationForecast: Recommend Next Season Earliest Start Date if during the Off-Season of Current Seasonal Series',
    'RecommendationForecast: Recommend Next Season Recommended Start Date if during the Off-Season of Current Seasonal Series',
    'RecommendationForecast: Recommend Next Season Start Date if Current Seasonal Series is Complete',
    'RecommendationForecast/Post Recommendation Check: Recommend Next Season Start Date if Final Recommendation Date during Off-Season',
    'RecommendationForecast/Post Recommendation Check: Recommend Not Recommended and Complete if Final Recommendation Date after End Date and there is no Off-Season',
    'RecommendationForecast.recommendEarliestDateOnOrAfterLastShotGiven',
    'RecommendationForecast.recommendRecommendedDateOnOrAfterLastShotGiven',
    'RecommendationForecast.recommendOverdueDateOnOrAfterLastShotGiven',
    'RecommendationForecast.adjustEarliestDateDueToLiveVirusToFutureDate',
    'RecommendationForecast.adjustPriorEarliestDateDueToLiveVirusToCurrentDate',
    'RecommendationForecast.adjustRecommendedDateDueToLiveVirusToFutureDate',
    'RecommendationForecast.adjustRecommendedDateDueToLiveVirusToCurrentDate',
    'RecommendationForecast.adjustTargetSeriesEnclosedRecommendationWithRespectToEvalTime',
    'RecommendationForecast.adjustRecommendedStatusAndEnclosedRecommendationsWithRespectToEvalTime',
    'RecommendationForecast.doNotReturnForecastDateForConditionalRecommendations',
    'RecommendationForecast.recommendedAtVaccineGroupLevelIfRecommendedVaccinesNotConsistentWithRecommendationObjects',
    'RecommendationForecast.recommendedAtVaccineGroupLevelIfRecommendedVaccinesNotConsistentWithTargetSeries',
    'RecommendationForecast.recommendedAtVaccineLevelIfRecommendedVaccinesConsistentWithRecommendationObjects',
    'RecommendationForecast.recommendedAtVaccineGroupLevelIfNotRecommendedForecast',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Generic TypeScript recommendation construction derives forecast dates, recommendation status/reasons, selected vaccine granularity, seasonal rollover, and final display metadata directly from target-dose rules and disease-specific recommendation hooks.',
    testId: 'ice-covid19-rules/ice-rsv-rules/ice-hpv-rules/ice-hepb-rules',
  })),
  ...[
    'Check if the Shot is Too Early Due to Live Virus Conflict with live virus shot < 24 days in the same vaccine group',
    'Check if the Shot is Too Early Due to Live Virus Conflict with live virus shot < 28 days in a different vaccine group',
    'Check if the Shot is Too Early Due to Live Virus Conflict with live virus shot < 28 days between two combination vaccines',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'TypeScript live-virus conflict handling invalidates MMR/MMRV/varicella-family doses with TOO_EARLY_LIVE_VIRUS and applies yellow-fever live-virus recommendation spacing across forecast results.',
    testId: 'assertMmrLiveVirusInterval/assertYellowFeverLiveVirusRecommendationInterval',
  })),
  ...[
    'RecommendationForecast.findMostRecentAdministeredSelectAdjuvantProductVaccineDate',
    'RecommendationForecast.adjustEarliestDateDueToSelectAdjuvantProductToFutureDate',
    'RecommendationForecast.adjustEarliestDateDueToSelectAdjuvantProductToCurrentDate',
    'RecommendationForecast.adjustRecommendedDateDueToSelectAdjuvantProductToFutureDate',
    'RecommendationForecast.adjustRecommendedDateDueToSelectAdjuvantProductToCurrentDate',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'TypeScript cross-series recommendation post-processing finds the most recent administered select-adjuvant product and clamps select-adjuvant earliest/recommended forecast dates to the ICE 28-day spacing date or current adjuvant date.',
    testId: 'ice-common-rules/assertSelectAdjuvantRecommendationSpacing',
  })),
  ...[
    'Evaluate the Age when the Shot Administered is Before the Birthdate',
    'Evaluate the Interval when the Shot Administered is Before the Birth Date',
    'Recommend No Earliest Interval When Prior Dose Before DOB',
    'Recommend No Recommended Interval When Prior Dose Before DOB',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Generic TypeScript evaluation marks administered shots before patient birth date as PRIOR_TO_DOB and suppresses routine interval forecast candidates from pre-DOB prior doses.',
    testId: 'ice-common-rules/assertBeforeBirthDefensiveHandling',
  })),
  ...[
    'Series Display(Abstract): Determine Series Display Options Enabled',
    'Series Display(Abstract): Determine Series Display Selection',
    'ProcessResults: Mark Unprocessed Shots as Vaccine Not Supported',
    'ProcessResults: Return Evaluations',
    'ProcessResults: Return Recommendations for Vaccines Not Supported',
    'ProcessResults: Check Non-Seasonal Series Selection Consistency',
    'ProcessResults: Check Non-Seasonal Series Selection Completed',
    'ProcessResults: Check Seasonal SeriesSelection Consistency',
    'ProcessResults: Check Seasonal Series Selection Completed',
    'ProcessResults: Return Recommendation for Non-Seasonal Series',
    'ProcessResults: Return Recommendations For Seasonal Series',
    'Series Display: Mark Selected Series as Unambiguous for Display if there is only one configured series for the Vaccine Group',
    'Series Display: Mark Selected Series as Best Guess for Display when there are more than one configured series for the Vaccine Group',
    'Series Display: Invoke Series Display Custom Rules',
    'Series Display: For any remaining series display selections set to SERIES_DISPLAY_NOT_SELECTED, change the series display selection to SERIES_DISPLAY_NONE',
    'Series Display: Set Number of Doses Remaining to Recommendation for a Series that is Not Complete',
    "Series Display: Set Number of Doses Remaining to Zero Doses for a Series that is Not Recurring and Complete; 'however, one or more additional doses may still be recommended'",
    'Series Display: Set Number of Doses Remaining to Zero Doses for a Series that is Not Recurring and Complete',
    "Series Display: Set Number of Doses Remaining to 'Recurring' for a Series that is Complete and Recurring",
    'Series Display: Append N/A for Doses Remaining to Recommendation for a Series that is Not Recommended',
    'Series Display: Output Series Display Selections and Number of Doses Remaining for Each Vaccine Group',
    'BounceAllEntities',
    'BounceAllClinicalStatements',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'ICE Java process-result metadata is represented in TypeScript by returning selected series, target-dose, recommendation, and unsupported-shot metadata directly without a separate display-option agenda.',
    testId: 'probeIceRulePorts',
  })),
  ...[
    'ImmunizationReferenceData.Initialize Immunization Schedule and Supporting Data',
    'ImmunizationReferenceData.Initialize Focal Person Id',
    'ImmunizationReferenceData: Initialize Live Virus Fact Object',
    'ImmunizationReferenceData: Initialize Select Adjuvant Product Fact Object',
    'ImmunizationReferenceData: Initialize Dose Override Feature Fact Object',
    'ImmunizationReferenceData: Initialize Unsupported Vaccines Group Feature Fact Object',
    'InitializeReferenceData: Output Number of Doses Remaining Fact Object',
    'InitializeReferenceData: Output Series Information Fact Object',
    'ImmunizationReferenceData: Initialize Target Seasons Fact Object',
    'InitializeSeriesAndSeasons: Load SeriesRules and TargetDoseInitializationTracker on to Fact List',
    'InitializeSeriesAndSeasons: Insert SeriesRules Seasons into TargetSeasons',
    'InitializeSeriesAndSeasons: Load Default Seasons on to FactList if not already there',
    'InitializeSeriesAndSeasons: Update Seasons in Working Memory with Information from TargetSeasons',
    'InitializeSeriesAndSeasons: Update Fully-Specified Seasons in Series with Information from TargetSeasons',
    'InitializeSeriesAndSeasons: Log TargetSeasons Tracked for this Request',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'ICE Java reference-data and season fact initialization is represented by TypeScript dataset loading, target-series construction, and direct forecast output structures.',
    testId: 'probeIceRulePorts',
  })),
  ...[
    'CandidateSeriesIdentification: Initialize TargetSeries Custom Rules Invocation',
    'CandidateSeriesIdentification: Initialize TargetSeries for non-seasonal vaccine groups',
    'CandidateSeriesIdentification: Initialize TargetSeries for *Current* Season with Fully-Specified Season Parameters (if defined)',
    'CandidateSeriesIdentification: Initialize *Current* Season TargetSeries with Default Season Parameters if Current Not Defined for the Vaccine Group',
    'CandidateSeriesIdentification: Initialize *Past* Season TargetSeries when Shots Administered with Fully-Specified Season Parameters if Fully-Specified Season Parameters Defined for the Season',
    'CandidateSeriesIdentification: Initialize *Past* Season TargetSeries when Shots Administered with Default Season Parameters if No Fully-Specified Season Parameters Defined for the Season',
    'CandidateSeriesIdentification: Initialize TargetSeries when Shots Administered when One and Only One Season for Vaccine Group exists and no matching Fully-Specified Season Parameters or Default Season Defined for the Season',
    'CandidateDosesIdentification: Initialize TargetDose Custom Rules Invocation',
    'CandidateDosesIdentification: Initialize TargetDose in *Non-Seasonal* TargetSeries',
    'CandidateDosesIdentification: Initialize TargetDose in *Seasonal* TargetSeries',
    'CandidateDosesIdentification: Initialize Outlier TargetDose into Existing TargetSeries',
    'CandidateDosesRevisions: Initialize Series Aggregation Custom Rules Invocation',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'TypeScript candidate series and target-dose construction is performed directly from the loaded ICE series/dose metadata before disease-specific hooks run.',
    testId: 'probeIceRulePorts',
  })),
  ...[
    'CandidateDosesIdentification: Initialize TargetDose in Meningococcal ACWY or Meningococcal B Vaccine Group Series',
    'CandidateDosesIdentification: Initialize Meningococcal B vaccines (CVX 162, 163) in the Meningococcal B vaccine group',
    'CandidateDosesIdentification: Initialize Meningococcal vaccine (CVX 316) in the Meningococcal B vaccine group',
    'CandidateDosesIdentification: Initialize Meningococcal vaccine (CVX 328) in the Meningococcal B vaccine group',
    'CandidateDosesIdentification: Initialize Meningococcal vaccines (CVX 114, 136, 32, 108, 147) in the Meningococcal ACWY vaccine group',
    'CandidateDosesIdentification: Initialize Meningococcal vaccine (CVX 316) in the Meningococcal ACWY vaccine group',
    'CandidateDosesIdentification: Initialize Meningococcal vaccine (CVX 328) in the Meningococcal ACWY vaccine group',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Meningococcal ACWY and MenB target-dose candidate construction is represented by TypeScript CVX-to-vaccine-group targeting before MenB/MCV evaluation and selection hooks run.',
    testId: 'ice-meningb-rules/ice-mcv-rules',
  })),
  ...[
    'HistoryEvaluation.evaluateNonSeasonalSeriesWhenNoTargetDosesForEvaluation',
    'HistoryEvaluation.setNonSeasonalNextTargetDoseNonNOSInSeriesForEvaluation',
    'HistoryEvaluation.setNonSeasonalNextTargetDoseNOSInSeriesForEvaluation',
    'HistoryEvaluation.evaluateSeasonalSeriesWhenNoTargetDosesForEvaluation',
    'HistoryEvaluation.setNextSeasonalTargetDoseNonNOSInSeriesForEvaluation',
    'HistoryEvaluation.setNextSeasonalTargetDoseNOSInSeriesForEvaluation',
    'HistoryEvaluation: If Dose Override Specified, set Dose Evaluation Status Accordingly and Bypass Evaluation Logic',
    'HistoryEvaluation: Determine & Record if the Selected TargetDose to be Evaluated is a Primary Shot of the Series, and Initialize the TargetDose Shot Number and Dose Number',
    'HistoryEvaluation.setDoseEvaluationStatusInvalid',
    'HistoryEvaluation.setDoseEvaluationStatusNotEvaluated',
    'HistoryEvaluation.setDoseEvaluationStatusAccepted',
    'HistoryEvaluation.setDoseEvaluationStatusValid',
    'HistoryEvaluation.denoteDoseReadyForFinalEvaluationStatus',
    'HistoryEvaluation.captureEvaluationContext',
    'HistoryEvaluation.markExtraneousDosesAcceptedIfCompleteForAllDiseaseTargetedByThisDose',
    'HistoryEvaluation.checkIsAllowableVaccine',
    'HistoryEvaluation.checkMinimumAgeVaccine',
    'HistoryEvaluation.checkMinimumAgeVaccineDoseRule',
    'HistoryEvaluation.checkMaximumAgeVaccine',
    'HistoryEvaluation.checkMaximumAgeVaccineDoseRuleDoseRule',
    'HistoryEvaluation.checkMinimumDateVaccine',
    'HistoryEvaluation.checkMaximumDateVaccine',
    'HistoryEvaluation.evaluateVaccineGroupMaximumAge',
    'HistoryEvaluation.evaluateVaccineGroupMinimumAge',
    'HistoryEvaluation.evaluateVaccineGroupMinimumInterval',
    'HistoryEvaluation: Evaluate minimum interval between first shot in seasonal series and most recent shot from a prior season',
    'HistoryEvaluation: Evaluate Shot as Invalid if it is not between the Season Start and End Dates',
    'HistoryEvaluation: If all shots have been evaluated, take immunity dates into account to determine if series is complete',
    'HistoryEvaluation: Set Disease Immunity Flag in Series to True if Immune to All Diseases Tracked by this Series as of the Evaluation Time',
    'DiseaseImmunityRecord.MarkImmuneToDiseaseIfOnOrAfterImmunityDate',
    'HistoryEvaluation: Check if Shot should be marked Accepted and Series Complete if Administered On or After Immunity Date',
    'RecommendNotRecommendedIfImmuneToAllDiseasesInSeries',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Generic TypeScript history evaluation applies selected target-dose matching, allowed-vaccine checks, age/date/interval validity, status finalization, extraneous-dose handling, seasonal bounds, and disease-immunity completion directly in the evaluator.',
    testId: 'ice-immunity-rules/ice-covid19-rules/ice-hpv-rules/ice-pneumococcal-rules',
  })),
  ...[
    'Evaluation(Any): Remove IceFact if corresponding shot is no longer in the Fact List',
    'Evaluation(Any): Remove IceFact if corresponding shot is no longer in the TargetSeries',
    'Evaluation(Any): Remove IceFact if corresponding TargetSeries is no longer in the Fact List',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'The TypeScript engine does not maintain mutable Java working-memory facts; stale evaluation facts are avoided by deriving each evaluation from the current request inputs and selected target series.',
    testId: 'probeIceRulePorts',
  })),
  ...[
    'SeriesSelection: Insert TargetSeriesSelection (Tracker) on to the Fact List for each Vaccine Group/Season',
    'SeriesSelection: Initialize Next Non-Seasonal TargetSeriesSelection',
    'SeriesSelection: Initialize Next Seasonal TargetSeriesSelection',
    'SeriesSelection: Default Series Selection Preprocess rule: invoke custom rules',
    'SeriesSelection: Change Series Selection Status To Complete',
    'SeriesSelection: Retract All Series Not Selected in the same Series Group and Vaccine Group',
    'SeriesSelection: Select already completed series that has the fewest doses defined if exists and no series was previously selected',
    'SeriesSelection: Select already _completed_ series with earliest completion date if exists and a different, _completed_ series was previously selected',
    'SeriesSelection.SelectOnlySeriesRemainingInVaccineGroup',
    'SeriesSelection: For the Seasonal Series being evaluated for SeriesSelection that is not in the current season, set patient age time of interest to last date of season if no shots administered and invoke custom rules',
    'SeriesSelection: For the Seasonal Series being evaluated for SeriesSelection that is not in the current season, set patient age time of interest to last shot of the series and invoke custom rules',
    'SeriesSelection: For the Seasonal Series being evaluated for SeriesSelection that is in the current season, set patient age time of interest to the execution time and invoke custom rules',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Common TypeScript series-selection orchestration evaluates candidate series directly and returns a single selected series using completion, seasonal age context, and custom hook results.',
    testId: 'probeIceSelection/ice-covid19-rules',
  })),
  ...[
    'SeriesSelection.SelectOnlyZOSTER_SERIES',
    'SeriesSelection.SelectPoliofIPVSeries when first 2 valid doses are CVX 324',
    'SeriesSelection.SelectPolio4DoseSeries',
    'SeriesSelection.SelectOnlyMCVSeries',
    'SeriesSelection.SelectOnlyPNEUMOCOCCAL_SERIES',
    'SeriesSelection.SelectAdultPNEUMOCOCCAL_SERIES',
    'SeriesSelection.SelectChildPNEUMOCOCCAL_SERIES',
    'SeriesSelection(MenB): Select MenB 4C 2-Dose Series by default',
    'SeriesSelection(MenB): Select the MenB series with the most doses if no series is complete',
    'SeriesSelection(MenB FHbp): Select 3-dose series if both 2-dose and 3-dose series are complete but the 3-dose series was completed on the same day or before the 2-dose series',
    'SeriesSelection(MenB 4C): Select 3-dose series if both 2-dose and 3-dose series are complete but the 3-dose series was completed on the same day or before the 2-dose series',
    'SeriesSelection(MenB): Select Complete Series',
    'SeriesSelection(MenB): Select available MenB 4C 3-dose if there is no MenB 4C 2-dose Series and a MenB 4C Series should be selected',
    'SerieSelection(MenB): Select MenB 4C 3-dose series if target dose 1 (CVX 163, CVX 328) is Valid; series _is_ complete',
    'SerieSelection(MenB): Select MenB 4C 3-dose series if target dose 1 (CVX 163, CVX 328) is Valid; series is _not_ complete',
    'SerieSelection(MenB): Select MenB 4C 2-dose series if target dose 1 (CVX 163, CVX 328) is Valid; series _is_ complete',
    'SerieSelection(MenB): Select MenB 4C 2-dose series if target dose 1 (CVX 163, CVX 328) is Valid; series is _not_ complete',
    'SerieSelection(MenB): Select MenB 4C 2-dose series if dose 1 is (CVX 163, CVX 328); target dose 2 (CVX 163, CVX 328) is Valid for 4C 2-dose series; 4C 2-dose series _is_ complete',
    'SerieSelection(MenB): Select MenB 4C 2-dose series if dose 1 is (CVX 163, CVX 328); target dose 2 (CVX 163, CVX 328) is Valid for 4C 2-dose series; 4C 2-dose series is _not_ complete',
    'SerieSelection(MenB): Select MenB 4C 3-dose series if dose 1 is (CVX 163, CVX 328); target dose 2 (CVX 163, CVX 328) is Invalid for 4C 2-dose series, Valid for 4C 3-dose series; 4C 4C 4C 4C 3-dose series _is_ complete',
    'SerieSelection(MenB): Select MenB 4C 3-dose series if dose 1 is CVX 163; target dose 2 (CVX 163) is Invalid for 4C 2-dose series, Valid for 4C 3-dose series; 4C 3-dose series is _not_ complete',
    'SeriesSelection(MenB): Select MenB 4C 2-dose series if dose 1 is (CVX 163, CVX 328), target dose 2 (CVX 163, CVX 328) is Invalid in both MenB 4C 2-dose series/3-dose series but series is complete',
    'SeriesSelection(MenB): Select MenB 4C 2-dose series if dose 1 is (CVX 163, CVX 328), target dose 2 (CVX 163, CVX 328) is Invalid in both MenB 4C 2-dose series/3-dose series, series is not complete, and there are no other series complete',
    'SerieSelection(MenB): Select MenB FHbp 3-dose series if target dose 1 (CVX 162, CVX 316) is Invalid for FHbp 2-dose series, valid for FHbp 3-dose series; FHbp 3-dose series _is_ complete',
    'SerieSelection(MenB): Select MenB FHbp 3-dose series if target dose 1 (CVX 162, CVX 316) is Invalid for FHbp 2-dose series, valid for FHb3 3-dose series; FHbp 3-dose series is _not_ complete',
    'SerieSelection(MenB): Select MenB FHbp 2-dose series if dose 1 (CVX 162, CVX 316) is Valid for both FHbp 2-dose series/FHbp 3-dose series; FHbp 2-dose series _is_ complete',
    'SerieSelection(MenB): Select MenB FHbp 2-dose series if dose 1 (CVX 162) is Valid for both FHbp 2-dose series/FHb3 3-dose series; FHbp 2-dose series is _not_ complete',
    'SerieSelection(MenB): Select MenB FHbp 2-dose series if dose 1 is (CVX 162, CVX 316); target dose 2 (CVX 162, CVX 316) is Valid for FHbp 2-dose series; FHbp 2-dose series _is_ complete',
    'SerieSelection(MenB): Select MenB FHbp 2-dose series if dose 1 is (CVX 162, CVX 316); target dose 2 (CVX 162, CVX 316) is Valid for FHbp 2-dose series; FHbp 2-dose series is _not_ complete',
    'SerieSelection(MenB): Select MenB FHbp 3-dose series if dose 1 is (CVX 162, CVX 316); target dose 2 (CVX 162, CVX 316) is Invalid for FHbp 2-dose series, Valid for FHbp 3-dose series; FHBp 3-dose series _is_ complete',
    'SerieSelection(MenB): Select MenB FHbp 3-dose series if dose 1 is CVX 162; target dose 2 (CVX 162, CVX 316) is Invalid for FHbp 2-dose series, Valid for FHbp 3-dose series; FHbp 3-dose series is _not_ complete',
    'SeriesSelection(MenB): Select MenB FHbp 2-dose series if dose 1 is (CVX 162, CVX 316), target dose 2 (CVX 162) is Invalid in both MenB FHbp 2-dose series/3-dose series but series is complete',
    'SeriesSelection(MenB): Select MenB FHbp 2-dose series if dose 1 is (CVX 162, CVX 316), target dose 2 (CVX 162, CVX 316) is Invalid in both MenB FHbp 2-dose series/3-dose series, series is not complete, and there are no other series complete',
    'SeriesSelection(MenB): Select MenB FHbp 2-Dose Series _or_ FHbp 3-Dose Series if all shots administered are CVX 162',
    'SeriesSelection(MenB): Select MenB 4C 2-Dose Series _or_ 4C 3-Dose Series if all shots administered are CVX 163',
    'SeriesSelection(MenB): Select MenB 4C 2-Dose Series if both (CVX 162, CVX 316) and CVX 163 present, last shot administered is CVX 163, Series is complete, and 4C 3-Dose Series is _not_ complete',
    'SeriesSelection(MenB): Select MenB 4C 3-Dose Series if both (CVX 162, CVX 316) and CVX 163 present, last shot administered is CVX 163, Series is complete, and 4C 2-Dose Series is _not_ complete',
    'SeriesSelection(MenB): Select MenB FHbp 2-Dose Series if both (CVX 162, CVX 316) and CVX 163 present, last shot administered is CVX 162, Series is complete, and FHbp 3-Dose Series is _not_ complete',
    'SeriesSelection(MenB): Select MenB 4C 3-Dose Series if both (CVX 162, CVX 316) and CVX 163 present, last shot administered is CVX 163, Series is complete, and FHbp 2-Dose Series is _not_ complete',
    'SeriesSelection(MenB): If one or more Series is complete, select the Series that completed first (and did not complete on the same day)',
    'SeriesSelection.SelectByDefaultHIB_4_DOSE_SERIES',
    'SeriesSelection.SelectHIB_OMP_SERIESIfFirstDoseHibOMPBefore7MonthsAndOnlyOneValidDoseTotal',
    'SeriesSelection.SelectHIB_OMP_SERIESIfTwoDosesHibOMPOneBefore7MonthsOtherBefore12Months',
    'SeriesSelection.HepADoNOTSelectAlreadyCompleteSeriesWithFewestDosesIfExistsAndOtherSeriesPreviouslySelected',
    'SeriesSelection.SelectOnlyMMRSeries',
    'SeriesSelection.SelectOnlyVaricellaSeries',
    'SeriesSelection.SelectROTAVIRUS_3_DOSE_SERIESDefault',
    'SeriesSelection.SelectROTAVIRUS_3_DOSE_SERIESIfCertainVaccinesAdministered',
    'SeriesSelection.SelectROTAVIRUS_2_DOSE_SERIESIf1DoseRV1',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Common and vaccine-specific TypeScript series-selection hooks choose the selected target series by product family, completion state, dose history, and age-specific fallback rules.',
    testId:
      'ice-meningb-rules/ice-hib-rules/ice-polio-rules/ice-pneumococcal-rules/ice-rotavirus-rules/ice-mmr-rules/ice-varicella-rules',
  })),
  ...[
    'Duplicate Shots/Same Day Polio Rule: If one of those shots is OPV (CVX 02, 182) and the other is not, evaluate the OPV as Invalid with a reason code of DUPLICATE_SAME_DAY and evaluate the other as Valid',
    'Polio: (Polio4DoseSeries Complete with 3 Doses Rule 2) - Series is Complete if 3 prior doses, patient >= 4yrs-4d when dose 3 administered, and dose 3 >= 6m-4d after previous dose',
    'Polio: (PoliofIPVSeries Complete with 4 Doses Rule 2) - Series is Complete if 4 prior doses, patient >= 4yrs-4d when dose 4 administered, and dose 4 >= 6m-4d after previous dose',
    'Polio: Polio4DoseSeries - Modify DoseRule4 Absolute minimum age and Absolute Minimum Interval parameters for target dose 4 if administered before 8/7/2009',
    'Polio: PoliofIPVSeries - Modify DoseRule4 Absolute minimum age and Absolute Minimum Interval parameters for target dose 5 if administered before 8/7/2009',
    'Polio: Polio4DoseSeries - Mark target dose 4 administered >= 8/7/2009 and before absolute minimum age as VALID with reason EXTRA_DOSE',
    'Polio: PoliofIPVDoseSeries - Mark target dose 5 administered >= 8/7/2009 and before absolute minimum age as VALID with reason EXTRA_DOSE',
    'Polio: Booster Dose >=18 first booster dose is valid',
    'Polio: Mark OPV shots (CVX 178 or CVX 179) as INVALID with reason MISSING_ANTIGEN and ignore the shot',
    'Polio: Mark OPV shots (CVX 178 or CVX 179) as INVALID with reason MISSING_ANTIGEN and ignore the shot, but only for potential booster shots',
    'Polio: Mark OPV CVX 02 shots administered >= 4/1/2016 as INVALID with reason MISSING_ANTIGEN',
    'Polio: Mark OPV CVX 02 shots administered >= 4/1/2016 as INVALID with reason MISSING_ANTIGEN, but only for potential booster shots',
    'Polio: Mark OPV CVX 182 shots administered >= 4/1/2016 as INVALID with reason MISSING_ANTIGEN',
    'Polio: Mark OPV CVX 182 shots administered >= 4/1/2016 as INVALID with reason MISSING_ANTIGEN, but only for potential booster shots',
    'Polio: CVX 324 not valid in Polio4Dose Series',
    'Polio: CVX 89 shots administered >= 4/1/2016',
    'Polio: Polio4DoseSeries - Series complete with 4 doses if target dose 4 received < 8/7/2009 or after 4 years - 4 days of age',
    'Polio: PoliofIPVSeries - Series complete with 6 doses if target dose 5 received < 8/7/2009 or after 4 years - 4 days of age',
    'Polio: If a patient is >=18 years old and has completed the series and has received one booster dose after series completion',
    'Polio: If a patient is >= 18 years old and has completed the series',
    'Polio: If a patient is >= 18 years old and has no shots on record',
    'Polio: Polio4DoseSeries - If the execution date is before 8/7/2009, modify the Minimum Age of DoseRule 4 to 126 days & the Minimum Interval of DoseRule 3 to 28 days',
    'Polio: PoliofIPVSeries - If the execution date is before 8/7/2009, modify the Minimum Age of DoseRule 5 to 126 days & the Minimum Interval of DoseRule 4 to 28 days',
    'Polio: Polio4DoseSeries - If the execution date is before 8/7/2009 and the calculated Earliest Date for Dose 4 is after 8/7/2009, reset the Minimum Age & Minimum Interval back to their original values (4y & 6m, respectively) and recalculate',
    'Polio: PoliofIPVSeries - If the execution date is before 8/7/2009 and the calculated Earliest Date for Dose 5 is after 8/7/2009, reset the Minimum Age & Minimum Interval back to their original values (4y & 6m, respectively) and recalculate',
    'Polio: Polio4DoseSeries - If patient >= 4 yrs (or will be >= 4 yrs for target dose 3 recommendation date), include recommendation at 4yrs of age; minimum & recommended interval of 6m from prior administered shot for target dose 3',
    'Polio: PoliofIPVSeries - If patient >= 4 yrs (or will be >= 4 yrs for target dose 4 recommendation date), include recommendation at 4yrs of age; minimum & recommended interval of 6m from prior administered shot for target dose 4',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'Polio duplicate-dose, product validity, completion, booster, and forecast rules are handled by Polio-specific TypeScript engine hooks.',
    testId: 'ice-polio-rules',
  })),
  ...[
    'CandidateDosesRevisions(RSV): If there are no shots administered in the RSV Infant Series and the patient is greater than or equal to the series begin age of the RSV Adult Series, remove the RSV Infant TargetSeries from consideration',
    'CandidateDosesRevisions(RSV): If there are no shots administered in the RSV Adult Series and the patient is less than or equal to the series end age of the RSV Infant Series, remove the RSV Adult TargetSeries from consideration',
    'CandidateDosesRevisions(RSV): If there are shots adminstered > the Series End Date of the RSV Infant Series and >= the Series Start Date of the RSV Adult Series, remove the TargetDose from the RSV Infant TargeSeries',
    'CandidateDosesRevisions(RSV): If there are shots adminstered < the Series Start Date of the RSV Adult Series and <= the Series End Date of the RSV Infant Series, remove the TargetDose from the RSV Adult TargetSeries',
    'CandidateSeriesIdentification(RSV): If there are exactly 2 RSV series whereby the Infant Series has a patientEndAge that is 1 day less than the patientStartAge of the Adult Series, invoke series identification workflow',
    'CandidateSeriesIdentification(RSV): Prevent the default CandidateSeriesIdentification rules from running on the RSV Adult Series',
    'CandidateSeriesIdentification(RSV): Initialize an Adult RSV TargetSeries if the patient age is >= the Series Start Age',
    'CandidateSeriesIdentification(RSV): Initialize an Adult RSV TargetSeries if there is a shot administered is >= the Series Start Age',
    'CandidateSeriesIdentification(RSV): If the patient age is <= the RSV Infant Series End Age, initialize a TargetSeries for *Current* *RSV* Season with Most Recent Prior Season Rules if Current Season Not Defined but Prior Season is Defined',
    'CandidateSeriesIdentification(RSV): If a shot was administered <= the RSV Infant Series End Age, initialize a TargetSeries for *Current* or *Past* *RSV* Season if Shots were Administered using with Most Recent Prior Season if No Applicable Season Defined at Time Shot was Administered',
    'RSV: If an Adult or otherwise unspecified RSV vaccine (CVX 303, CVX 304, CVX 305, CVX 314, CVX 326) is administered prior to 6/21/2023, evaluate the shot as Invalid with reason code VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED.',
    'RSV: If an Infant RSV vaccine (CVX 332) is administered prior to 6/9/2025, evaluate the shot as Invalid with reason code VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED.',
    'RSV: If an Infant RSV vaccine or otherwise unspecified RSV vaccine (CVX 304, CVX 306, CVX 307, CVX 315) is administered prior to 8/3/2023, evaluate the shot as Invalid with reason code VACCINE_NOT_YET_AVAILABLE_ON_DATE_SPECIFIED.',
    'RSV: If an RSV shot is administered in the Infant Series to a patient < 8 months of age outside the RSV season, the shot is Valid with reason code OUTSIDE_SEASON',
    "RSV: If a shot was administered in the current season of the RSV Infant Series but the RSV Infant Series was completed in a prior season, mark the current season's RSV Infant Series Complete",
    "RSV: If the RSV Infant Series was completed in a prior season, mark the current season's RSV Infant Series Complete",
    'RSV(Abstract): Evaluate shot >= 8 months and < 50 years of age as Accepted / Outside of any Routine Series',
    'RSV: If shot administered >= 8 months and < 50 years was evaluated as Valid or Accepted, evaluate the shot as as Accepted / OUTSIDE_ROUTINE_SERIES',
    'RSV: If shot administered >= 8 months and < 50 years was evaluated as Invalid where the reason is not ABOVE_MAXIMUM_AGE, evaluate the shot as Accepted / OUTSIDE_ROUTINE_SERIES',
    'RSV: If shot administered was evaluated in the Adult Series as Invalid with an evaluation reason ABOVE_MAXIMUM_AGE_VACCINE and BELOW_MINIMUM_AGE_SERIES, remove the BELOW_MINIMUM_AGE_SERIES evaluation reason',
    'RSV: Remove evaluation reason VACCINE_NOT_ALLOWED_FOR_THIS_DOSE if there are other evaluation reason codes',
    'RSV: If the evaluation date is >= 6/21/2023 and < 10/1/2023, and the patient is < 8 months of age, set the earliest/recommended to 10/1/2023',
    'RSV: If the evaluation date is < 6/21/2023 and the Series is not complete, the recommendation is Not Recommended with reason code NOT_SUPPORTED',
    'RSV: If a patient is >= 8 months and < 20 months of age and not complete for RSV Infant Series, the recommendation is Conditional with reason code HIGH_RISK.',
    'RSV: If a patient is >= 8 months and < 20 months of age and is complete for RSV Infant Series, the recommendation is Conditional with reason code COMPLETE_HIGH_RISK.',
    'RSV: If a patient is < 8 months of age and is complete for the RSV Infant Series, the recommendation is Not Recommended with reason code COMPLETE_HIGH_RISK. Mark forecasting of the series as completed.',
    'RSV: If a dose is recommended at >= 8 months and < 20 months, change recommendation to Conditional / HIGH_RISK',
    'RSV: If a patient is >= 8 months and < 20 months of age, the recommendation is CONDITIONAL with reason code HIGH_RISK. Mark forecasting of the series as completed.',
    'RSV: If the patient is both < 8 months of age and a dose is recommended in the RSV Infant Series at < 8 months of age, add SUPPLEMENTAL_TEXT to the recommendation',
    'RSV: If a patient is >= 20 months and < 50 years of age and a shot is recommended for the RSV Adult Series, add SUPPLEMENTAL_TEXT to the recommendation',
    'RSV: If a patient is >= 50 years and < 75 years of age and the Adult Series is not complete, the recommendation is CONDITIONAL with reason code HIGH_RISK. Mark forecasting of the series as completed.',
    'RSV: If the RSV Adult Series is not complete, set the earliest/recommended to the latter of 75 years of age or 6/26/2024',
    'SeriesSelection(RSV): Select the RSV Infant Series if the Adult Series was not selected for any dose in the RSV Infant Series',
    'SeriesSelection(RSV): Select the RSV Adult Series if the patient is >= 20 months of age',
  ].map((ruleName) => ({
    ruleName,
    behavior:
      'RSV selection, evaluation, and recommendation rules are handled by the RSV-specific TypeScript engine hooks.',
    testId: 'ice-rsv-rules',
  })),
];

export function summarizeImplementedRulePorts(
  ruleFiles: IceRuleFile[],
  filter?: string,
): IceRulePortCoverage {
  const normalizedFilter = filter?.toUpperCase();
  const rules = filterRules(
    ruleFiles.flatMap((file) => file.rules),
    normalizedFilter,
  );
  const rulesByName = new Map(
    ruleFiles.flatMap((file) => file.rules).map((rule) => [rule.name, rule]),
  );
  const filteredRuleNames = new Set(rules.map((rule) => rule.name));
  const implemented = normalizedFilter
    ? IMPLEMENTED_ICE_RULE_PORTS.filter((port) => {
        const rule = rulesByName.get(port.ruleName);
        return rule ? filteredRuleNames.has(rule.name) : true;
      })
    : IMPLEMENTED_ICE_RULE_PORTS;
  const matched = implemented.flatMap((port) => {
    const rule = rulesByName.get(port.ruleName);
    return rule ? [{ ...port, rule }] : [];
  });
  const missing = implemented.filter((port) => !rulesByName.has(port.ruleName));
  const implementedRuleNames = new Set(matched.map((port) => port.rule.name));
  const unported = rules.filter((rule) => !implementedRuleNames.has(rule.name));
  const extendedRuleNames = new Set(
    rules.flatMap((rule) => (rule.extends ? [rule.extends] : [])),
  );
  const abstractRules = unported.filter((rule) =>
    extendedRuleNames.has(rule.name),
  );
  const abstractRuleNames = new Set(abstractRules.map((rule) => rule.name));

  return {
    implemented,
    matched,
    missing,
    unported,
    concreteUnported: unported.filter(
      (rule) => !abstractRuleNames.has(rule.name),
    ),
    abstractRules,
  };
}

export function summarizeRulePortCoverageByVaccineGroup(
  ruleFiles: IceRuleFile[],
): IceRulePortCoverageSummary[] {
  const groups = new Set(
    ruleFiles
      .flatMap((file) => file.rules)
      .map((rule) => rule.vaccineGroup)
      .filter(isDefined),
  );

  return [...groups]
    .sort()
    .map((group) => summarizeRulePortCoverage(ruleFiles, group))
    .sort(
      (a, b) =>
        b.concreteUnported - a.concreteUnported ||
        b.totalRules - a.totalRules ||
        a.filter.localeCompare(b.filter),
    );
}

export function summarizeRulePortCoverage(
  ruleFiles: IceRuleFile[],
  filter: string,
): IceRulePortCoverageSummary {
  const coverage = summarizeImplementedRulePorts(ruleFiles, filter);

  return {
    filter,
    totalRules: filterRules(
      ruleFiles.flatMap((file) => file.rules),
      filter.toUpperCase(),
    ).length,
    implemented: coverage.implemented.length,
    matched: coverage.matched.length,
    missing: coverage.missing.length,
    unported: coverage.unported.length,
    concreteUnported: coverage.concreteUnported.length,
    abstractRules: coverage.abstractRules.length,
  };
}

function filterRules(rules: IceRule[], normalizedFilter?: string) {
  if (!normalizedFilter) return rules;
  return rules.filter(
    (rule) =>
      rule.kind.toUpperCase() === normalizedFilter ||
      rule.vaccineGroup === normalizedFilter ||
      rule.season?.toUpperCase() === normalizedFilter,
  );
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
