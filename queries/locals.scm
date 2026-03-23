; CozoScript scope queries

; Each rule introduces a local scope for its variables
(inline_rule) @local.scope
(constant_rule) @local.scope
(fixed_rule) @local.scope

; Variables in rule heads are local definitions
(rule_head
  (identifier) @local.definition)

; Named bindings define variables within the scope
(named_binding
  key: (identifier) @local.definition)

; Unification binds the left-hand variable
(unification
  left: (identifier) @local.definition)
