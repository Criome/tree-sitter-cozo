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
(if_block "%if" @keyword.control)
(if_block "%then" @keyword.control)
(if_block "%else" @keyword.control)
(if_block "%end" @keyword.control)
(if_not_block "%if_not" @keyword.control)
(if_not_block "%then" @keyword.control)
(if_not_block "%else" @keyword.control)
(if_not_block "%end" @keyword.control)
(loop_block "%loop" @keyword.control)
(loop_block "%end" @keyword.control)
(loop_block "%mark" @keyword.control)
(break_statement "%break" @keyword.control)
(continue_statement "%continue" @keyword.control)
(return_statement "%return" @keyword.control)
(debug_statement "%debug" @keyword.control)
(ignore_error_statement "%ignore_error" @keyword.control)
(swap_statement "%swap" @keyword.control)

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

(data_field
  key: (identifier) @variable.other.member)

(object_pair
  key: (identifier) @variable.other.member)

; ─── Punctuation ─────────────────────────────────────────
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ";" "=>"] @punctuation.delimiter
["*" "~" "?" "::" "@"] @punctuation.special

; ─── Identifiers (fallback — must be last) ───────────────
(identifier) @variable
