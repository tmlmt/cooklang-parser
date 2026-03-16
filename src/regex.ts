import { createRegex } from "human-regex";

/** Matches all top-level metadata keys in frontmatter content */
export const metadataKeyRegex = /^([^:\n]+?):/gm;

/** Matches a number (integer or decimal, optionally negative) */
export const numericValueRegex = /^-?\d+(\.\d+)?$/;

/** Creates a regex to match a nested YAML-style object for a given key 
 * 
 * Nested properties should be indented at least by one space and can be nested arbitrarily deep. Tabs are not allowed for indentation.
 * Lines can be key-value pairs or list items (starting with `-`).
*/
export const nestedMetaVarRegex = (varName: string): RegExp =>
  new RegExp(
    `^${varName}:\\s*\\r?\\n((?:[ ]+.+(?:\\r?\\n|$))+)`,
    "m",
  );

export const metadataRegex = createRegex()
  .literal("---").newline()
  .startCaptureGroup().anyCharacter().zeroOrMore().optional().endGroup()
  .newline().literal("---")
  .dotAll().toRegExp();

const nonWordChar = "\\s@#~\\[\\]{(,;:!?"
const nonWordCharStrict = "\\s@#~\\[\\]{(,;:!?|"

export const ingredientWithAlternativeRegex = createRegex()
  .literal("@")
  .startNamedGroup("ingredientModifiers")
    .anyOf("@\\-&?").zeroOrMore()
  .endGroup().optional()
  .startNamedGroup("ingredientRecipeAnchor")
    .literal("./")
  .endGroup().optional()
  .startGroup()
    .startGroup()
      .startNamedGroup("mIngredientName")
        .notAnyOf(nonWordChar).oneOrMore()
        .startGroup()
          .whitespace().oneOrMore().notAnyOf(nonWordChar).oneOrMore()
        .endGroup().oneOrMore()
      .endGroup()
      .positiveLookahead("\\s*(?:\\{[^\\}]*\\}|\\([^)]*\\))")
    .endGroup()
    .or()
    .startNamedGroup("sIngredientName")
      .notAnyOf(nonWordChar).zeroOrMore()
      .notAnyOf("\\."+nonWordChar)
    .endGroup()
  .endGroup()
  .startGroup()
    .literal("{")
    .startNamedGroup("ingredientQuantityModifier")
      .literal("=").exactly(1)
    .endGroup().optional()
    .startNamedGroup("ingredientQuantity")
      .startGroup()
        .notAnyOf("}|%").oneOrMore()
      .endGroup().optional()
      .startGroup()
        .literal("%")
        .notAnyOf("|}").oneOrMore().lazy()
      .endGroup().optional()
      .startGroup()
        .literal("|")
        .notAnyOf("}").oneOrMore().lazy()
      .endGroup().zeroOrMore()
    .endGroup()
    .literal("}")
  .endGroup().optional()
  .startGroup()
    .literal("(")
    .startNamedGroup("ingredientPreparation")
      .notAnyOf(")").oneOrMore().lazy()
    .endGroup()
    .literal(")")
  .endGroup().optional()
  .startGroup()
    .literal("[")
    .startNamedGroup("ingredientNote")
      .notAnyOf("\\]").oneOrMore().lazy()
    .endGroup()
    .literal("]")
  .endGroup().optional()
  .startNamedGroup("ingredientAlternative")
    .startGroup()
      .literal("|")
      .startGroup()
        .anyOf("@\\-&?").zeroOrMore()
      .endGroup().optional()
      .startGroup()
        .literal("./")
      .endGroup().optional()
      .startGroup()
        .startGroup()
          .startGroup()
            .notAnyOf(nonWordChar).oneOrMore()
            .startGroup()
              .whitespace().oneOrMore().notAnyOf(nonWordChar).oneOrMore()
            .endGroup().oneOrMore()
          .endGroup()
          .positiveLookahead("\\s*(?:\\{[^\\}]*\\}|\\([^)]*\\))")
        .endGroup()
        .or()
        .startGroup()
          .notAnyOf(nonWordChar).oneOrMore()
        .endGroup()
      .endGroup()
      .startGroup()
        .literal("{")
        .startGroup()
          .literal("=").exactly(1)
        .endGroup().optional()
        .startGroup()
          .notAnyOf("}%").oneOrMore()
        .endGroup().optional()
        .startGroup()
          .literal("%")
          .startGroup()
            .notAnyOf("}").oneOrMore().lazy()
          .endGroup()
        .endGroup().optional()
        .literal("}")
      .endGroup().optional()
      .startGroup()
        .literal("(")
        .startGroup()
          .notAnyOf(")").oneOrMore().lazy()
        .endGroup()
        .literal(")")
      .endGroup().optional()
      .startGroup()
        .literal("[")
        .startGroup()
          .notAnyOf("\\]").oneOrMore().lazy()
        .endGroup()
        .literal("]")
      .endGroup().optional()
    .endGroup().zeroOrMore()
  .endGroup()
  .toRegExp();

