// tree-sitter-cozo — CozoScript grammar
//
// CozoScript is the query language for CozoDB, a Datalog-based database.
// Authoritative syntax: cozo-core/src/cozoscript.pest
//
// Six sigil prefixes distinguish syntactic categories:
//   ?  entry/output rule        *  stored relation access
//   ~  search index access      $  parameter binding
//   :  mutation/option command   :: system command
//   %  imperative control flow   #  line comment

// Precedence follows the Pratt parser in cozo-core/src/parse/expr.rs
const PREC = {
  or: 1,
  and: 2,
  compare: 3,
  eq: 4,
  mod: 5,
  add: 6,
  multiply: 7,
  pow: 8,
  coalesce: 9,
  unary: 10,
  field_access: 11,
  call: 12,
};

const comma_sep = (rule) => seq(rule, repeat(seq(',', rule)));
const comma_sep_trailing = (rule) => seq(rule, repeat(seq(',', rule)), optional(','));

module.exports = grammar({
  name: 'cozo',

  extras: $ => [/\s/, $.comment],

  conflicts: $ => [
    // (expr) could be a grouped rule body or a parenthesized expression
    [$._atom, $.parenthesized_expression],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => seq(
      choice(
        $.rule_definition,
        $.mutation_command,
        $.system_command,
        $.imperative_block,
        $.query_option,
      ),
      optional(';'),
    ),

    // ─── Datalog core ───────────────────────────────────────

    // Query is just an inline rule whose head starts with ?
    // The PEG grammar treats ? as a valid rule head name

    rule_definition: $ => choice(
      $.inline_rule,
      $.constant_rule,
      $.fixed_rule,
    ),

    inline_rule: $ => seq(
      field('head', $.rule_head),
      ':=',
      field('body', $.rule_body),
    ),

    constant_rule: $ => seq(
      field('head', $.rule_head),
      '<-',
      field('body', $._expression),
    ),

    fixed_rule: $ => seq(
      field('head', $.rule_head),
      '<~',
      field('algorithm', $._name),
      '(',
      optional(comma_sep_trailing($.fixed_arg)),
      ')',
    ),

    fixed_arg: $ => choice(
      $.fixed_option,
      $.fixed_relation,
    ),

    fixed_option: $ => seq(
      field('key', $.identifier),
      ':',
      field('value', $._expression),
    ),

    fixed_relation: $ => choice(
      // rule reference: name[vars]
      seq($.identifier, '[', optional(comma_sep($.identifier)), ']'),
      // stored relation: *name[vars] or *name{bindings}
      $.stored_relation,
    ),

    rule_head: $ => seq(
      field('name', choice('?', $.identifier)),
      '[',
      optional(comma_sep(choice($.aggregation, $._expression))),
      ']',
    ),

    aggregation: $ => prec(PREC.call + 1, seq(
      field('function', $.identifier),
      '(',
      field('var', $.identifier),
      repeat(seq(',', $._expression)),
      ')',
    )),

    rule_body: $ => seq(
      $.disjunction,
      repeat(seq(',', $.disjunction)),
    ),

    disjunction: $ => seq(
      $._atom,
      repeat(seq('or', $._atom)),
    ),

    _atom: $ => choice(
      $.stored_relation,
      $.search_apply,
      $.negation,
      $.unification,
      $.multi_unification,
      $._expression,
      $.grouped_body,
    ),

    grouped_body: $ => prec(-1, seq('(', $.rule_body, ')')),

    stored_relation: $ => seq(
      '*',
      field('name', $._name),
      choice(
        seq('{', optional(comma_sep_trailing($.named_binding)), optional($.validity_clause), '}'),
        seq('[', optional(comma_sep($._expression)), optional($.validity_clause), ']'),
      ),
    ),

    search_apply: $ => seq(
      '~',
      field('name', $._name),
      '{',
      optional(comma_sep_trailing($.named_binding)),
      '|',
      optional(comma_sep_trailing($.index_option)),
      '}',
    ),

    index_option: $ => seq(
      field('key', $.identifier),
      ':',
      field('value', $._expression),
    ),

    validity_clause: $ => seq('@', $._expression),

    named_binding: $ => seq(
      field('key', $.identifier),
      optional(seq(':', field('value', $._expression))),
    ),

    negation: $ => seq('not', $._atom),

    unification: $ => seq(
      field('left', $.identifier),
      '=',
      field('right', $._expression),
    ),

    multi_unification: $ => seq(
      field('left', $.identifier),
      'in',
      field('right', $._expression),
    ),

    // ─── Mutation commands (:sigil) ─────────────────────────

    mutation_command: $ => seq(
      field('command', alias(
        choice(
          ':create', ':replace', ':put', ':rm',
          ':insert', ':update', ':delete',
          ':ensure', ':ensure_not',
        ),
        $.command_name,
      )),
      field('target', $._name),
      optional($.schema_body),
    ),

    schema_body: $ => seq(
      '{',
      comma_sep_trailing($.column_definition),
      optional(seq('=>', comma_sep_trailing($.column_definition))),
      '}',
    ),

    column_definition: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $.col_type))),
      optional(choice(
        seq('default', $._expression),
        seq('=', $.identifier),
      )),
    ),

    col_type: $ => seq(
      choice(
        $.simple_type,
        $.list_type,
        $.tuple_type,
        $.vec_type,
      ),
      optional('?'),
    ),

    simple_type: $ => choice(
      'Any', 'Int', 'Float', 'String', 'Bytes',
      'Uuid', 'Bool', 'Json', 'Validity',
    ),

    list_type: $ => seq('[', $.col_type, optional(seq(';', $._expression)), ']'),
    tuple_type: $ => seq('(', comma_sep_trailing($.col_type), ')'),
    vec_type: $ => seq('<', choice('F32', 'F64', 'Float', 'Double'), ';', $.number, '>'),

    // ─── System commands (::sigil) ──────────────────────────

    system_command: $ => seq('::', choice(
      // No-argument commands
      alias(choice('relations', 'running', 'compact', 'fixed_rules'), $.command_name),
      // Commands that take a relation name
      seq(alias(choice('columns', 'indices', 'describe'), $.command_name),
        field('target', $._name)),
      // remove takes comma-separated names
      seq(alias('remove', $.command_name), comma_sep($._name)),
      // rename takes pairs
      seq(alias('rename', $.command_name),
        comma_sep(seq($._name, '->', $._name))),
      // explain takes a query block
      seq(alias('explain', $.command_name),
        '{', repeat($._statement), '}'),
      // access_level
      seq(alias('access_level', $.command_name),
        choice('normal', 'protected', 'read_only', 'hidden'),
        comma_sep($._name)),
      // set_triggers
      seq(alias(choice('set_triggers', 'show_triggers'), $.command_name),
        $._name,
        repeat($.trigger_clause)),
      // kill takes an expression
      seq(alias('kill', $.command_name), $._expression),
      // Index operations
      seq(alias(choice('index', 'hnsw', 'fts', 'lsh'), $.command_name),
        choice(
          seq('create', $._name, ':', $.identifier,
            '{', optional(comma_sep_trailing($.index_option)), '}'),
          seq('drop', $._name, ':', $.identifier),
        )),
    )),

    trigger_clause: $ => seq(
      'on', choice('put', 'rm', 'replace'),
      '{', repeat($._statement), '}',
    ),

    // ─── Query options (:option) ────────────────────────────

    query_option: $ => choice(
      seq(field('option', alias(
        choice(':limit', ':offset', ':timeout', ':sleep'),
        $.option_name,
      )), field('value', $._expression)),
      seq(field('option', alias(
        choice(':sort', ':order'),
        $.option_name,
      )), comma_sep($.sort_arg)),
      seq(field('option', alias(':assert', $.option_name)),
        choice('none', 'some')),
      field('option', alias(
        choice(':returning', ':disable_magic_rewrite'),
        $.option_name,
      )),
    ),

    sort_arg: $ => seq(optional(choice('+', '-')), $.identifier),

    // ─── Imperative control flow (%sigil) ───────────────────

    imperative_block: $ => choice(
      $.if_block,
      $.if_not_block,
      $.loop_block,
      $.debug_statement,
      $.ignore_error_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.swap_statement,
    ),

    if_block: $ => seq(
      '%if', $._imperative_condition,
      optional('%then'), repeat1($._statement),
      optional(seq('%else', repeat1($._statement))),
      '%end',
    ),

    if_not_block: $ => seq(
      '%if_not', $._imperative_condition,
      optional('%then'), repeat1($._statement),
      optional(seq('%else', repeat1($._statement))),
      '%end',
    ),

    _imperative_condition: $ => choice(
      $.identifier,
      seq('{', repeat($._statement), '}'),
    ),

    loop_block: $ => seq(
      optional(seq('%mark', $.identifier)),
      '%loop', repeat1($._statement),
      '%end',
    ),

    debug_statement: $ => seq('%debug', $.identifier),
    ignore_error_statement: $ => seq('%ignore_error', seq('{', repeat($._statement), '}')),
    return_statement: $ => prec.left(seq('%return', optional(comma_sep($.identifier)))),
    break_statement: $ => prec.left(seq('%break', optional($.identifier))),
    continue_statement: $ => prec.left(seq('%continue', optional($.identifier))),
    swap_statement: $ => seq('%swap', $.identifier, $.identifier),

    // ─── Expressions ────────────────────────────────────────

    _expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.function_call,
      $.conditional_expression,
      $.identifier,
      $.compound_identifier,
      $.parameter,
      $._literal,
      $.parenthesized_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    binary_expression: $ => choice(
      prec.left(PREC.or, seq(
        field('left', $._expression),
        field('operator', alias('||', $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.and, seq(
        field('left', $._expression),
        field('operator', alias('&&', $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.compare, seq(
        field('left', $._expression),
        field('operator', alias(choice('>=', '<=', '>', '<'), $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.eq, seq(
        field('left', $._expression),
        field('operator', alias(choice('==', '!='), $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.mod, seq(
        field('left', $._expression),
        field('operator', alias('%', $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.add, seq(
        field('left', $._expression),
        field('operator', alias(choice('+', '-', '++'), $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.multiply, seq(
        field('left', $._expression),
        field('operator', alias(choice('*', '/'), $.operator)),
        field('right', $._expression),
      )),
      prec.right(PREC.pow, seq(
        field('left', $._expression),
        field('operator', alias('^', $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.coalesce, seq(
        field('left', $._expression),
        field('operator', alias('~', $.operator)),
        field('right', $._expression),
      )),
      prec.left(PREC.field_access, seq(
        field('left', $._expression),
        field('operator', alias('->', $.operator)),
        field('right', $._expression),
      )),
    ),

    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', alias(choice('-', '!'), $.operator)),
      field('operand', $._expression),
    )),

    function_call: $ => prec(PREC.call, seq(
      field('name', $.identifier),
      '(',
      optional(comma_sep($._expression)),
      ')',
    )),

    conditional_expression: $ => prec(PREC.call, seq(
      'if',
      '(',
      field('condition', $._expression),
      ',',
      field('consequence', $._expression),
      ',',
      field('alternative', $._expression),
      ')',
    )),

    // ─── Literals ───────────────────────────────────────────

    _literal: $ => choice(
      $.number,
      $.string,
      $.boolean,
      $.null,
      $.list,
      $.object,
    ),

    number: $ => token(choice(
      // sci float (must precede dot_float)
      seq(/\d[\d_]*/, optional(seq('.', /[\d_]*/)), /[eE]/, optional(/[+-]/), /[\d_]+/),
      // dot float
      seq(/\d[\d_]*/, '.', /[\d_]*/),
      // hex
      seq('0x', /[0-9a-fA-F][\d_a-fA-F]*/),
      // octal
      seq('0o', /[0-7][0-7_]*/),
      // binary
      seq('0b', /[01][01_]*/),
      // integer
      /\d[\d_]*/,
    )),

    string: $ => choice(
      $._double_quoted_string,
      $._single_quoted_string,
      $._raw_string,
    ),

    _double_quoted_string: $ => seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        $.escape_sequence,
      )),
      '"',
    ),

    _single_quoted_string: $ => seq(
      "'",
      repeat(choice(
        /[^'\\]/,
        $.escape_sequence,
      )),
      "'",
    ),

    // Raw strings use _*"..."_* delimiters (not r"...")
    _raw_string: $ => token(choice(
      seq('_"', /[^"]*/, '"_'),
      seq('__"', /[^"]*/, '"__'),
      seq('"', /[^"\\]*/, '"'),
    )),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[\\'"nrtbf\/]/,
        seq('u', /[0-9a-fA-F]{4}/),
      ),
    )),

    boolean: $ => choice('true', 'false'),
    null: $ => 'null',

    list: $ => seq('[', optional(comma_sep_trailing($._expression)), ']'),

    object: $ => seq(
      '{',
      optional(comma_sep_trailing($.object_pair)),
      '}',
    ),

    object_pair: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._expression),
    ),

    // ─── Terminals ──────────────────────────────────────────

    _name: $ => choice($.compound_identifier, $.identifier),

    identifier: $ => /[a-zA-Z_]\w*/,

    compound_identifier: $ => seq(
      $.identifier,
      repeat1(seq('.', $.identifier)),
    ),

    parameter: $ => /\$[\w.]+/,

    comment: $ => choice(
      token(seq('#', /.*/)),
      token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),
    ),
  },
});
