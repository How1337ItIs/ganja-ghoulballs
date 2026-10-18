# Release status

The Base mainnet deployment and exact Sourcify verification links are recorded in [README.md](README.md) and [deployments/base.json](deployments/base.json). This supersedes the old pre-deployment HOLD narrative.

- Supply cap: 420; exactly 13 originals permanently locked per mint.
- Mint protocol fee: zero ETH; gas applies. Oracle requests use a separate nonwithdrawable sponsor reserve and an immutable 0.00001 ETH per-request cap.
- All four deployed contracts have exact creation/runtime source matches on Sourcify.
- Current reserve, oracle quote and wallet readiness must be checked live; these are not guaranteed by a historical verification record.
- Local tests and automated review are not an external professional audit, physical-wallet acceptance test, or proof of a live mint/reveal round-trip.

Technical reports retained under docs/ and reports/ are dated, source-hash-bound evidence. Pre-deployment instructions and historical results describe their recorded checkpoint; they are not present-day authorization or current readiness claims. Regenerate tests after any source change. See [verification](docs/VERIFICATION.md) and [deployment helper](docs/DEPLOYMENT.md).