export const inlineIngredientAlternativesRegex = new RegExp("\\|" + ingredientWithAlternativeRegex.source.slice(1))

export const quantityAlternativeRegex = createRegex()
  .startNamedGroup("quantity")
    .notAnyOf("{}|%").oneOrMore()
  .endGroup().optional()
  .startGroup()
    .literal("%")
    .startNamedGroup("unit")
      .notAnyOf("|}").oneOrMore()
    .endGroup()
  .endGroup().optional()
  .startGroup()
    .literal("|")
    .startNamedGroup("alternative")
      .startGroup()
        .notAnyOf("}").oneOrMore()
      .endGroup().zeroOrMore()
    .endGroup()
  .endGroup().optional()
  .toRegExp()
  
export const ingredientWithGroupKeyRegex = createRegex()
  .literal("@|")
  .startNamedGroup("gIngredientGroupKey")
    .notAnyOf(nonWordCharStrict+"/").oneOrMore()
  .endGroup()
  .startGroup()
    .literal("/")
    .startNamedGroup("gIngredientSubgroupKey")
      .notAnyOf(nonWordCharStrict).oneOrMore()
    .endGroup()
  .endGroup().optional()
  .literal("|")
  .startNamedGroup("gIngredientModifiers")
    .anyOf("@\\-&?").zeroOrMore()
  .endGroup().optional()
  .startNamedGroup("gIngredientRecipeAnchor")
    .literal("./")
  .endGroup().optional()
  .startGroup()
    .startGroup()
      .startNamedGroup("gmIngredientName")
        .notAnyOf(nonWordChar).oneOrMore()
        .startGroup()
          .whitespace().oneOrMore().notAnyOf(nonWordChar).oneOrMore()
        .endGroup().oneOrMore()
      .endGroup()
      .positiveLookahead("\\s*(?:\\{[^\\}]*\\}|\\([^)]*\\))")
    .endGroup()
    .or()
    .startNamedGroup("gsIngredientName")
      .notAnyOf(nonWordChar).zeroOrMore()
      .notAnyOf("\\."+nonWordChar)
    .endGroup()
  .endGroup()
  .startGroup()
    .literal("{")
    .startNamedGroup("gIngredientQuantityModifier")
      .literal("=").exactly(1)
    .endGroup().optional()
    .startNamedGroup("gIngredientQuantity")
      .startGroup()
        .notAnyOf("}|%").oneOrMore()
      .endGroup().optional()
      .startGroup()
        .literal("%")
        .notAnyOf("|}").oneOrMore().lazy()
      .endGroup().optional()
      .startGroup()
        .literal("|")
        .notAnyOf("}").oneOrMore().lazy()
      .endGroup().zeroOrMore()
    .endGroup()
    .literal("}")
  .endGroup().optional()
  .startGroup()
    .literal("(")
    .startNamedGroup("gIngredientPreparation")
      .notAnyOf(")").oneOrMore().lazy()
    .endGroup()
    .literal(")")
  .endGroup().optional()
  .startGroup()
    .literal("[")
    .startNamedGroup("gIngredientNote")
      .notAnyOf("\\]").oneOrMore().lazy()
    .endGroup()
    .literal("]")
  .endGroup().optional()
  .toRegExp()

