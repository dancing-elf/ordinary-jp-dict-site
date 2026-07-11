# `od-dict/1` — dictionary import format

This is the file format the app imports a dictionary from. **One JSON file = one dictionary.** You
write (or have an LLM write) this file by converting some existing dictionary — e.g. a Yomitan
dictionary — into the shape below. The app then builds its own database from it.

This document is the contract. Every rule here is verified against the code that consumes the file
(`src/builder/importFormat.ts` → `formatToEntry`, `src/builder/writeEntry.ts`, `src/search/lookup.ts`,
`src/search/reader.ts`, `src/builder/schema.ts`, `app/src/ui/DetailSheet.tsx`). Where a rule exists for
a non-obvious reason, the reason is stated. Where something is lossy or unsupported, it says so plainly.

It is deliberately a **superset of jmdict-simplified** (`scriptin/jmdict-simplified`): a real
jmdict-simplified word is already a valid word here. If your source is jmdict-simplified, you need
almost no conversion.

---

## 1. The whole file at a glance

```jsonc
{
  "format": "od-dict/1",          // required, exact string
  "source": "custom",             // required; an id for this dictionary (see §2)
  "metadata": {                   // optional, free; display/provenance only, NOT consumed by the build
    "title": "My Dictionary",
    "license": "CC BY-SA 4.0",
    "url": "https://…"
  },
  "tags": { "v1": "Ichidan verb" },  // optional; NOT consumed today (see §6) — labels go in the senses
  "words": [
    {
      "id": "1259420",            // required; UNIQUE within this file (see §3)
      "kanji": ["食べる"],         // optional; omit for kana-only words
      "kana":  ["たべる"],         // at least one form (kanji or kana) must exist
      "sense": [                  // required; ≥1 (empty only for a corpus word, see §3)
        {
          "partOfSpeech": ["v1"], // optional; ONLY coded POS, never free text (see §4)
          "misc": ["transitive"], // optional; free human-readable labels, shown verbatim
          "gloss": [              // the translations
            { "lang": "ru", "text": "есть; кушать" },
            "пожирать"            // bare string = { lang: "ru", origin: "original" }
          ],
          "examples": [ ["ご飯を食べる", "есть рис"] ],   // optional; [japanese, translation] pairs (see §5a)
          "references": []        // optional; cross-links (see §5)
        }
      ]
    }
  ]
}
```

That is the entire format. Everything below is detail.

---

## 2. Top level

| field | required | meaning |
|---|---|---|
| `format` | yes | Must be exactly `"od-dict/1"`. |
| `source` | yes | An id string for this whole dictionary. It becomes `entries.source`. Pick a stable slug (`"custom"`, or e.g. `"jitendex"`). It is the namespace for `id`s and for cross-references. A source the app doesn't know is simply ranked **after** the built-in dictionaries — never rejected. |
| `metadata` | no | Free object (title, license, url, date). Stored for display/provenance only; **the builder does not read it.** Keep it inert — it is never used as a path, url, or merged into anything. |
| `tags` | no | A `code → label` map for jmdict-simplified compatibility. **Not consumed today** (see §6). Put labels you want shown directly in the senses (`misc`/`field`/`dialect`), as text. |
| `words` | yes | The array of entries. |

> Note on `source` for user-uploaded dictionaries: the security design calls for forcing it to
> `"custom"` at import so a file can't claim to be `"warodai"`/`"jmdict"` and merge into a licensed
> source. **That forcing is not implemented yet** — today `importInto` writes whatever `source` it is
> told. Treat `source` as advisory until the validating importer lands.

---

## 3. Words and identity

```jsonc
{
  "id": "1259420",
  "homograph": "II",          // optional; a disambiguator when two entries share head+reading
  "label": "colloquial",      // optional; an entry-level tag shown on the card
  "headnote": "ὁ (gen. ἀγῶνος)", // optional; free text shown before the senses (see below)
  "isExpression": true,       // optional; multi-word phrase. If absent, inferred from the headword
  "common": true,             // optional; marks a high-frequency entry
  "kanji": ["食べる", "喰べる"],  // 0…n written forms
  "kana":  ["たべる"],          // 0…n readings
  "sense": [ /* … */ ],
  "examples": [ /* … */ ]     // optional; entry-level corpus examples (see §5a)
}
```

