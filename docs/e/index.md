---
title: Diagnostic codes
---

<script setup>
import { data as pages } from "./codes.data";
import { withBase } from "vitepress";
</script>

# Diagnostic codes

Every error thrown by, and every diagnostic returned by, `@tmlmt/cooklang-parser` has a stable code of the form `COOKLANG_<S><D><NNN>`:

- `S` is the severity: `E` for an error, `W` for a warning
- `D` is the domain: `1` recipe syntax, `2` references, `3` metadata, `4` quantities and units, `5` shopping list, `6` shopping cart and product catalog, `7` pantry and category configuration, `9` fatal errors
- `NNN` is a sequence number

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
