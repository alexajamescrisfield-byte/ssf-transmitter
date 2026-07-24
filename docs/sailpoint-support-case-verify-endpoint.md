# Support request: SSF Receiver verify-stream response validation

## Summary

I've built a custom SSF transmitter (hosted, spec-compliant per the OpenID
Shared Signals Framework 1.0 Final spec) and successfully completed
discovery, stream creation, and stream status management against my ISC
tenant's SSF Receiver. The one remaining step -- **Verify Stream** -- fails
every time with a generic `InvalidResponseError`, and I've been unable to
determine the exact response shape ISC's Receiver expects from a
transmitter's `verification_endpoint`.

## Environment

- ISC tenant: `company21912-poc`
- Transmitter Discovery URL: `https://ssf-transmitter-chi.vercel.app/t/company21912-poc/.well-known/ssf-configuration`
- Receiver name: "Threat Signal Transmitter"
- Authentication: API Token

## What's confirmed working

- Discovery (`GET .well-known/ssf-configuration`) and JWKS
  (`GET .well-known/jwks.json`) -- ISC successfully discovers the
  transmitter.
- Stream creation (`POST /ssf/streams`) -- succeeds, ISC registers the
  stream and returns its `delivery.endpoint_url`.
- Stream status checks/updates (`GET`/`PATCH` `/ssf/streams`,
  `GET`/`POST` `/ssf/status`) -- ISC's "enable stream" workflow
  successfully calls these and gets valid responses back (confirmed via
  Vercel request logs).
- Signed SET delivery -- I push a signed `secevent+jwt` to the
  `delivery.endpoint_url` ISC gave me on every verify attempt, and it is
  **always accepted with HTTP 202** by ISC's delivery endpoint (confirmed
  via my own server-side logs, 11/11 attempts).

## What's failing

`POST /ssf/verify` -- when ISC calls my transmitter's verification
endpoint, whatever JSON I return, ISC's connector layer rejects it with:

```
PostConnectorCommandDirect: 502 Bad Gateway: "[ InvalidResponseError ]
Invalid response received from the transmitter{...}"
```

I have tried the following response shapes, at various HTTP status codes
(200, 202, 204), with **no change in the error** and no further detail on
what specifically is invalid:

1. `{ accepted: true, jti, httpStatus, success }` at 202
2. Empty body (`null`) at 200
3. Empty body at 202
4. `{ stream_id, iss, aud, status }` at 200
5. `{ stream_id, state }` (echoing the receiver-supplied `state`) at 200
6. Full stream representation: `{ stream_id, iss, aud, status,
   events_requested, events_delivered, delivery, state }` at 200

## Trace IDs for reference

- `d66d3d02a36645df8422b216ccbac116`
- `06b57737ea644a13a4deeaae843b09d1`
- `266217624a724806b5fa41150e3d2df6`
- `32d38007c1214441894c3908e9cd8839`
- `2a3b64c5bf9746e396abd1cdf74945b9`

## Question

**What exact HTTP status code and JSON response body does ISC's SSF
Receiver expect back from a transmitter's `verification_endpoint`** (the
URL advertised in the discovery document under
`verification_endpoint`)? Is there a published schema or reference
implementation for this specific response, separate from the general SSF
spec's description of the verify flow (which doesn't define response
content, only that verification completes asynchronously via the pushed
SET)?

Separately: is there a way to view, from the ISC admin console or logs,
whether a specific pushed verification SET was successfully parsed and
accepted, independent of whether the initiating `POST /ssf/verify` call
itself is considered "successful" by the connector layer? I want to
confirm whether these are the same validation or two independent checks.
