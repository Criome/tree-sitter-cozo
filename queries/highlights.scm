; CozoScript highlight queries

; ─── Comments ────────────────────────────────────────────
(comment) @comment

; ─── Sigil-prefixed constructs ───────────────────────────

; Stored relation: *name{...}
(stored_relation
  name: (identifier) @type)

; Search index: ~name{...|...}
(search_apply
  name: (identifier) @type)

; Mutation commands: :create, :put, :rm, etc.
(mutation_command
  command: (command_name) @keyword)

; System commands: ::relations, ::explain, etc.
(system_command
  (command_name) @keyword.builtin)

; Query options: :limit, :offset, etc.
(query_option
  option: (option_name) @keyword.directive)

; Parameters: $name
(parameter) @variable.parameter

; ─── Rule structure ──────────────────────────────────────

; Rule head name (? for entry queries, identifier for named rules)
(rule_head
  name: (identifier) @function)

; Connectors: :=  <-  <~
(inline_rule ":=" @keyword.operator)
(constant_rule "<-" @keyword.operator)
(fixed_rule "<~" @keyword.operator)

; ─── Imperative control flow ─────────────────────────────
(if_block) @keyword.control
(if_not_block) @keyword.control
(loop_block) @keyword.control
(debug_statement) @keyword.control
(ignore_error_statement) @keyword.control
(return_statement) @keyword.control
(break_statement) @keyword.control
(continue_statement) @keyword.control
(swap_statement) @keyword.control

; ─── Expressions ─────────────────────────────────────────

; Function calls
(function_call
  name: (identifier) @function.call)

; Operators
(operator) @operator

; Negation
(negation "not" @keyword.operator)

; Disjunction
(disjunction "or" @keyword.operator)

; Unification/membership
(unification "=" @operator)
(multi_unification "in" @keyword.operator)

; Aggregation in rule heads
(aggregation
  function: (identifier) @function.builtin)

; Conditional
(conditional_expression "if" @keyword)

; ─── Types ───────────────────────────────────────────────
(simple_type) @type.builtin
(vec_type) @type.builtin

; ─── Literals ────────────────────────────────────────────
(string) @string
(escape_sequence) @string.escape
(number) @number
(boolean) @constant.builtin
(null) @constant.builtin

; ─── Algorithm names ─────────────────────────────────────
(fixed_rule
  algorithm: (identifier) @type)

; ─── Schema ──────────────────────────────────────────────
(column_definition
  name: (identifier) @variable.other.member)

(named_binding
  key: (identifier) @variable.other.member)

(fixed_option
  key: (identifier) @variable.other.member)

(index_option
  key: (identifier) @variable.other.member)

(object_pair
  key: (identifier) @variable.other.member)

; ─── Punctuation ─────────────────────────────────────────
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ";" "=>"] @punctuation.delimiter
["*" "~" "?" "::" "@"] @punctuation.special

; ─── Identifiers (fallback — must be last) ───────────────
(identifier) @variable
