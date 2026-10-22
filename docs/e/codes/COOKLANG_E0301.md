---
code: COOKLANG_E0301
level: error
title: Tab used for indentation
---

## What this error means

A metadata block uses a tab character for indentation. Only spaces are allowed.

## Common causes

- An editor inserted tabs for indentation in the front matter

## How to fix it

Replace the tab characters with spaces.

```yaml
---
source:
  name: My cookbook
---
```
