# Letter Buckets — Art & Motion Style

The reference for all 50 level illustrations and the hand-built bucket/UI art.

## 1. Principles

- **Cozy picture-book diorama.** Warm cream paper, rounded shapes, calm saturation. The game is a toy, not a poster.
- **One hand.** All 50 illustrations share the same palette, line weight, and level of detail.
- **Readable at a glance.** A child should recognize the theme in under a second.
- **The letters are sacred.** No generated image may contain text, letters, numbers, signs, or writing of any kind.
- **Gentle, never scary.** No sharp teeth, weapons, dark silhouettes, or photorealistic faces.
- **No people.** Scenes are places and objects, with animals as characters when a theme needs a living subject.

## 2. Palette

| Token   | Value     | Use                          |
| ------- | --------- | ---------------------------- |
| paper   | `#fdf6e9` | background, sky, cream space |
| paper-2 | `#f9ecd2` | warm mid-tone, wood, bread   |
| ink     | `#4a3b2f` | outlines, deep shadow, cocoa |
| leaf    | `#74a72f` | foliage, garden, growth      |
| ochre   | `#e8871f` | warmth, sun, highlight       |
| berry   | `#c64f78` | fruit, flowers, soft accent  |
| sky     | `#a6e0d8` | water, air, calm fill        |
| wood    | `#8c6242` | furniture, baskets, branches |

## 3. Level illustration prompt

Every image starts from this template:

```
Soft cut-paper storybook illustration of {scene}, warm cream background,
rounded simple shapes, muted sage ochre and berry palette, gentle warm light,
centered vignette, child-friendly, cozy, layered paper texture, no text,
no letters, no words, no signs, no people, no faces
```

Negative guidance folded into the prompt: `text, letters, words, signage,
watermark, photorealistic, cluttered, scary, sharp teeth, weapons, dark`.

Generation: FLUX.2-klein 4B, 1344×768, 4 steps, guidance 1.0, fixed seed per
level. Downscale to 768×432 WebP, quality 80, target under 90 KB.

## 4. Style candidates

Three directions were generated for review:

1. **Layered paper** — visible cut-paper edges and soft drop shadows.
2. **Soft gouache** — painted texture, rounded brush shapes, no hard outline.
3. **Flat vector** — thick rounded shapes, limited palette, subtle grain.

The chosen direction is **layered paper**, recorded as `VARIANTS[0]` in
`scripts/generate_art.py`. The other two candidates stay in `candidates/` for
reference but are not used for the batch.

## 5. Buckets and UI

- Buckets are hand-built SVG, not generated: one shared pail shape, handle, rim,
  and lid, in leaf, ochre, and berry. Closed = lid and ribbon; open = lid tipped
  and a soft glow; done = lid off, star, and the word.
- Letter tiles are rounded squares with a thick bottom edge, cream face, cocoa
  glyph, and a raised edge.
- The app icon is a cream letter tile in a leaf-green bucket, rasterized from
  `static/favicon.svg`.
- No gradient or shadow may reduce glyph contrast.

## 6. Motion

- Tile pick: lift 4 px and ring in ochre.
- Correct: snap in with a small overshoot.
- Wrong: a single gentle bounce, never a hard shake.
- Bucket open: lid tips with a soft glow.
- Word complete: sparkles and a warm chime.
- Reduced motion: fades and short scales only; no flying tiles or confetti.