export const ingredientAliasRegex = createRegex()
  .startAnchor()
  .startNamedGroup("ingredientListName")
    .notAnyOf("|").oneOrMore()
  .endGroup()
  .literal("|")
  .startNamedGroup("ingredientDisplayName")
    .notAnyOf("|").oneOrMore()
  .endGroup()
  .endAnchor()
  .toRegExp();

export const cookwareRegex = createRegex()
  .literal("#")
  .startNamedGroup("cookwareModifiers")
    .anyOf("\\-&?").zeroOrMore()
  .endGroup()
  .startGroup()
    .startGroup()
      .startNamedGroup("mCookwareName")
        .notAnyOf(nonWordChar).oneOrMore()
        .startGroup()
          .whitespace().oneOrMore().notAnyOf(nonWordChar).oneOrMore()
        .endGroup().oneOrMore()
      .endGroup().positiveLookahead("\\s*(?:\\{[^\\}]*\\})")
    .endGroup()
    .or()
    .startNamedGroup("sCookwareName")
      .notAnyOf(nonWordChar).zeroOrMore()
      .notAnyOf("\\."+nonWordChar)
    .endGroup()
  .endGroup()
  .startGroup()
    .literal("{")
    .startNamedGroup("cookwareQuantity")
      .anyCharacter().zeroOrMore().lazy()
    .endGroup()
    .literal("}")
  .endGroup().optional()
  .toRegExp();

const timerRegex = createRegex()
  .literal("~")
  .startNamedGroup("timerName")
    .anyCharacter().zeroOrMore().lazy()
  .endGroup()
  .literal("{")
  .startNamedGroup("timerQuantity")
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .startGroup()
    .literal("%")
    .startNamedGroup("timerUnit")
      .anyCharacter().oneOrMore().lazy()
    .endGroup()
  .endGroup().optional()
  .literal("}")
  .toRegExp()

export const arbitraryScalableRegex = createRegex()
  .literal("{{")
  .startGroup()
    .startNamedGroup("arbitraryName")
      .notAnyOf("}:%").oneOrMore()
    .endGroup()
    .literal(":")
  .endGroup().optional()
  .startNamedGroup("arbitraryQuantity")
    .startGroup()
      .notAnyOf("}|%").oneOrMore()
    .endGroup().optional()
    .startGroup()
      .literal("%")
      .notAnyOf("|}").oneOrMore().lazy()
    .endGroup().optional()
    .startGroup()
      .literal("|")
      .notAnyOf("}").oneOrMore().lazy()
    .endGroup().zeroOrMore()
  .endGroup()
  .literal("}}")
  .toRegExp();

export const tokensRegex = new RegExp(
  [
    ingredientWithGroupKeyRegex,
    ingredientWithAlternativeRegex,
    cookwareRegex,
    timerRegex,
    arbitraryScalableRegex
  ]
    .map((r) => r.source)
    .join("|"),
  "gu",
);


/** Matches optional trimmed text before the `{{...}}` scalable */
export const yieldPrefixPart = createRegex()
  .startAnchor()
  .literal("yield")
  .literal(":")
  .anyOf("\t ").zeroOrMore()
  .startNamedGroup("servingsPrefix")
    .nonWhitespace()
    .startGroup()
      .anyCharacter().zeroOrMore().lazy()
      .nonWhitespace()
    .endGroup().optional()
  .endGroup().optional()
  .anyOf("\t ").zeroOrMore()
  .toRegExp()

/** Matches optional trimmed text after the `{{...}}` scalable */
const yieldSuffixPart = createRegex()
  .anyOf("\t ").zeroOrMore()
  .startNamedGroup("servingsSuffix")
    .nonWhitespace()
    .startGroup()
      .anyCharacter().zeroOrMore()
      .nonWhitespace()
    .endGroup().optional()
  .endGroup().optional()
  .anyOf("\t ").zeroOrMore()
  .endAnchor()
  .toRegExp()


