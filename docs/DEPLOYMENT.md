# Deployment helper

The production deployment is recorded in `deployments/base.json`; see the README for addresses. You do not need to deploy a new contract to use the existing collection.

The included `deploy-ui/` is a user-operated helper for reproducing and inspecting a contract-creation transaction. `npm run build` packages it under `/deploy/`. Build output is not committed. Existing approval/configuration files are preserved for reproducibility of the original release; they do not authorize a new deployment, reserve donation, or any wallet action. The oracle-config proposal text is historical: the recorded production constructor uses a 10,000,000,000,000 wei cap.

A fresh deployment needs an independent source review, constructor review, exact deployment-data hash, correct Base chain and dependency code hashes, live quote and simulation, and the wallet owner's own explicit transaction approval. Never enter keys or seed phrases into this project. Do not use real originals to test it.

The helper creates the collection, graveyard, renderer and backdrop. The deployment value is zero ETH, with gas separate. The recorded approval binds exact bytecode and constructor data, not future modifications. Changes require a new review. The helper checks runtime templates, immutable fields, source/wrapper identities and current conditions; these checks do not protect against a maliciously replaced website or dishonest RPC.

Oracle funding is a separate voluntary transfer to the verified collection address. Unused funds have no withdrawal or recovery path. An unsigned funding handoff does not broadcast a transfer. Do not confuse a request-price ceiling with a reserve amount or a total-spending promise.

Never enable a new deployment configuration using guessed addresses. Verify the successful creation receipt, all four runtime matches and immutable getters, source verification, and current reserve/quote. Browser tests use mocks and do not establish physical-wallet acceptance or a real oracle round-trip.
