export const metadataRegex = /---\n(.*?)\n---/s;

const multiwordIngredient =
  /@(?<mIngredientModifier>[@\-&+*!?])?(?<mIngredientName>(?:[^\s@#~\[\]{(.,;:!?]+(?:\s+[^\s@#~\[\]{(.,;:!?]+)+))(?=\s*(?:\{|\}|\(\s*[^)]*\s*\)))(?:\{(?<mIngredientQuantity>\p{No}|(?:\p{Nd}+(?:[.,\/][\p{Nd}]+)?))?(?:%(?<mIngredientUnits>[^}]+?))?\})?(?:\((?<mIngredientPreparation>[^)]*?)\))?/gu;
const singleWordIngredient =
  /@(?<sIngredientModifier>[@\-&+*!?])?(?<sIngredientName>[^\s@#~\[\]{(.,;:!?]+)(?:\{(?<sIngredientQuantity>\p{No}|(?:\p{Nd}+(?:[.,\/][\p{Nd}]+)?))(?:%(?<sIngredientUnits>[^}]+?))?\})?(?:\((?<sIngredientPreparation>[^)]*?)\))?/gu;

const multiwordCookware =
  /#(?<mCookwareModifier>[\-&+*!?])?(?<mCookwareName>[^#~[]+?)\{(?<mCookwareQuantity>.*?)\}/;
const singleWordCookware =
  /#(?<sCookwareModifier>[\-&+*!?])?(?<sCookwareName>[^\s\t\s\p{P}]+)/u;

const timer =
  /~(?<timerName>.*?)(?:\{(?<timerQuantity>.*?)(?:%(?<timerUnits>.+?))?\})/;

export const tokensRegex = new RegExp(
  [
    multiwordIngredient,
    singleWordIngredient,
    multiwordCookware,
    singleWordCookware,
    timer,
  ]
    .map((r) => r.source)
    .join("|"),
  "gu",
);

export const commentRegex = /--.*/g;
export const blockCommentRegex = /\s*\[\-.*?\-\]\s*/g;

export const shoppingListRegex =
  /\n\s*\[(?<name>.+)\]\n(?<items>[^]*?)(?:\n\n|$)/g;
