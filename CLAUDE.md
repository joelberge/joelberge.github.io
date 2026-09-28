# Joel W. Berge – personal website

Jekyll site served by GitHub Pages at https://joelberge.github.io (built by `.github/workflows/jekyll-gh-pages.yml` on push to `main`).
Norwegian (Bokmål) is the default at `/`, English is at `/en/`. Both pages use `_layouts/home.html`.

## Where things live

All content is data. Change the YAML files, not the layout.

| What | File |
|---|---|
| Name, title, email, profile links, CV PDF path | `_data/profile.yml` |
| The three talks | `_data/talks.yml` |
| "Har snakket for" chips | `_data/audiences.yml` |
| Publications, forthcoming and working papers | `_data/publications.yml` |
| Op-eds and news coverage | `_data/media.yml` |
| Lederskap podcast and guest appearances | `_data/podcast.yml` |
| Short CV | `_data/cv.yml` |
| Interface text in both languages | `_data/i18n.yml` |
| Talk/paper illustrations (inline SVG) | `_includes/viz/*.html` |
| Images | `assets/img/` (paper images in `assets/img/research/`) |

## Design rules (from Joel)

- Font: DM Sans, weights 300 and 400 only. **Never bold.** Emphasis is a blue highlighter: `<mark>…</mark>`.
- Colours: white, near-black ink `#15171c`, highlighter blue `#7ba4f4` (same blue as the portrait circle). No other accent colours.
- Keep it airy, like Joel's lecture slides: lots of white space, large type, few elements.

## Common updates

**New paper (Joel sends a PDF or link).** Add an entry at the top of the right group in `_data/publications.yml`
(`status: article | forthcoming | working | other`). To showcase it, set `featured: true`, write a 2–3 sentence
plain-language `summary` in both `nb` and `en`, and add an image: either a simple SVG in `assets/img/research/`
(white background, ink + highlighter blue only, 400×400 viewBox) referenced with `image:`, or an illustration
include referenced with `viz:`. Keep at most 2–3 papers featured; un-feature older ones.
Only state findings that are in the paper's own abstract.

**New op-ed or news story.** Add to the top of `opeds` or `coverage` in `_data/media.yml` (title, outlet, year, link).

**New CV.** Put the PDF at `assets/cv/joel-berge-cv.pdf` and set `cv_pdf: /assets/cv/joel-berge-cv.pdf` in `_data/profile.yml`.
Update `_data/cv.yml` to match.

## YAML gotchas

- The Norwegian language key is `nb`, not `no`: YAML reads a bare `no` as `false`. Quote values like `"NO"`, `"yes"`, `"on"`.
- Quote any value inside `{ … }` that contains a comma.

## Checking a change

```sh
jekyll build -d /tmp/site      # must finish with no errors
```
Then look at `/` and `/en/` at desktop and phone width. The page must never scroll sideways.

## Privacy

Never publish Joel's private address or mobile number (they are in his CV file). Contact on the site is the NHH email only.
This repository is public: do not add drafts, the book manuscript or anything not meant for the website.