**Identity is `(source, source_entry_id)` and it is `UNIQUE`.** `id` becomes `source_entry_id`.

- **`id` must be unique within the file.** This is not advisory: the entries table is written with a
  plain `INSERT` against `UNIQUE(source, source_entry_id)`, so a **duplicate `id` throws and aborts the
  import batch.** It is not silently ignored. Use your source's own entry id; if your source has none,
  synthesise a stable unique one (e.g. a running counter, or the headword when headwords are unique).
- `kanji`/`kana` items may be a bare string (the normal case) or a jmdict-simplified object
  `{ "text": "食べる", "common": false, "tags": [], "appliesToKanji": ["*"] }`. **Only `text` is read**;
  the per-form `common`/`tags`/`appliesTo` are accepted for round-trip but dropped (the card has no
  per-form tag row). A bare string is preferred.
- A word needs **at least one form** (a `kanji` or a `kana`). For Japanese, give `kana`; omit `kanji`
  for kana-only words.
- `headnote` is **the text of the entry before the senses** — whatever your dictionary prints between
  the headword and the first meaning (gender and principal parts in a classical dictionary, a usage
  preamble, etc.), preserved as one free-text string. It renders verbatim as ordinary body text above
  the senses, per source (on a merged card each dictionary shows its own). It is **display-only**: it
  is never indexed for search and never read for morphology/deinflection — do not try to encode
  machine-readable grammar in it. Distinct from `label`, which is a *short tag* rendered as a chip.
  Whitespace-only is treated as absent.
- Entry-level `examples` is for an **examples-only (corpus) dictionary**: example sentences that belong
  to the word as a whole, not to one sense — each may carry a citation `tag` (§5a shape (c)). Such a
  corpus word is the one case where an **empty `sense`** is valid; an ordinary gloss word puts its
  examples inside the senses and needs `sense` ≥ 1.

### Grouping

The app shows **one card per (head + reading) group**, merging across dictionaries. Within *your* file,
emit **one word per dictionary entry** — collect all its written forms into `kanji`, all readings into
`kana`, and all its meanings into `sense`. If your source splits one entry across several rows (Yomitan
does this via the shared `sequence` number), merge those rows into a single word first; otherwise you
get several separate cards for what is one entry.

---

## 4. `partOfSpeech` — the one field that can silently break search

This is the only field where a wrong value **removes the word from search without any error**. Read this
section before emitting any POS.

### What POS is for (and is *not* for)

POS does **not** affect finding a word by its dictionary form or by reading — `食べる` and `たべる` are
found regardless. POS is used in exactly one place: the **deinflection gate** — finding a word from an
*inflected* surface a user typed (`食べた`, `食べれば`, `書いて`, `静かな`). The same gate runs in two
spots, identically: search (`lookup.ts` `deinfVerdict`) and the sentence reader (`reader.ts` `posCheck`).

For each candidate the gate gives one of three verdicts, comparing the entry's POS against the
conjugation **class** the deinflector inferred from the surface:

| entry POS | verdict | effect |
|---|---|---|
| **absent / not a conjugation class** | `weak` | still found, ranked a little lower |
| a conjugation class that **matches** | `confirmed` | found, ranked normally |
| a conjugation class that **mismatches** | `rejected` | **dropped — not found from that inflection** |

The crucial asymmetry: **absent is safe (`weak`), wrong is fatal (`rejected`).** So:

> **If you are not certain of the conjugation class, omit `partOfSpeech` entirely.** Omitting costs a
> small ranking nudge. Guessing wrong loses the word from every inflected search. Omit beats guess.

(This is why the Warodai source, which carries no POS at all, is still fully searchable from inflected
forms — every one of its senses has empty POS, which the indexer stores as `NULL`, which is `weak`.)

### The rules

1. **`partOfSpeech` is codes only — never free text, never a human label.** Put any readable label
   ("verb", "transitive", "honorific") in `misc` instead, where it is shown verbatim. A free string in
   `partOfSpeech` that happens to start with `v`/`adj-`/`aux` can trigger `rejected`; everything else is
   merely ignored — so it is never useful and sometimes harmful.

