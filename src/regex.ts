import {
  createRegExp,
  anyOf,
  char,
  charIn,
  charNotIn,
  carriageReturn,
  digit,
  exactly,
  global,
  linefeed,
  maybe,
  oneOrMore,
  unicode,
  whitespace,
} from 'magic-regexp'

// ---------- Shared atoms ----------

// Cross-platform newline (\r\n, \n)
const newLine = anyOf(carriageReturn.and(linefeed), linefeed)

// A generic "any char incl. newline"
const anyCharInclNewLine = anyOf(char, newLine)

// A "word token" = anything not in forbidden set
const tokenChar = charNotIn(' \t\r\n@#~[]{}(.,;:!?)')
const wordToken = oneOrMore(tokenChar)

// Multiword = at least two tokens separated by whitespace
const multiword = wordToken.and(oneOrMore(whitespace.and(wordToken)))

// Quantity = digits with optional . , /
const asciiQuantity =
  oneOrMore(digit).and(maybe(charIn('.,/').and(oneOrMore(digit))))

// { quantity%units } with parametric group names
const quantityBraces = (quantityName: string, unitsName: string) =>
  exactly('{')
    .and(maybe(asciiQuantity.groupedAs(quantityName)))
    .and(maybe(exactly('%').and(oneOrMore(charNotIn('}')).groupedAs(unitsName))))
    .and('}')

// ( preparation ) reusable
const preparationBraces = (preparationName: string) => 
  exactly('(')
    .and(charNotIn(')').times.any().groupedAs(preparationName))
    .and(')')

// Used for lookahead (with dummy group names to avoid clashes)
const nameFollowLookahead =
  whitespace.times.any().and(
    anyOf(quantityBraces('q_', 'u_'), preparationBraces('p_'))
  )

// ---------- Concrete patterns ----------

// --- metadata:  ---\n<body>\n---
export const metadataRegex = createRegExp(
  exactly('---'),
  newLine,
  anyCharInclNewLine.times.any().before(newLine.and(exactly('---'))).groupedAs('metadata'),
  newLine,
  exactly('---'),
  [unicode, 's'] // dotAll because original had /s
)

// --- Tokens ---

// Multiword Ingredient
const multiwordIngredient = 
  exactly('@')
    .and(maybe(charIn('@-&?').groupedAs('mIngredientModifier')))
    .and(multiword.before(nameFollowLookahead).groupedAs('mIngredientName'))
    .and(maybe(quantityBraces('mIngredientQuantity', 'mIngredientUnits')))
    .and(maybe(preparationBraces('mIngredientPreparation')))

// Single-word Ingredient
const singleWordIngredient = 
  exactly('@')
    .and(maybe(charIn('@-&+*!?').groupedAs('sIngredientModifier')))
    .and(wordToken.groupedAs('sIngredientName'))
    .and(maybe(quantityBraces('sIngredientQuantity', 'sIngredientUnits')))
    .and(maybe(preparationBraces('sIngredientPreparation')))

// Multiword Cookware
const multiwordCookware = 
  exactly('#')
    .and(maybe(charIn('-&+*!?').groupedAs('mCookwareModifier')))
    .and(multiword.before(nameFollowLookahead).groupedAs('mCookwareName'))
    .and(
      exactly('{')
        .and(charNotIn('}').times.any().groupedAs('mCookwareQuantity'))
        .and('}')
    )

// Single-word Cookware
const singleWordCookware = 
  exactly('#')
    .and(maybe(charIn('-&+*!?').groupedAs('sCookwareModifier')))
    .and(wordToken.groupedAs('sCookwareName'))
    .and(
      maybe(
        exactly('{')
          .and(charNotIn('}').times.any().groupedAs('sCookwareQuantity'))
          .and('}')
      )
    )

// --- Timer ---
const timer = 
  exactly('~')
    .and(anyCharInclNewLine.times.any().before('{').groupedAs('timerName'))
    .and('{')
    .and(
      anyCharInclNewLine.times.any().before(anyOf('%', '}')).groupedAs('timerQuantity')
    )
    .and(
      maybe(exactly('%').and(anyCharInclNewLine.times.any().before('}').groupedAs('timerUnits')))
    )
    .and('}')

// --- Combined Tokens ---
export const tokensRegex = createRegExp(
  anyOf(
    multiwordIngredient,
    singleWordIngredient,
    multiwordCookware,
    singleWordCookware,
    timer
  ),
  [global, unicode]
)

// --- Comments ---
export const commentRegex = createRegExp(
  exactly('--').and(char.times.any()),
  [global]
)

export const blockCommentRegex = createRegExp(
  whitespace.times.any(),
  '[-',
  anyCharInclNewLine.times.any().before('-]'),
  '-]',
  whitespace.times.any(),
  [global]
)

// --- Shopping List ---
export const shoppingListRegex = createRegExp(
  '[',
  oneOrMore(anyCharInclNewLine).before(']').groupedAs('name'),
  ']',
  linefeed,
  anyCharInclNewLine.times.any()
    .before(anyOf(linefeed.and(linefeed), ''))
    .groupedAs('items'),
  [global]
)
