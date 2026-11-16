# Feature Specification: An ornament you can put in an Instagram story

**Feature Branch**: `013-instagram-story` | **Created**: 2026-11-16 | **Status**: Draft

**Input**: "we need to make it instagram story friendly"

## User Story

### 1 - Share my ornament to my story (P1)

On "Share my ornament" (and on the thank-you card) there is an "Instagram story" button. Tapping it hands the phone's
share sheet a 9:16 picture of my ornament: the ornament close up on the tree, my name, my wish, "Open my wish and hang
yours next to mine", the days to Christmas and the link written out. Choosing Instagram → Story puts it straight into
the story editor. My link is copied at the same moment, and the page tells me to add a Link sticker and paste it.

- A story picture cannot carry a tappable link and a web page cannot open Instagram's story editor directly; the share
  sheet plus a copied link is the shortest path that exists.
- Where the browser cannot hand over a picture (most desktop browsers, some in-app browsers), the picture is saved
  instead and the same instruction is shown.

## Requirements

- **FR-001**: The picture MUST be 1080×1920 JPEG, with every word between 250px from the top and 340px from the bottom (Instagram's own controls cover the rest).
- **FR-002**: Long names shrink to fit; a wish is wrapped to at most four lines and ends in … if longer.
- **FR-003**: Only the owner's own wish (already public on the tree) appears; wishes left for them never do.
- **FR-004**: Nothing is uploaded: the picture is made on the phone and given to the app the person picks.

## Assumptions

- "Instagram story friendly" means sharing an ornament to a story. Opening the site from a story's Link sticker already works (it is an ordinary link).
- Checked in a desktop browser at phone size: the picture (see `example.jpg`) and the save path. Handing the picture to Instagram needs a real phone and was not checked.