2. **Only the conjugation classes matter.** All other jmdict POS codes (`n`, `exp`, `vt`, `vi`, `adv`,
   `adj-no`, …) are descriptive and ignored by search. They are harmless to include, but they do nothing
   — `misc` is the better home if you want them *shown*.

3. **The conjugation classes the engine understands** (verified — these are the complete set the
   deinflector emits) are:

   ```
   v1            ichidan (-ru) verbs:           食べる, 見る
   v5u v5k v5g v5s v5t v5n v5b v5m v5r   godan verbs, by dictionary-form final kana
   vk            来る (kuru)
   vs vs-i vs-s  する verbs (any of the three; vs-i is the usual JMdict tag)
   adj-i         い-adjectives:                 高い, 良い
   adj-na        な-adjectives:                 静か, 綺麗
   ```

   Use the **specific** godan class (`書く` → `v5k`, `泳ぐ` → `v5g`, `話す` → `v5s`). Irregular jmdict
   subclasses (`v1-s`, `v5k-s` for 行く, `v5r-i` for ある, `v5u-s`, `adj-ix` for いい) are fine — they
   match because the gate matches by **prefix** (`v5k-s` satisfies a `v5k` deinflection; `adj-ix`
   satisfies `adj-i`). You generally don't need to produce them; copying jmdict's exact code is correct.

4. **The Yomitan trap — never copy Yomitan's collapsed `v5`.** Yomitan's deinflection `rules` field
   collapses *every* godan verb to the bare string `"v5"`. Our engine has no `v5` class — it needs the
   specific one. The prefix match runs entry-against-class (`entryPOS.startsWith(class)`), so a bare
   `"v5"` satisfies **no** specific class (`"v5".startsWith("v5k")` is false) → **`rejected`**. A godan
   verb tagged only `"v5"` is therefore *worse than untagged*: untagged is `weak` (found), `"v5"` is
   `rejected` (lost). Two ways to do it right:
   - **Preferred:** take the POS from the Yomitan `definitionTags` field, which carries the *specific*
     jmdict code (`v5k`, `v5r`, …), not from `rules`.
   - **Fallback:** if all you have is `"v5"`, expand it by the dictionary form's final kana:

     | …う | …く | …ぐ | …す | …つ | …ぬ | …ぶ | …む | …る |
     |---|---|---|---|---|---|---|---|---|
     | v5u | v5k | v5g | v5s | v5t | v5n | v5b | v5m | v5r |

   - If you can't determine it, **omit** — `weak` is fine.

   (The same applies to bare `vt`/`vi` with no class, and to archaic classes the engine doesn't model
   such as `vz`/`v5aru` — see §7. When in doubt, omit.)

---

## 5. Glosses, languages, and cross-references

### Gloss language decides which search channel the gloss feeds

```jsonc
"гулять"                                  // bare string = { "lang": "ru", "origin": "original" }
{ "lang": "en", "text": "to take a walk" }
{ "lang": "ru", "text": "то же, что {0}", "origin": "original" }
```

- A **bare string is Russian** (`lang: "ru"`). For any other language you must use the object form with
  `lang`.
- `origin` is `"original"` (default) or `"machine"` (AI-produced). Display only.
- **How `lang` affects search (verified):** at index time a gloss with `lang: "ru"` is tokenised/stemmed
  as Russian and put in the **ru** reverse channel; **every other `lang` goes in the `en` channel**
  (English tokeniser/stemmer). At query time the channel is chosen by the **script the user typed**:
  Cyrillic → ru channel, Latin → en channel. Consequences:
  - For a Japanese→Russian dictionary, glosses **must** be `lang: "ru"` to be reachable by a Russian
    search. A Russian gloss mislabelled `en` will display fine but won't answer Cyrillic queries.
  - Latin-script languages (English, German, …) ride the `en` channel correctly with no extra work.
  - A **monolingual Japanese** gloss (`lang: "ja"`) lands in the `en` channel, where an English tokeniser
    over Japanese text produces nothing useful — such a gloss is effectively **display-only**; the entry
    is still found by its headword and reading, just not by its definition text. This is a real limit,
    not a bug to work around.

