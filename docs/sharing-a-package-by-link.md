# Sharing a package by link

A `.emrpkg` at a URL can be opened straight into the app:

```
https://your-mere-host/connections?package=https://records.example.org/eisa.emrpkg
```

The app fetches it, reads the manifest, and shows what it holds — the origin,
whose records they are, how many, when it was built. Then it waits.

That wait is the design. Everywhere else in the app an import starts from a file
someone chose off their own disk. A link is the one route in where the person
deciding did not choose the file, and may have been sent it by someone they have
no reason to trust. **A link can offer records; it cannot write them.**

- [Hosting one](#hosting-one)
- [What the reader sees](#what-the-reader-sees)
- [Auto-loading](#auto-loading)
- [Encrypting a shared package](#encrypting-a-shared-package)
- [Before you publish one](#before-you-publish-one)

## Hosting one

Anywhere that serves the file over HTTPS **with a CORS header**. The browser is
reading a different origin from the one the app is served from, so without
`Access-Control-Allow-Origin` the fetch is blocked before it starts.

| Host                    | Works  | How                                                  |
| ----------------------- | ------ | ---------------------------------------------------- |
| S3                      | yes    | Bucket CORS rule with `AllowedMethods: [GET]`        |
| Cloudflare R2           | yes    | Bucket CORS policy, or a Worker that sets the header |
| GitHub Pages            | yes    | Sends `access-control-allow-origin: *` already       |
| nginx / Caddy / any VPS | yes    | One header line, below                               |
| Netlify / Vercel        | yes    | `_headers` or `vercel.json`                          |
| **Google Drive**        | **no** | No CORS on share links, and no way to add it         |
| **Dropbox / OneDrive**  | **no** | Same                                                 |

nginx:

```nginx
location ~* \.emrpkg$ {
    add_header Access-Control-Allow-Origin "https://your-mere-host" always;
    add_header Content-Type "application/octet-stream";
}
```

`*` works too and is simpler; name your app's origin if you would rather only
that one origin could read the file. Neither makes the file private — see
[below](#before-you-publish-one).

Build a package with `node tools/transpose.mjs build …` (see
[the format reference](./clinical-transpose-format.md)) or export one from
Settings → Encrypted package (.emrpkg), then upload it and share the link.

### Checking a host

```sh
curl -sI https://records.example.org/eisa.emrpkg | grep -i access-control-allow-origin
```

Nothing back means the link will fail, and the app will say so specifically
rather than reporting a generic network error — a cross-origin block and a dead
connection reach the browser as the same error, and the remedies are opposite.

## What the reader sees

The offer names the origin and the patient, then says which of three things the
button will do. Which one depends on whose records these are, because an
additive import files records under **the package's own patient**, not the
profile in use.

| Their device                                  | Button                        | What happens                                                                                                        |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Nothing on it yet                             | **Open these records**        | The intro is skipped and the records open. The blank profile the app creates on first boot is cleared away.         |
| Has records, package is about the same person | **Add to my records**         | Merges into the current profile. This is the only case where "replace" is offered, behind a disclosure.             |
| Has records, package is about someone else    | **Add as a separate profile** | A second profile, records kept apart. Nothing already there changes; switch between them in Settings → Switch user. |

A profile can be deleted from that same switcher, which removes its records too.

Other limits: `http(s)` only — a `javascript:` or `data:` URL is refused before
anything is fetched — and 64 MB.

## Auto-loading

A link can ask to skip the confirmation:

```
https://your-mere-host/connections?package=https://records.example.org/eisa.emrpkg&autoload=1
```

**On its own, that does nothing.** Anyone can append `&autoload=1` to a URL, so
honouring it would remove the one screen standing between a link somebody sent
you and your medical record — the parameter would be a way to bypass exactly the
protection it was meant to be gated by.

So the link only _requests_ it, and the **deployment** grants it. Set the
allowlist when you build the app:

```sh
VITE_MERE_TRUSTED_PACKAGE_ORIGINS=https://records.example.org npm exec nx -- build web
```

Comma-separated for more than one, and a trailing slash is tolerated:

```sh
VITE_MERE_TRUSTED_PACKAGE_ORIGINS="https://records.example.org,https://clinic.example"
```

Match origins exactly — scheme, host and port, no paths and no wildcards.
`https://records.example.org` does not cover `https://cdn.records.example.org`.

Then a link carrying `&autoload=1` **from one of those origins** imports on
arrival, with no tap. Anything else gets the normal offer, plus a line saying the
link asked to import itself and its origin is not on the list — so an operator
whose own link stopped auto-loading can see why.

Auto-import is deliberately narrower than what the buttons can do:

- **It only ever adds.** A trusted host may save its reader a tap; it may not
  delete a record set. "Replace" stays behind the disclosure and a human.
- **It never runs on an encrypted package**, which needs a passphrase nobody has
  typed yet. Those still show the offer and prompt.

Whoever sets `VITE_MERE_TRUSTED_PACKAGE_ORIGINS` is vouching that everything
ever served from those origins is safe to write into a reader's medical record
unattended. Point it at hosts you control.

## Encrypting a shared package

`tools/transpose.mjs build` always writes an unencrypted package — it is a build
artifact, and the tool has no passphrase flag. To share one encrypted, import it
into the app and re-export it from Settings → Encrypted package (.emrpkg) with a
passphrase, then publish that file.

An encrypted package loads from a link like any other and prompts for the
passphrase before importing.

The one thing it cannot do is show the contents first: the manifest is inside
the ciphertext, so the panel says the package is encrypted rather than showing
an empty summary. Send the passphrase by some other route than the link.

## Before you publish one

A `.emrpkg` on a public URL is a medical record that anyone with the link can
read, and **a link is not a secret**. It travels through browser history,
`Referer` headers, chat logs, link previews, and the access logs of every proxy
in between. "Unguessable filename" is not access control.

For anything you would not hand to a stranger:

- encrypt the package with a passphrase, and send the passphrase separately
- or put the file behind auth and share a short-lived signed URL
- or don't use a link — the file picker in Sources → Import records takes the
  same package off a disk, with no network involved at all

Consider also that the packages built by `tools/transpose.mjs` carry the source
document embedded — the original PDF, in full — not just the extracted values.
