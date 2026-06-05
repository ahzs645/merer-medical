# Vendor References

This directory contains optional upstream references used for development and
conformance work. These projects are not bundled into the web app runtime.

## ICE

`vendor/ice` is a git submodule that points at the Mere fork of the
Immunization Calculation Engine:

- Fork: https://github.com/ahzs645/ice
- Upstream: https://github.com/cdsframework/ice

Use it as a reference implementation and future comparison test oracle for
`@mere/immunization-forecast`. The TypeScript forecast engine should remain
small, browser-friendly, and independent from the Java ICE runtime.

To initialize the submodule after cloning this repo:

```sh
git submodule update --init --recursive vendor/ice
```

To refresh the fork from upstream:

```sh
git -C vendor/ice fetch upstream
git -C vendor/ice checkout main-v2
git -C vendor/ice merge upstream/main-v2
```