### Cross-references — `{n}` placeholders + `references`

A gloss may link to another word in the **same dictionary**. The link is an ICU-style numbered
placeholder `{0}`, `{1}` … in the gloss text, resolved against the sense's `references` array:

```jsonc
{
  "gloss": [ { "lang": "ru", "text": "вежливая форma {0}" } ],
  "references": [ { "label": "", "to": "1234567", "text": "言う" } ]
}
```

- `{0}` is replaced **at its position** by `references[0].text` as a tappable link; the surrounding
  words/parentheses/labels stay literal in the gloss string.
- `to` is the **`id` of the target word in this same file** (resolution is by source-internal id —
  "variant A"). At runtime the link opens `{ source: <this dictionary>, id: to }` — confined to the
  entry's own source, never a source named in the file. A `to` that matches nothing simply opens nothing.
- `label` is a relation marker kept verbatim (`"see"`, `"cf."`, `"ant."`). It is used for **trailing**
  references (no `{n}` — rendered after the gloss). For an **inline** `{n}` link, the label/parentheses
  live in the gloss text, so `label` is usually `""`.
- A literal `{` in gloss text must be written `'{'` (ICU quoting) so it isn't read as a placeholder.
  This is rare. Placeholders are stripped from the search index, so a linked word never pollutes this
  gloss's search terms.

**Yomitan caveat:** Yomitan links target a *query string* (`?query=見る`), not an id ("variant B"). To
turn that into a working `{n}` link you must resolve the query to a target `id` within your file — which
means you need the whole dictionary indexed by headword while converting. If you can't (e.g. you're
converting in chunks), the safe choice is to **drop the link to plain text** — keep the linked word as
ordinary words in the gloss, with no `references` entry. A dead link is worse than no link.

### 5a. Example sentences — three accepted shapes

`examples` accepts **any** of these shapes per element (the importer detects which):

```jsonc
// (a) od-dict/1 positional tuple — [japanese, translation]; an optional 3rd element marks an idiom.
"examples": [ ["ご飯を食べる", "есть рис"] ]

// (b) jmdict-simplified object — as emitted by the `jmdict-examples-eng` release.
//     The `jpn` sentence becomes the example, the `eng` sentence its translation.
"examples": [ {
  "source": { "type": "tatoeba", "value": "162365" },
  "text": "食べる",
  "sentences": [ { "lang": "jpn", "text": "私はリンゴを食べる。" },
                 { "lang": "eng", "text": "I eat an apple." } ]
} ]

// (c) od-dict/1 corpus object — what the tuple can't carry: a per-example citation `tag`.
"examples": [ { "text": "彼は走った。", "translation": "He ran.", "tag": "一/坊っちゃん" } ]
```

For shape (b): the per-sentence key is **`lang`** (3-letter ISO 639-3: `jpn`/`eng`), not `land`. An
element with no `jpn` sentence is skipped; a missing translation yields an empty string. This is what
makes a raw `jmdict-examples-eng` file import its example sentences directly.

Shape (c) is what a corpus builder emits for entry-level `examples` (an examples-only dictionary);
it is equally accepted on per-sense `examples`.

---

## 6. What the format does **not** carry

