---
code: COOKLANG_E0302
level: error
title: Inconsistent indentation
---

## What this error means

A nested metadata block has inconsistent indentation.

## Common causes

- Children are indented less than, or unevenly compared with, their siblings

## How to fix it

Indent all lines of a nested block by the same amount of spaces.

```yaml
---
source:
  name: My cookbook
  url: https://example.com
---
```