/** Matches a complex servings value: optional trimmed text prefix, an arbitrary scalable `{{...}}`, and optional trimmed text suffix.
 * Named groups `servingsPrefix` and `servingsSuffix` capture surrounding text without leading/trailing spaces.
 * Inherits `arbitraryName` and `arbitraryQuantity` named groups from {@link arbitraryScalableRegex}.
 */
export const yieldMetaValueWithUnitRegex = new RegExp(
  yieldPrefixPart.source +
  arbitraryScalableRegex.source +
  yieldSuffixPart.source, "m"
);

export const yieldMetaValueAsQuantityRegex = createRegex()
  .startAnchor()
  .literal("yield:")
  .anyOf("\t ").zeroOrMore()
  .startNamedGroup("quantity")
    .notAnyOf("{}|%\\n\\r").oneOrMore()
  .endGroup().optional()
  .startGroup()
    .literal("%")
    .startNamedGroup("unit")
      .notAnyOf("\\n\\r|}").oneOrMore()
    .endGroup()
  .endGroup().optional()
  .anyOf("\t ").zeroOrMore()
  .endAnchor()
  .toRegExp()


/** Matches a yield metadata value in two ways (via alternation):
 * 1. Complex format: `yield: <optional prefix> {{<quantity>%<unit>}} <optional suffix>`
 * 2. Plain format: `yield: <quantity>%<unit>` (e.g. `yield: 300%g` or `yield: 2`)
 */
export const yieldMetaValueRegex = new RegExp(
  [
    yieldMetaValueWithUnitRegex.source,
    yieldMetaValueAsQuantityRegex.source
  ].join("|"),
  "m",
);

export const commentRegex = createRegex()
  .literal("--")
  .anyCharacter().zeroOrMore()
  .global()
  .toRegExp();

export const blockCommentRegex = createRegex()
  .literal("[-")
  .anyCharacter().zeroOrMore().lazy()
  .literal("-]")
  .whitespace().zeroOrMore()
  .global()
  .toRegExp();

export const shoppingListRegex = createRegex()
  .literal("[")
  .startNamedGroup("name")
    .anyCharacter().oneOrMore()
  .endGroup()
  .literal("]")
  .newline()
  .startNamedGroup("items")
    .anyCharacter().zeroOrMore().lazy()
  .endGroup()
  .startGroup()
    .newline().newline()
      .or()
    .endAnchor()
  .endGroup()
  .global()
  .toRegExp()

export const rangeRegex = createRegex()
  .startAnchor()
  .digit().oneOrMore()
  .startGroup()
  .anyOf(".,/").exactly(1)
    .digit().oneOrMore()
  .endGroup().optional()
  .literal("-")
  .digit().oneOrMore()
  .startGroup()
    .anyOf(".,/").exactly(1)
    .digit().oneOrMore()
  .endGroup().optional()
  .endAnchor()
  .toRegExp()

export const numberLikeRegex = createRegex()
  .startAnchor()
  .digit().oneOrMore()
  .startGroup()
    .anyOf(".,/").exactly(1)
    .digit().oneOrMore()
  .endGroup().optional()
  .endAnchor()
  .toRegExp()

export const floatRegex = createRegex()
  .startAnchor()
  .digit().oneOrMore()
  .startGroup()
    .anyOf(".").exactly(1)
    .digit().oneOrMore()
  .endGroup().optional()
  .endAnchor()
  .toRegExp()
  
/**
 * Matches a variant tag at the start of a step line or in a section name.
 * - `[*]` — default variant
 * - `[vegan]` — single variant
 * - `[vegan,vegetarian]` — multiple variants
 * - `[?vegan]` — optional step for this variant
 *
 * Named groups:
 * - `variantOptionalPrefix`: the `?` character if present
 * - `variantNames`: comma-separated variant names (e.g. `"vegan,vegetarian"`), empty when `[?]`
 */