These are added by the app from its own shared data, keyed by surface/reading, so every dictionary
agrees on them — they are **not** fields you provide: pitch accent, furigana, romaji/Polivanov,
frequency / "common" ranking, audio/TTS, JLPT/WaniKani levels, kanji breakdown. (`common` and
`rankBase` are accepted as weak hints but the app's own frequency data dominates.)

Also not consumed today, despite being accepted for jmdict-simplified compatibility: the top-level
`tags` map, and per-form/per-gloss extras (`kanji[].tags`, gloss `gender`/`type`). The card renders
`misc`/`field`/`dialect` as **free strings, verbatim** — there is no tag-code expansion — so put
human-readable labels there directly, not codes.

---

## 7. Known problems when converting an *arbitrary* Yomitan dictionary

Honest list of where a real Yomitan dictionary doesn't map cleanly:

1. **Scale.** A dictionary is 10k–500k entries; an LLM can't convert it in one pass. Convert in batches
   and concatenate the `words` arrays into one file. Keep `id`s unique across batches (§3).
2. **Structured-content glosses.** Most modern Yomitan dictionaries store definitions as a node tree
   (divs, lists, ruby, tables, images, links). Our gloss is flat text + `{n}` links. You must **flatten**
   it: ruby → base text, lists → `; `-joined, and **drop images and tables**. This is lossy by design.
3. **Links target queries, not ids** (variant B). See §5 — resolve to an `id` or degrade to plain text.
4. **Meta-only and kanji dictionaries don't convert.** A Yomitan *frequency* or *pitch-accent*
   dictionary is `term_meta_bank` data with no glosses, and a *kanji* dictionary is `kanji_bank` data —
   neither maps to a word with meanings (§6 — the app supplies frequency/pitch/kanji itself). There is
   nothing to put in `words`. Only **term dictionaries with definitions** are convertible.
5. **POS classes the engine doesn't model.** A handful of real jmdict classes (`vz` する→じる verbs,
   `v5aru`, `vn`, `vr`) have no deinflection rule here, so tagging them gains nothing and a lone such tag
   risks `rejected`. Omit them (§4). Common verbs/adjectives are fully covered.
6. **No validation gate yet.** The importer currently trusts the file: it does not enforce size/count
   limits, does not strip control/bidi characters, and does not force `source` (§2). Until that lands,
   the file's correctness is on the producer. Produce strictly-valid JSON, reasonable sizes, and clean
   text.

---

## 8. Minimal and worked examples

The smallest possible word — a kana-only entry with one Russian gloss:

```json
{ "id": "w1", "kana": ["ありがとう"], "sense": [ { "gloss": ["спасибо"] } ] }
```

Three representative conversions (each verified to parse via `formatToEntry`):

```jsonc
// (a) JA→EN godan verb. POS is the SPECIFIC class v5k (from definitionTags), never Yomitan's "v5".
{ "id": "1578850", "kanji": ["書く"], "kana": ["かく"],
  "sense": [ { "partOfSpeech": ["v5k", "vt"],
    "gloss": [ { "lang": "en", "text": "to write; to compose; to pen" },
               { "lang": "en", "text": "to draw; to paint" } ] } ] }

// (b) JA→RU with an inline cross-reference. id is the headword so a ?query= link resolves to it.
{ "id": "敷衍", "kanji": ["敷衍", "敷延"], "kana": ["ふえん"],
  "sense": [ { "gloss": [ { "lang": "ru", "text": "развёртывание мысли (ср. {0})" } ],
    "references": [ { "label": "", "to": "演繹", "text": "演繹" } ] } ] }

// (c) kana-only な-adjective. adj-na IS a deinflection class, so it's worth tagging.
{ "id": "1000230", "kana": ["きれい"],
  "sense": [ { "partOfSpeech": ["adj-na"], "gloss": ["красивый; чистый; опрятный"] } ] }

// (d) a real corpus word from the built-in 坊っちゃん text: entry-level examples quoted from the
//     text, each with a citation `tag` (the chapter numeral here), and no senses at all (§3, §5a).
//     The translation is the PD English one (Morri 1918) — corpus translations are English-only.
{ "id": "無鉄砲·むてっぽう", "kanji": ["無鉄砲"], "kana": ["むてっぽう"],
  "examples": [ { "text": "親譲りの無鉄砲で小供の時から損ばかりしている。",
                  "translation": "Because of an hereditary recklessness, I have been playing always a losing game since my childhood.",
                  "tag": "一" } ] }
```

---

## 9. Quick reference — POS allowlist

Emit a code into `partOfSpeech` only if it is one of these (or a jmdict subclass that starts with one).
Anything else: put the human label in `misc` and omit it here.

```
v1
v5u v5k v5g v5s v5t v5n v5b v5m v5r
vk
vs vs-i vs-s
adj-i
adj-na
```

Collapsed Yomitan `"v5"` → expand by dictionary-form final kana:
`う→v5u  く→v5k  ぐ→v5g  す→v5s  つ→v5t  ぬ→v5n  ぶ→v5b  む→v5m  る→v5r`.

Unsure → omit.
