---
title: Diagnostic codes
---

<script setup>
import { data as pages } from "./codes.data";
import { withBase } from "vitepress";
</script>

# Diagnostic codes

Every error thrown by, and every diagnostic returned by, `@tmlmt/cooklang-parser` has a stable code of the form `COOKLANG_<L><T><D><NN>`:

- `L` is the letter: `E` for an error, `W` for a warning, or `I` for an internal/library bug.
- `T` is a tier digit used only for `E` codes: `0` for recoverable errors, which are collected while parsing continues and do not make the call throw, so the partial result stays available. `9` for fatal errors, where it is not safe to continue and the call throws. It is always `0` for `W` and `I` codes.
- `D` is the domain: `0` generic/internal, `1` recipe syntax, `2` references, `3` metadata, `4` quantities and units, `5` shopping list, `6` shopping cart and product catalog, or `7` pantry and category configuration.
- `NN` is a two-digit sequence number.

Warnings never make a call fail. Internal errors indicate a library bug and behave like fatal errors. Fatal errors stop the affected work when detected and make the call throw a `DiagnosticError`, which carries the diagnostics collected up to that point.

See the [parse diagnostics guide](/guide-diagnostics) to learn how to consume them.

<table>
  <thead>
    <tr><th>Code</th><th>Level</th><th>Title</th></tr>
  </thead>
  <tbody>
    <tr v-for="page in pages" :key="page.code">
      <td><a :href="withBase('/e/' + page.code.toLowerCase())"><code>{{ page.code }}</code></a></td>
      <td>{{ page.level }}</td>
      <td>{{ page.title }}</td>
    </tr>
  </tbody>
</table>
