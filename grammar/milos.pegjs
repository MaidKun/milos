{
  const Parameter = require("./Parameter").Parameter;
  const ParameterList = require("./ParameterList").default;
  const Identifier = require("./Identifier").default;
  const CallExpression = require("./Expression").CallExpression;
  const CalculateExpression = require("./Expression").CalculateExpression;
  const IdentifierExpression = require("./Expression").IdentifierExpression;
  const TypeHintExpression = require('./Expression').TypeHintExpression;
  const NumberLiteral = require("./Expression").NumberLiteral;
  const Range = require("./Expression").Range;
  const StringLiteralText = require("./Expression").StringLiteralText;
  const StringLiteralExpression = require("./Expression").StringLiteralExpression;
  const StringLiteral = require("./Expression").StringLiteral;
  const ArrayLiteral = require("./Expression").ArrayLiteral;
  const StatementList = require("./StatementList").default;
  const CallStatement = require("./Statement").CallStatement;
  const LabelStatement = require("./Statement").LabelStatement;

  function c(node) {
    const l = location();
    node.setLocation({line: l.start.line, column: l.start.column});
    return node;
  }
}

Root
  = stmts:StatementList Terms* { return stmts; }

StatementList
  = Terms* stmt:Statement Terms+ next:StatementList { next.prepend(stmt); return next; }
  / Terms* stmt:Statement { return c(new StatementList([stmt])); }

Statement
  = IdentifierStatement

IdentifierStatement
  = identifier:ScopedIdentifier _ "=" _ expr:Expression { return c(new CallStatement(
      c(new IdentifierExpression(identifier.appendString('='))),
      c(new ParameterList([c(new Parameter(expr))]))
    )); }
  / identifier:ScopedIdentifier _ op:CalculatedAssignOperator _ expr:Expression { return c(new CallStatement(
      c(new IdentifierExpression(identifier.appendString('='))),
      c(new ParameterList([c(new Parameter(
        c(new CalculateExpression(c(new IdentifierExpression(identifier)), op, expr))
      ))]))
    )); }
  / identifier:ScopedIdentifier __ params:ParameterList { return c(new CallStatement(c(new IdentifierExpression(identifier)), params)); }
  / identifier:ScopedIdentifier _ "(" params:ParameterList ")" { return c(new CallStatement(c(new IdentifierExpression(identifier)), params)); }
  / identifier:Identifier ":" { return c(new LabelStatement(identifier)); }
  / identifier:ScopedIdentifier { return c(new CallStatement(c(new IdentifierExpression(identifier)))); }

ParameterList
  = par:Parameter _ "," _ list:ParameterList { list.prepend(par); return list; }
  / par:Parameter { return c(new ParameterList([par])); }

Parameter
  = name:Identifier ":" _ expr:Expression { return c(new Parameter(expr, name)); }
  / expr:Expression { return c(new Parameter(expr)); }

ExpressionList
  = expr:Expression _ "," _ list:ExpressionList { return [expr].concat(list); }
  / expr:Expression { return [expr]; }

Expression
  = left:CalcExpression ".." right:CalcExpression { return c(new Range(left, right)) }
  / CalcExpression

CalcExpression
  = left:MemberExpression list:CalcExpressionList* { return CalculateExpression.build(left, list); }

CalcExpressionList
  = _ op:"+" _ item:MemberExpression { return [op, item]; }
  / _ op:"-" _ item:MemberExpression { return [op, item]; }
  / _ op:"*" _ item:MemberExpression { return [op, item]; }
  / _ op:"/" _ item:MemberExpression { return [op, item]; }
  / _ op:"<" _ item:MemberExpression { return [op, item]; }
  / _ op:"<=" _ item:MemberExpression { return [op, item]; }
  / _ op:">" _ item:MemberExpression { return [op, item]; }
  / _ op:">=" _ item:MemberExpression { return [op, item]; }
  / _ op:"==" _ item:MemberExpression { return [op, item]; }
  / _ op:"!=" _ item:MemberExpression { return [op, item]; }
  / _ op:"&&" _ item:MemberExpression { return [op, item]; }
  / _ op:"||" _ item:MemberExpression { return [op, item]; }

MemberExpression
  = left:PrimaryValue "." right:MemberExpression { return left; }
  / PrimaryValue

PrimaryValue
  = ident:ScopedIdentifier _ "(" params:ParameterList? ")" { return c(new CallExpression(ident, params)); }
  / ident:ScopedIdentifier { return c(new IdentifierExpression(ident)); }
  / "[" _ items:ExpressionList _ "]" { return c(new ArrayLiteral(items)); }
  / "(" calc:CalcExpression ")" { return calc; }
  / StringLiteral
  / SymbolLiteral
  / TypedNumberLiteral

Identifier "identifier"
  = head:[_a-zA-Z] tail:[_a-zA-Z0-9]* { return c(new Identifier(head + tail.join(''))); }

SymbolLiteral
  = ":" head:[_a-zA-Z] tail:[_a-zA-Z0-9]* { return c(new StringLiteral([c(new StringLiteralText(head + tail.join('')))])); }

ScopedIdentifier
  = left:Identifier _ "." _ right:ScopedIdentifier { left.setChild(right); return left; }
  / Identifier

TypedNumberLiteral
  = num:NumberLiteral type:NumberType? { return c(new NumberLiteral(num.value, type)); }

NumberType
  = "s" { return "second"; }
  / "sec" { return "second"; }
  / "second" { return "second"; }
  / "seconds" { return "second"; }
  / "m" { return "minute"; }
  / "min" { return "minute"; }
  / "minute" { return "minute"; }
  / "minutes" { return "minute"; }
  / "h" { return "hour"; }
  / "hour" { return "hour"; }
  / "hours" { return "hour"; }

NumberLiteral
  = l:"-" m:[0-9]+ r:("." [0-9]+)? { return c(new NumberLiteral(parseFloat(l.join('')+m+(r?r:"")))); }
  / l:[0-9]+ r:("." [0-9]+)? { return c(new NumberLiteral(parseFloat(l.join('')+(r?`.${r[1].join('')}`:"")))); }

StringLiteral
  = "\"" parts:StringLiteralPart* "\"" { return c(new StringLiteral(parts)); }

StringLiteralExpression
  = ident:Identifier ":" _ expr:Expression { return c(new TypeHintExpression(expr, ident)); }
  / Expression

StringLiteralPart
  = "\\\"" { return c(new StringLiteralText("\"")); }
  / "#{" expr:StringLiteralExpression "}" { return c(new StringLiteralExpression(expr)); }
  / "#" back:[^{] { return c(new StringLiteralText('#' + back)); }
  / text:[^\"#]+ { return c(new StringLiteralText(text.join(''))); }

Comment
  = "#" [^\n]*

CalculatedAssignOperator
  = "+=" { return '+'; }
  / "-=" { return '-'; }
  / "*=" { return '*'; }
  / "/=" { return '/'; }

Terms
  = EOL

EOL
  = _ Comment? [\n]+ _

__ "force_whitespace"
  = [ \t\r]+

_ "whitespace"
  = [ \t\r]*