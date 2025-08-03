/**
 * @file System RDL 2.0 Grammar for tree-sitter
 * @author Aliaksei Chapyzhenka
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'systemrdl',

  // Whitespace and comments are considered extras.  They may appear
  // between any two tokens without changing the structure of the syntax
  // tree.  See the definitions of $.comment below for comment syntax.
  // Extras include whitespace (spaces, tabs, newlines) and comments.
  // Use a single regular expression for whitespace so it is parsed
  // correctly by JavaScript.  The `/\s+/` pattern matches one or more
  // whitespace characters (space, tab, carriage return or newline).
  extras: $ => [
    /\s+/,
    $.comment
  ],

  // The 'conflicts' property identifies pairs of rules that may
  // conflict with each other.  Tree-sitter will not be able to parse
  // these rules correctly if they are used in the same context.  The
  // conflicts are defined as an array of arrays, where each inner
  // array contains two rules that may conflict.  The rules in each
  // inner array are compared against each other to determine if they
  // conflict.  If they do, Tree-sitter will not be able to parse them
  // correctly if they are used in the same context.
  conflicts: $ => [
    // struct literal vs. instance reference element in constraint bodies
    [$.struct_literal, $.instance_ref_element],
    [$.constant_concatenation, $.array_literal_body]
  ],

  // The ‘word’ property identifies the token that represents a word
  // identifier.  Tree‑sitter uses this for syntax highlighting and
  // incremental parsing.  Identifiers are defined below.
  word: $ => $.identifier,

  rules: {
    // A SystemRDL source file consists of zero or more descriptions.  This
    // corresponds to the `root` nonterminal in the specification.
    source_file: $ => repeat($._description),

    // A description is any of the top level constructs allowed in SystemRDL:
    // component definitions, enumerations, property definitions, struct
    // definitions, constraints, explicit component instantiations and
    // property assignments.
    _description: $ => choice(
      $.component_def,
      $.enum_def,
      $.property_definition,
      $.struct_def,
      $.constraint_def,
      $.explicit_component_inst,
      $.property_assignment
    ),

    // ------------------------------------------------------------------
    // User defined property declarations (Annex B.2)
    // ------------------------------------------------------------------

    property_definition: $ => seq(
      'property',
      field('name', $.identifier),
      '{',
      repeat($.property_attribute),
      '}',
      ';'
    ),
    property_attribute: $ => choice(
      $.property_type,
      $.property_usage,
      $.property_default,
      $.property_constraint
    ),
    property_type: $ => seq(
      'type', '=', $.property_data_type, optional($.array_type), ';'
    ),
    property_data_type: $ => choice(
      $.component_primary_type,
      'ref',
      $.number,
      $.basic_data_type
    ),
    property_usage: $ => seq(
      'component', '=', $.property_comp_types, ';'
    ),
    property_comp_types: $ => seq(
      $.property_comp_type,
      repeat(seq('|', $.property_comp_type))
    ),
    property_comp_type: $ => choice(
      $.component_type,
      'constraint',
      'all'
    ),
    property_default: $ => seq(
      'default', '=', $.constant_expression, ';'
    ),
    property_constraint: $ => seq(
      'constraint', '=', $.property_constraint_type, ';'
    ),
    property_constraint_type: $ => 'componentwidth',

    // ------------------------------------------------------------------
    // Component definition (Annex B.3)
    // ------------------------------------------------------------------

    // A component definition covers both named and anonymous components.
    // The specification lists several possible orderings of the element
    // parts; here a single rule allows an optional instance type before
    // the component definition, and optional instance information after it.
    component_def: $ => seq(
      // Optional instance type may appear at the start of the definition.
      optional($.component_inst_type),
      choice($.component_named_def, $.component_anon_def),
      // Instance type may also appear here (to match the alternate orders).
      optional($.component_inst_type),
      optional($.component_insts),
      ';'
    ),
    component_named_def: $ => seq(
      $.component_type,
      field('name', $.identifier),
      optional($.param_def),
      $.component_body
    ),
    component_anon_def: $ => seq(
      $.component_type,
      $.component_body
    ),
    component_body: $ => seq(
      '{',
      repeat($.component_body_elem),
      '}'
    ),
    component_body_elem: $ => choice(
      $.component_def,
      $.enum_def,
      $.struct_def,
      $.constraint_def,
      $.explicit_component_inst,
      $.property_assignment
    ),
    component_type: $ => choice(
      $.component_primary_type,
      'signal'
    ),
    component_primary_type: $ => choice('addrmap', 'regfile', 'reg', 'field', 'mem'),
    explicit_component_inst: $ => seq(
      // Optional instance type comes first
      optional($.component_inst_type),
      // Optional alias on the instance
      optional($.component_inst_alias),
      field('name', $.identifier),
      $.component_insts,
      ';'
    ),
    component_insts: $ => seq(
      optional($.param_inst),
      $.component_inst,
      repeat(seq(',', $.component_inst))
    ),
    component_inst: $ => seq(
      field('instance', $.identifier),
      optional($.component_inst_array_or_range),
      optional(seq('=', $.constant_expression)),
      optional(seq('@', $.constant_expression)),
      optional(seq('+=', $.constant_expression)),
      optional(seq('%=', $.constant_expression))
    ),
    component_inst_alias: $ => seq('alias', $.identifier),
    component_inst_type: $ => choice('external', 'internal'),
    component_inst_array_or_range: $ => choice(
      seq($.array, repeat($.array)),
      $.range
    ),

    // ------------------------------------------------------------------
    // Struct definition (Annex B.4)
    // ------------------------------------------------------------------

    struct_def: $ => seq(
      optional('abstract'),
      'struct',
      field('name', $.identifier),
      optional(seq(':', $.identifier)),
      $.struct_body,
      ';'
    ),
    struct_body: $ => seq(
      '{',
      repeat($.struct_elem),
      '}'
    ),
    struct_elem: $ => seq(
      $.struct_type,
      field('name', $.identifier),
      optional($.array_type),
      ';'
    ),
    struct_type: $ => choice(
      $.data_type,
      $.component_type
    ),

    // ------------------------------------------------------------------
    // Constraint definition (Annex B.5)
    // ------------------------------------------------------------------

    constraint_def: $ => seq(
      'constraint',
      choice($.constraint_def_exp, $.constraint_def_anon),
      ';'
    ),
    constraint_def_exp: $ => seq(
      field('name', $.identifier),
      $.constraint_body,
      optional($.constraint_insts)
    ),
    constraint_def_anon: $ => seq(
      $.constraint_body,
      $.constraint_insts
    ),
    constraint_insts: $ => seq(
      $.identifier,
      repeat(seq(',', $.identifier))
    ),
    constraint_body: $ => seq(
      '{',
      repeat(seq($.constraint_elem, ';')),
      '}'
    ),
    constraint_prop_assignment: $ => seq(
      $.identifier, '=', $.constant_expression
    ),
    constraint_elem: $ => choice(
      $.constant_expression,
      $.constraint_prop_assignment,
      seq($.constraint_lhs, 'inside', '{', $.constraint_values, '}'),
      seq($.constraint_lhs, 'inside', $.identifier)
    ),
    constraint_values: $ => seq(
      $.constraint_value,
      repeat(seq(',', $.constraint_value))
    ),
    constraint_value: $ => choice(
      $.constant_expression,
      seq('[', $.constant_expression, ':', $.constant_expression, ']')
    ),
    constraint_lhs: $ => choice(
      'this',
      $.instance_ref
    ),

    // ------------------------------------------------------------------
    // Parameters (Annex B.6)
    // ------------------------------------------------------------------

    param_def: $ => seq(
      '#', '(', $.param_def_elem, repeat(seq(',', $.param_def_elem)), ')'
    ),
    param_def_elem: $ => seq(
      $.data_type,
      field('name', $.identifier),
      optional($.array_type),
      optional(seq('=', $.constant_expression))
    ),
    param_inst: $ => seq(
      '#', '(', $.param_elem, repeat(seq(',', $.param_elem)), ')'
    ),
    param_elem: $ => seq(
      '.', $.identifier, '(', $.param_value, ')'
    ),
    param_value: $ => $.constant_expression,

    // ------------------------------------------------------------------
    // Enums (Annex B.7)
    // ------------------------------------------------------------------

    enum_def: $ => seq(
      'enum',
      field('name', $.identifier),
      $.enum_body,
      ';'
    ),
    enum_body: $ => seq('{', repeat1($.enum_entry), '}'),
    enum_entry: $ => seq(
      field('name', $.identifier),
      optional(seq('=', $.constant_expression)),
      optional($.enum_property_assignment),
      ';'
    ),
    enum_property_assignment: $ => seq('{', repeat(seq($.explicit_prop_assignment, ';')), '}'),

    // ------------------------------------------------------------------
    // Property assignment (Annex B.8)
    // ------------------------------------------------------------------

    property_assignment: $ => choice(
      $.explicit_or_default_prop_assignment,
      $.post_prop_assignment
    ),
    explicit_or_default_prop_assignment: $ => seq(
      optional('default'),
      choice($.explicit_prop_modifier, $.explicit_prop_assignment),
      ';'
    ),
    explicit_prop_modifier: $ => seq(
      $.prop_mod,
      $.identifier
    ),
    explicit_encode_assignment: $ => seq('encode', '=', $.identifier),
    explicit_prop_assignment: $ => choice(
      seq($.prop_assignment_lhs, optional(seq('=', $.prop_assignment_rhs))),
      $.explicit_encode_assignment
    ),
    post_encode_assignment: $ => seq(
      $.instance_ref, '->', 'encode', '=', $.identifier
    ),
    post_prop_assignment: $ => seq(
      choice(
        seq($.prop_ref, optional(seq('=', $.prop_assignment_rhs))),
        $.post_encode_assignment
      ),
      ';'
    ),
    prop_mod: $ => choice('posedge', 'negedge', 'bothedge', 'level', 'nonsticky'),
    prop_assignment_lhs: $ => choice($.prop_keyword, $.identifier),
    prop_keyword: $ => choice('sw', 'hw', 'rclr', 'rset', 'woclr', 'woset'),
    prop_assignment_rhs: $ => choice($.constant_expression, $.precedencetype_literal),

    // ------------------------------------------------------------------
    // Struct literal (Annex B.9) and array literal (Annex B.10)
    // ------------------------------------------------------------------
    struct_literal: $ => seq(
      $.identifier,
      '{',
      optional(seq($.struct_literal_elem, repeat(seq(',', $.struct_literal_elem)))),
      '}'
    ),
    struct_literal_elem: $ => seq(
      $.identifier, ':', $.constant_expression
    ),
    array_literal: $ => seq(
      '{',
      $.array_literal_body,
      '}'
    ),
    array_literal_body: $ => seq(
      $.constant_expression,
      repeat(seq(',', $.constant_expression))
    ),

    // ------------------------------------------------------------------
    // References (Annex B.11), arrays and ranges (Annex B.12)
    // ------------------------------------------------------------------
    instance_ref: $ => seq(
      $.instance_ref_element,
      repeat(seq('.', $.instance_ref_element))
    ),
    prop_ref: $ => seq(
      $.instance_ref,
      '->',
      choice($.prop_keyword, $.identifier)
    ),
    instance_or_prop_ref: $ => choice(
      seq($.instance_ref, '->', $.prop_keyword),
      seq($.instance_ref, '->', $.identifier),
      $.instance_ref
    ),
    instance_ref_element: $ => seq(
      $.identifier,
      repeat($.array)
    ),
    range: $ => seq('[', $.constant_expression, ':', $.constant_expression, ']'),
    array: $ => seq('[', $.constant_expression, ']'),
    array_type: $ => seq('[', ']'),

    // ------------------------------------------------------------------
    // Concatenation (Annex B.13)
    // ------------------------------------------------------------------
    constant_concatenation: $ => seq(
      '{',
      $.constant_expression,
      repeat(seq(',', $.constant_expression)),
      '}'
    ),
    constant_multiple_concatenation: $ => seq(
      '{',
      $.constant_expression,
      $.constant_concatenation,
      '}'
    ),

    // ------------------------------------------------------------------
    // Data types (Annex B.14)
    // ------------------------------------------------------------------
    integer_type: $ => choice($.integer_vector_type, $.integer_atom_type),
    integer_atom_type: $ => 'longint',
    integer_vector_type: $ => 'bit',
    simple_type: $ => $.integer_type,
    signing: $ => 'unsigned',
    basic_data_type: $ => choice(
      seq($.simple_type, optional($.signing)),
      'string',
      'boolean',
      $.identifier
    ),
    data_type: $ => choice(
      $.basic_data_type,
      $.accesstype,
      $.addressingtype,
      $.onreadtype,
      $.onwritetype
    ),

    // ------------------------------------------------------------------
    // Literals (Annex B.15)
    // ------------------------------------------------------------------
    boolean_literal: $ => choice('true', 'false'),
    // Numeric literals support hexadecimal, binary, octal and decimal
    // formats with optional underscores separating digits.  The pattern
    // uses a single regular expression because JavaScript does not
    // allow multi‑line regex literals.
    number: $ => token(/0[xX][0-9a-fA-F](_?[0-9a-fA-F])*|0[bB][01](_?[01])*|0[oO][0-7](_?[0-7])*|[0-9](_?[0-9])*/),
    string_literal: $ => token(seq(
      '"',
      repeat(choice(
        /[^"\\\n]/,
        seq('\\', /./)
      )),
      '"'
    )),
    enumerator_literal: $ => seq($.identifier, '::', $.identifier),
    accesstype_literal: $ => choice('na', 'rw', 'wr', 'r', 'w', 'rw1', 'w1'),
    onreadtype_literal: $ => choice('rclr', 'rset', 'ruser'),
    onwritetype_literal: $ => choice('woset', 'woclr', 'wot', 'wzs', 'wzc', 'wzt', 'wclr', 'wset', 'wuser'),
    addressingtype_literal: $ => choice('compact', 'regalign', 'fullalign'),
    precedencetype_literal: $ => choice('hw', 'sw'),

    // Conversions of literal keywords to types
    accesstype: $ => $.accesstype_literal,
    addressingtype: $ => $.addressingtype_literal,
    onreadtype: $ => $.onreadtype_literal,
    onwritetype: $ => $.onwritetype_literal,

    // ------------------------------------------------------------------
    // Expressions (Annex B.16)
    // ------------------------------------------------------------------
    constant_expression: $ => prec.left(seq(
      $.constant_primary,
      repeat(seq($.binary_operator, $.constant_primary)),
      optional(seq('?', $.constant_expression, ':', $.constant_expression))
    )),
    constant_primary: $ => seq(
      optional($.unary_operator),
      choice(
        $.primary_literal,
        $.constant_concatenation,
        $.constant_multiple_concatenation,
        seq('(', $.constant_expression, ')'),
        $.constant_cast,
        $.instance_or_prop_ref,
        $.struct_literal,
        $.array_literal
      )
    ),
    primary_literal: $ => choice(
      $.number,
      $.string_literal,
      $.boolean_literal,
      $.accesstype_literal,
      $.onreadtype_literal,
      $.onwritetype_literal,
      $.addressingtype_literal,
      $.enumerator_literal,
      'this'
    ),
    // Operators are treated as simple literal strings.  They are not
    // wrapped in `token()` because Tree‑sitter will treat single and
    // multi‑character literals as individual tokens automatically.
    binary_operator: $ => choice(
      '&&', '||', '<=', '>=', '==', '!=', '>>', '<<', '<', '>', '&', '|', '^', '~^', '^~', '*', '/', '%', '+', '-', '**'
    ),
    unary_operator: $ => choice('!', '+', '-', '~', '&', '~&', '|', '~|', '^', '~^', '^~'),
    constant_cast: $ => seq(
      $.casting_type,
      '\'',
      '(', $.constant_expression, ')'
    ),
    casting_type: $ => choice(
      $.simple_type,
      $.boolean_literal,
      $.identifier
    ),

    // ------------------------------------------------------------------
    // Identifiers (Annex B.17)
    // ------------------------------------------------------------------
    identifier: $ => token(prec(2, /[A-Za-z_][A-Za-z0-9_]*/)),

    // ------------------------------------------------------------------
    // Comments
    // ------------------------------------------------------------------
    comment: $ => token(choice(
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+(?:[^/*][^*]*\*+)*/, '/')
    )),
  }
});
