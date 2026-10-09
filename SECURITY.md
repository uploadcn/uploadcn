# Security policy

UploadCN handles user files, signed upload URLs and storage credentials, so we take
security reports seriously.

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/uploadcn/uploadcn/security/advisories/new).
Do not open a public issue.

Include what you found, how to reproduce it, and the affected package or component
and version. We aim to acknowledge reports within 3 days and to ship a fix for
confirmed issues as quickly as possible, crediting you in the advisory unless you
prefer otherwise.

## Supported versions

Fixes are released for the latest published version of `@uploadcn/core`,
`@uploadcn/react` and `@uploadcn/server`, and for the current registry items on
uploadcn.dev.

## Scope

In scope: the npm packages, the registry items (including scaffolded upload routes),
and the docs site. Misconfigured storage in your own project (for example a public
bucket or permissive CORS) is out of scope, but we are happy to improve the docs if
something was unclear.
