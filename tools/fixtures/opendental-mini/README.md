A two-patient Open Dental extract in the `.schema` + `.tsv` shape
`tools/build-opendental-emrpkg.mjs` reads, written by hand against Open
Dental's schema documentation (v24.3). It has one row for each case the
builder has to tell apart: every `ProcStatus` that matters (planned, deleted,
condition, completed hygiene, inactive plan), each perio measurement type, a
recall, and a treatment plan with attached procedures. No real patient data.
