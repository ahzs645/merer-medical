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
      'Pneumococcal Adult: if a (valid) PCV15 dose and (valid) PPSV23 dose has been administered in the Adult series, the series is complete',
    behavior:
      'Adult pneumococcal PCV15 plus PPSV23 targets adult dose slots and completes the pneumococcal series.',
    testId: 'assertPneumococcalAdultPcv15AndPpsv23CompletesSeries',
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
      'Pneumococcal Adult: If CVX 109 or CVX 152 has been evaluated as INVALID / VACCINE_NOT_ALLOWED_FOR_THIS_DOSE in the Adult Series, remove all other reason codes and add supplemental text',
    behavior:
      'Pneumococcal adult CVX109 and CVX152 shots are invalid with VACCINE_NOT_ALLOWED_FOR_THIS_DOSE and the unspecified-CVX supplemental text.',
    testId:
      'assertPneumococcalAdultUnspecifiedCvx109InvalidWithSupplementalText/assertPneumococcalAdultUnspecifiedCvx152InvalidWithSupplementalText',
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
      'COVID-19(Aug2025): If the patient is complete for the season, the recommendation is Not_Recommended/Complete_High_Risk',
    behavior:
      'Completed Aug 2025 COVID-19 series forecasts produce a not-recommended recommendation with COMPLETE_HIGH_RISK.',
    testId: 'assertCovid19Aug2025CompleteRecommendation',
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
      'COVID-19(Aug2025 < 2yrs Series): When a shot is recommended for this series, specifically recommend CVX 311',
    behavior:
      'Aug 2025 under-2 COVID-19 recommendations prefer CVX 311.',
    testId: 'assertCovid19Aug2025Lt2RecommendsCvx311',
  },
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
    'SeriesSelection(Hep B): Select already completed series that was completed on the same date and with the most doses if different completed series was previously selected',
    'SeriesSelection(Hep B): Select Hep B Child/Adolescent series if the patient is < 19 years of age when first shot was administered',
    'SeriesSelection(Hep B): Select Hep B Child/Adolescent Series if the patient is < 19 years of age, and no shots have been administered',
    'SeriesSelection(Hep B): Select the Hep B 3-dose Adult Series if the patient >= 19 years of age, and no shots have been administered',
    'SeriesSelection(Hep B): Select Hep B 3-dose Adult series if the patient is >= 19 years of age when first shot was administered ',
    'SeriesSelection(Hep B): Select Adult 2-dose Series is patient >= 18y-4d and < 19 years of age, 1 dose, and no other doses on record',
    'SeriesSelection(Hep B): For patient with CVX 189 dose 1 administered at >= 19 years of age, and no other doses on record, select the 2-dose Adult Series',
    'SeriesSelection(Hep B): For patient with CVX 189 dose at >= 18y-4d and < 19 years of age, and >= 1 dose and additional shots on record, select the Child/Adolescent Series if it has more doses than the Adult Series',
    'SeriesSelection(Hep B): For patient with CVX 189 at >= 18y-4d and < 19 years of age, and >= 1 dose and additional shots on record, select the 2-dose Adult Series if it has greater than or equal the number of doses as the Child/Adolescent Series',
    'SeriesSelection(Hep B): For patient with CVX 189 dose 1 administered at >= 19 years of age, and >= 1 dose and additional shots on record, select the 3-dose Adult Series if it has more doses than the 2-dose Adult Series',
    'SeriesSelection(Hep B): For patient with CVX 189 dose 1 administered at >= 19 years of age, and >= 1 dose and additional shots on record, select the 2-dose Adult Series if it has greater than or equal the number of doses as the Child/Adolescent Series',
    'SeriesSelection(Hep B): Select Child/Adolescent Series if it is complete',
    'SeriesSelection(Hep B): Select Child/Adolescent Series if Hep B Child/Adolescent Series has fewer doses remaining to complete the series than the Hep B 4-dose Accelerated Twinrix Series',
    'SeriesSelection(Hep B): If a shot in the Hep B 4-dose Accelerated Twinrix Series is invalid in the Hep B Child/Adolescent Series, mark any prior series doses as Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN in the Child/Adolescent Series',
    'SeriesSelection(Hep B): Select 3-dose Adult Series if Hep B 3-dose Adult Series has fewer doses remaining to complete the series than the Hep B 4-dose Accelerated Twinrix Series',
    'SeriesSelection(Hep B): If a shot in the Hep B 4-dose Accelerated Twinrix Series is invalid in the Hep B 3-dose Adult Series, mark any prior 3-dose Series doses as Accepted / VACCINE_NOT_COUNTED_BASED_ON_MOST_RECENT_VACCINE_GIVEN in the 3-dose Series',
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
    'Duplicate Shots/Same Day (MenB- Series is Complete; $td Shot is Valid): If CVX 162 or CVX 316 is administered >= 10/25/2024 on the same day as CVX 163 on a date >= 10/25/2024, and the Series is complete, evaluate the shot that completes the Series as Valid and the other shot as Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day (MenB- Series is Complete; $tdother Shot is Valid): If CVX 162 or CVX 316 is administered >= 10/25/2024 on the same day as a CVX 163 or CVX 328 on a date >= 10/25/2024, and the Series is complete, evaluate the shot that completes the Series as Valid and the other shot as Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day (MenB- Series is Not Complete): If CVX 162 or CVX 316 is administered >= 10/25/2024 on the same day as CVX 163 or CVX 328 on a date >= 10/25/2024, and neither Series complete, evaluate the shot that completes the Series as Valid and the other shot as Invalid / DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day MeningB Rule: If CVX 162 (or CVX 316) / CVX 163 (or CVX 328) reported on same day in the 4C 2-dose Series on a date < 10/25/2024, evaluate the CVX 162 as Invalid with reason DUPLICATE_SAME_DAY',
    'Duplicate Shots/Same Day MeningB Rule: If CVX 162 (or CVX 316) / CVX 163 (or CVX 328) reported on same day in FBhp 2-dose or FBhp 3-dose Series < 10/25/2024, evaluate the CVX 163 as Invalid with reason DUPLICATE_SAME_DAY',
    'Mening B / FHbp 2-dose series: Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'Mening B / FBhp 2-dose series: Do not invoke default Absolute Minimum Age check for CVX 163 administered >= 10yrs-4days of age',
    'MenB(FHbp 3-Dose Series): Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'MenB(FHbp 3-Dose Series): Regardless of the interval between dose 2 and target dose 3, if the Absolute Minimum Interval between dose 1 and target dose 3 >= 6 months-4 days, then evaluate the shot (target dose 3) as Valid',
    'MenB(4C 2-Dose Series): Skip interval check on ACCEPTED/VACCINE_NOT_COUNTED_BASED_ON_MOSE_RECENT_VACCINE_GIVEN',
    'MenB(4C 2-Dose Series): Do not invoke default Absolute Minimum Age check for CVX 162 or CVX 316 if administered on or after 10/25/2024 at >= 10 years-4 days of age',
    'MenB(4C 2-Dose Series): If dose 2 was administered >= 10/25/2024, the absolute minimum interval from the (valid) Dose 1 (_not_ necessarily the immediately prior shot) to target dose 2 is 6 months-4 days',
    'MenB(4C 2-Dose Series): If target dose 1 is administered < 10/25/2024, then modify DoseRule1 to the pre-10/25/2024 values as follows: (1) Absolute Minimum Age: 10y-4d; (2) Absolute Minimum Interval: 1m-4d',
    'MenB(4C 2-Dose Series): If target dose 2 is administered < 10/25/2024, then modify DoseRule1 to their pre-10/25/2024 values as follows: (i) Absolute Minimum Interval: 1m-4d',
    'MenB(4C 2-Dose Series): If dose 1 was administered < 10/25/2024, target dose 2 is CVX 163 is administered >= 10/25/2024, and the interval between the previous (unignored) shot is >= 4w-4d and < 4m-4d OR the interval from (valid) dose 1 is < 6m-4d, _switch_ to the 4C 3-dose Series',
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
