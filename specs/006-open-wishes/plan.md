# Implementation Plan: An ornament is a name and a wish

**Branch**: `006-open-wishes` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

## Summary

The existing "wish for yourself" (`kind = 'self'`, one per card) becomes the ornament's open wish. No schema change. The server starts serving its words to anyone (when `status = 'ok'`), and adds a report route. The screens ask for it after every hang, show it when a card is opened and from an ornament's name card, and stop treating it as a Christmas reveal.

## Decisions

- **D1 Reuse `self`.** `wishes.kind = 'self'` is already one-per-card and written through the private link. Only who may read it changes.
- **D2 Serving.** `latestOrnaments` gains `wish` (text or null) per ornament; `GET card/{id}` gains `wish`; `GET me/{token}` includes the text of the self wish at any date and keeps it listed while in review.
- **D3 Reporting.** `POST card/{id}/report` sets the wish to `review` through the existing `reportWish`; limit `report: 5 an hour`.
- **D4 Flow.** After hanging, every path goes to the `seal` step (now "Add your wish"). The invited person's screen shows the friend's wish, then "Hang my ornament" first and "Leave a wish back" second. The Christmas `selfwish` coda is no longer reached.
- **D5 Words.** Home page, tree page, card page, invitation and privacy line say what is open and what is sealed.

## Files

`server/app.js`, `server/repo-memory.js`, `server/repo-postgres.js`, `shared/copy.js`, `shared/shell.js`, `src/store.js`, `src/three/Director.jsx`, `src/ui/Wishes.jsx`, `src/ui/Overlay.jsx`, `src/pages/Home.jsx`, `tests/server/open-wishes.test.js` and the existing suites.
