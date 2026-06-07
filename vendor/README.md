# Vendor References

This directory contains optional upstream references used for development and
conformance work. These projects are not bundled into the web app runtime.

## ICE

The Immunization Calculation Engine (ICE) is **no longer vendored** in this
repo. Its Drools ruleset has been fully ported to TypeScript in
`@mere/immunization-forecast` (see `packages/immunization-forecast`), and the
web app's runtime forecasting does not depend on the Java ICE runtime or its
dataset.

- Fork: https://github.com/ahzs645/ice (branch `main-v2`)
- Upstream: https://github.com/cdsframework/ice

The fork is kept as a reference implementation and comparison test oracle. The
`@mere/immunization-forecast` conformance tests (`test/ice-*-rules.mjs`) load
the ICE dataset from `vendor/ice`, so they require the submodule to be present.

To restore ICE temporarily for re-importing datasets or running those
conformance tests:

```sh
git submodule add -b main-v2 https://github.com/ahzs645/ice.git vendor/ice
```

To refresh the fork from upstream:

```sh
git -C vendor/ice fetch upstream
git -C vendor/ice checkout main-v2
git -C vendor/ice merge upstream/main-v2
```
