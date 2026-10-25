---
code: COOKLANG_W0101
level: warning
title: Unterminated block comment
---

## What this error means

A block comment was opened with `[-` but never closed with `-]`. Parsing continues, but the text may not be interpreted as intended.

## Common causes

- A missing `-]`
- A literal `[-` in the text that was not meant to be a comment

## How to fix it

```text
-- Wrong
Mix well [- remember to stir
-- Correct
Mix well [- remember to stir -]
```
