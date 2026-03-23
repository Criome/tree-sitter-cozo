# tree-sitter-cozo — Agent Guidelines

## Grammar Authoring

### Source of Truth
The authoritative CozoScript syntax is `cozo-core/src/cozoscript.pest` in the CozoDB repository. Operator precedence follows the Pratt parser in `cozo-core/src/parse/expr.rs`.

### Design Principles (from samskara Rust rules)

These Rust invariants transfer to grammar authoring:

- **One rule = one syntactic concept** (`rust-everything-is-object`). Split aggressively.
- **Ownership via structure** (`rust-single-owner`). Each token is owned by exactly one parent node.
- **Named rules for domain concepts** (`rust-domain-types-not-primitives`). Never use bare regexes where a named rule serves.
- **`field()` names are contracts** (`rust-contract-only-coupling`). Every field position has a semantic purpose.
- **`choice()` enumerates all alternatives** (`rust-enum-is-source-of-truth`). No implicit branching.
- **Grammar rules are pure** (`rust-init-envelope-purity`). Lexical state belongs in externals only.
- **Precedence in a named object** (`rust-logic-data-separation`). `PREC = { ... }` — not scattered magic numbers.
- **Grammar is self-contained** (`rust-repo-self-containment`). One `grammar.js`, no external parser imports.

### Known Pitfalls

1. **`word` directive breaks single-char identifiers near token prefixes.** If a rule starts with a single character that's also a valid identifier (`x` for bytes, `u` for uuid), the `word` directive causes misparses. Use `token(seq('x"', ...))` to require immediate adjacency.

2. **Optional arguments on commands create LR ambiguity.** `::relations identifier?` — is the identifier an argument or the next statement? Fix by enumerating which commands take arguments vs. which don't (split the grammar).

3. **`aggregation` vs `function_call` structural identity.** `count(x)` in a rule head could be either. Use `prec(PREC.call + 1, ...)` on aggregation to prefer it inside rule heads.

4. **`_raw_string` must not shadow `_double_quoted_string`.** CozoDB raw strings use `_*"..."_*` delimiters (underscore, not `r`). A bare `"..."` alternative in `_raw_string` will shadow normal string parsing.

## Building

```bash
tree-sitter generate   # Regenerate src/parser.c from grammar.js
tree-sitter test       # Run test corpus
nix build .#           # Build via flake (produces .so + queries)
```

## Nix Flake

The flake exposes `packages.${system}.default` — a derivation containing:
- `lib/libtree-sitter-cozo.so` — shared library
- `queries/highlights.scm` — tree-sitter CLI highlighting queries
- `queries/locals.scm` — scope queries
- `src/grammar.json` — grammar metadata
- `src/node-types.json` — node type metadata

CriomOS consumes this via `inputs.tree-sitter-cozo` with `nixpkgs.follows`.

## Emacs Integration (in CriomOS)

The `.scm` query files are for the tree-sitter CLI, **not for Emacs**. Emacs requires:
1. `treesit-font-lock-settings` via `treesit-font-lock-rules` — elisp face mappings
2. `treesit-font-lock-feature-list` — feature groups controlling which rules are active
3. These must be set BEFORE calling `treesit-major-mode-setup`

Custom Emacs themes (including ignis) must define Emacs 29+ tree-sitter faces:
`font-lock-number-face`, `font-lock-operator-face`, `font-lock-function-call-face`,
`font-lock-bracket-face`, `font-lock-property-use-face`, `font-lock-escape-face`,
`font-lock-delimiter-face`, `font-lock-misc-punctuation-face`, `font-lock-variable-use-face`.
Without these, highlighting falls back to default foreground (invisible).

## VCS

Jujutsu mandatory. Commit messages use three-tuple CozoScript format.