export const variantTagRegex = createRegex()
  .startAnchor()
  .literal("[")
  .startNamedGroup("variantOptionalPrefix")
    .literal("?")
  .endGroup().optional()
  .startNamedGroup("variantNames")
    .notAnyOf("\\]").zeroOrMore()
  .endGroup()
  .literal("]")
  .whitespace().zeroOrMore()
  .toRegExp()

/** Markdown: escaped character *, _, \` */
const mdEscaped = createRegex()
  .literal("\\")
  .startCaptureGroup()
    .anyOf("*_`")
  .endGroup();

/** Markdown: inline code `code` */
const mdInlineCode = createRegex()
  .literal("`")
  .startCaptureGroup()
    .notAnyOf("`").oneOrMore().lazy()
  .endGroup()
  .literal("`");

/** Markdown: link `[text](url)` */
const mdLink = createRegex()
  .literal("[")
  .startCaptureGroup()
    .notAnyOf("\\]").oneOrMore().lazy()
  .endGroup()
  .literal("](")
  .startCaptureGroup()
    .notAnyOf(")").oneOrMore().lazy()
  .endGroup()
  .literal(")");

/** Markdown: bold+italic `***text***` */
const mdTripleAsterisk = createRegex()
  .literal("***")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("***");

/** Markdown: bold+italic `___text___` */
const mdTripleUnderscore = createRegex()
  .literal("___")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("___");

/** Markdown: bold+italic `**_text_**` */
const mdBoldAstItalicUnd = createRegex()
  .literal("**_")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("_**");

/** Markdown: bold+italic `__*text*__` */
const mdBoldUndItalicAst = createRegex()
  .literal("__*")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("*__");

/** Markdown: bold+italic `*__text__*` */
const mdItalicAstBoldUnd = createRegex()
  .literal("*__")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("__*");

/** Markdown: bold+italic `_**text**_` */
const mdItalicUndBoldAst = createRegex()
  .literal("_**")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("**_");

/** Markdown: bold `**text**` */
const mdBoldAsterisk = createRegex()
  .literal("**")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("**");

/** Markdown: bold `__text__` (word boundaries) */
const mdBoldUnderscore = createRegex()
  .wordBoundary()
  .literal("__")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("__")
  .wordBoundary();

/** Markdown: italic `*text*` */
const mdItalicAsterisk = createRegex()
  .literal("*")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("*");

/** Markdown: italic `_text_` (word boundaries) */
const mdItalicUnderscore = createRegex()
  .wordBoundary()
  .literal("_")
  .startCaptureGroup()
    .anyCharacter().oneOrMore().lazy()
  .endGroup()
  .literal("_")
  .wordBoundary()

/**
 * Matches markdown formatting patterns in text.
 *
 * Matches in priority order (earlier alternatives take precedence):
 * 1. Escaped characters: `\*`, `\_`, `\` + backtick
 * 2. Inline code: backtick-delimited spans
 * 3. Links: `[text](url)`
 * 4. Bold+italic (triple): `***text***`, `___text___`
 * 5. Bold+italic (mixed): `**_text_**`, `__*text*__`, `*__text__*`, `_**text**_`
 * 6. Bold: `**text**`, `__text__` (underscores at word boundaries)
 * 7. Italic: `*text*`, `_text_` (underscores at word boundaries)
 */
export const markdownRegex = new RegExp(
  [
    mdEscaped,
    mdInlineCode,
    mdLink,
    mdTripleAsterisk,
    mdTripleUnderscore,
    mdBoldAstItalicUnd,
    mdBoldUndItalicAst,
    mdItalicAstBoldUnd,
    mdItalicUndBoldAst,
    mdBoldAsterisk,
    mdBoldUnderscore,
    mdItalicAsterisk,
    mdItalicUnderscore,
  ]
    .map((r) => r.toRegExp().source)
    .join("|"),
  "g",
);