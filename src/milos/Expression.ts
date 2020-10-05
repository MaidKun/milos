import Identifier from "./Identifier";
import Interpreter from "./Interpreter";
import { Context } from "./Context";
import { Value, ArrayValue, StringValue, NumberValue, FunctionValue, UndefinedValue, DurationValue, RangeValue, CalculateValue } from "./Value";
import ParameterList from "./ParameterList";
import {Node} from "./Milos";

export abstract class Expression extends Node {
  abstract asJsString(interpreter: Interpreter, context: Context): string;
  asHtmlString(interpreter: Interpreter, context: Context): string {
    return `<eval>${this.asJsString(interpreter, context)}</eval>`;
  }

  isStringLiteral(): boolean { return false; }

  abstract variableContextId(context: Context): string | null;

  abstract calculate(interpreter: Interpreter, context: Context): Value;

  abstract dumpToString(): string;
}

export class UndefinedExpression extends Expression {
  asJsString(interpreter: Interpreter, context: Context): string {
    throw new Error('Undefined value can not be converted to JS');
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return new UndefinedValue();
  }

  variableContextId(context: Context): string | null {
    return null;
  }

  dumpToString(): string {
    return 'undefined'
  }
}

export class ArrayLiteral extends Expression {
  public readonly items: Expression[];

  constructor(items: Expression[]) {
    super();
    this.items = items;
  }
  
  asJsString(interpreter: Interpreter, context: Context): string {
    return `[${this.items.map(i => i.asJsString(interpreter, context))}]`;
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return new ArrayValue(this.items.map(item => item.calculate(interpreter, context)));
  }

  variableContextId(context: Context): string | null {
    const item = this.items.find(i => !!i.variableContextId(context));
    if (item) {
      return item.variableContextId(context);
    }
    return null;
  }

  dumpToString(): string {
    return `[${this.items.map(i => i.dumpToString()).join(', ')}]`
  }
}

export type CalculateOperator = "+" | "-" | "*" | "/" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "&&" | "||";

const CalculateOperatorOrder = {
  '&&': 0,
  '||': 0,
  '!=': 10,
  '==': 10,
  '<=': 10,
  '>=': 10,
  '<': 10,
  '>': 10,
  '-': 20,
  '+': 20,
  '/': 30,
  '*': 30,
}

export class CalculateExpression extends Expression {
  protected left: Expression;
  protected operator: CalculateOperator;
  protected right: Expression;

  constructor(left: Expression, operator: CalculateOperator, right: Expression) {
    super();

    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  asJsString(interpreter: Interpreter, context: Context): string { 
    return '(' + this.left.asJsString(interpreter, context) + this.operator + this.right.asJsString(interpreter, context) + ')';
  }
  
  calculate(interpreter: Interpreter, context: Context): Value { 
    return new CalculateValue(this.left.calculate(interpreter, context), this.operator, this.right.calculate(interpreter, context));
  }

  static build(left: Expression, items: Array<[CalculateOperator, Expression]>): Expression {
    if (!items.length) {
      return left;
    }

    const item = items.shift()!;
    return this._build(
      new CalculateExpression(left, item[0], item[1]),
      items
    );
  }

  static _build(left: CalculateExpression, items: Array<[CalculateOperator, Expression]>): CalculateExpression {
    if (!items.length) {
      return left;
    }

    const calc = items.shift()!;
    if (!CalculateOperatorOrder.hasOwnProperty(calc[0])) {
      throw new Error(`Unsupported operator: ${calc[0]}`);
    }

    const myPrio = CalculateOperatorOrder[calc[0]];
    const theirPrio = CalculateOperatorOrder[left.operator];

    if (myPrio < theirPrio) {
      left = new CalculateExpression(left, calc[0], calc[1]);
      left = this._build(left, items);
    } else {
      var newOp = new CalculateExpression(left.right, calc[0], calc[1]);
      left.right = this._build(newOp, items);
    }

    return left;
  }

  variableContextId(context: Context): string | null {
    const left = this.left.variableContextId(context);
    const right = this.right.variableContextId(context);
    
    if (left) {
      return left;
    } else {
      return right;
    }
  }

  dumpToString(): string {
    return `${this.left.dumpToString()} ${this.operator} ${this.right.dumpToString()}`
  }
}

export abstract class StringLiteralPart extends Node {
  abstract asHtmlString(interpreter: Interpreter, context: Context): string;
  abstract asJsString(interpreter: Interpreter, context: Context): string;
  abstract calculate(interpreter: Interpreter, context: Context): Value;
  abstract dumpToString(): string;
}

export class StringLiteralText extends StringLiteralPart {
  public readonly text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  asHtmlString(interpreter: Interpreter, context: Context): string {
    return this.text.replace(/\{/g, '\\{');
  }
  
  asJsString(interpreter: Interpreter, context: Context): string {
    return JSON.stringify(this.text);
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return new StringValue(this.text);
  }

  dumpToString() {
    return JSON.stringify(this.text);
  }
}

export class StringLiteralExpression extends StringLiteralPart {
  public readonly expression: Expression;

  constructor(expression: Expression) {
    super();
    this.expression = expression;
  }

  asHtmlString(interpreter: Interpreter, context: Context): string {
    if (this.expression.isStringLiteral()) {
      return `<eval>jsTextConst(${this.expression.asJsString(interpreter, context)})</eval>`;
    }

    return this.expression.asHtmlString(interpreter, context);
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    return this.expression.asJsString(interpreter, context);
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return this.expression.calculate(interpreter, context);
  }

  dumpToString() {
    return `#{${this.expression.dumpToString()}}`;
  }
}

export class StringLiteral extends Expression {
  public readonly components: StringLiteralPart[];

  constructor(string: string | StringLiteralPart[]) {
    super();

    if (Array.isArray(string)) {
      this.components = string;
    } else {
      this.components = [new StringLiteralText(string)];
    }
  }
  
  dumpToString(): string {
    return this.components.map(s => s.dumpToString()).join();
  }

  isStringLiteral(): boolean { return true; }

  asHtmlString(interpreter: Interpreter, context: Context): string {
    return this.components.map(c => c.asHtmlString(interpreter, context)).join('');
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    const parts = this.components.map(c => c.asJsString(interpreter, context));
    if (parts.length === 1) {
      return parts[0];
    } else {
      return `[${parts.join(',')}].concat('')`;
    }
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return new StringValue(this.components.map(c => c.calculate(interpreter, context).asString()).join(''));
  }

  variableContextId(context: Context): string | null {
    return null;
  }
}

export type NumberLiteralType = "millisecond" | "second" | "minute" | "hour";

export class NumberLiteral extends Expression {
  public readonly value: number;
  public readonly type?: NumberLiteralType;

  constructor(value: number, type?: NumberLiteralType) {
    super();
    this.value = value;
    this.type = type;
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    if (this.type) {
      return new DurationValue(this.value, this.type);
    }

    return new NumberValue(this.value);
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    return this.calculate(interpreter, context).asJsString(interpreter, context);
  }

  variableContextId(context: Context): string | null {
    return null;
  }

  dumpToString(): string {
    return this.value.toString();
  }
}

export class Range extends Expression {
  public readonly left: Expression;
  public readonly right: Expression;

  constructor(left: Expression, right: Expression) {
    super();
    this.left = left;
    this.right = right;
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return new RangeValue(this.left.calculate(interpreter, context), this.right.calculate(interpreter, context));
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    return `libRange(${this.left.asJsString(interpreter, context)}, ${this.right.asJsString(interpreter, context)})`;
  }

  variableContextId(context: Context): string | null {
    return null;
  }

  dumpToString(): string {
    return `${this.left.dumpToString()}..${this.right.dumpToString()}`
  }
}

export class TypeHintExpression extends Expression {
  protected type: Identifier;
  protected expression: Expression;

  constructor(expression: Expression, type: Identifier) {
    super();
    this.type = type;
    this.expression = expression;
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    return this.expression.calculate(interpreter, context);
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    const old = context.getContextValue('typehint');
    context.setContextValue('typehint', new StringValue(this.type.asString()));
    context.setVariableContext(this.type.asString());
    const result = this.expression.asJsString(interpreter, context);
    context.setContextValue('typehint', old);
    return result;
  }

  variableContextId(context: Context): string | null {
    return this.type.asString();
  }

  dumpToString(): string {
    return this.expression.dumpToString();
  }
}

export class IdentifierExpression extends Expression {
  protected identifier: Identifier;

  constructor(identifier: Identifier) {
    super();
    this.identifier = identifier;
  }

  calculate(interpreter: Interpreter, context: Context): Value {
    const name = this.identifier.asString();
    
    if (name === 'end') {
      return new FunctionValue((interpreter: Interpreter, context: Context, parameter: ParameterList) => {
        context.leave();
      })
    }

    return context.resolve(name);
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    const found = context.resolve(this.identifier.asString());
    return found.asJsString(interpreter, context);
  }

  variableContextId(context: Context): string | null {
    const found = context.resolve(this.identifier.asString());
    return found.variableContextId(context);
  }

  dumpToString() {
    return this.identifier.asString();
  }
}

export class CallExpression extends Expression { 
  protected identifier: Identifier;
  protected params: ParameterList;

  constructor(identifier: Identifier, params?: ParameterList) {
    super();
    this.identifier = identifier;
    this.params = params || new ParameterList([]);
  }
  
  calculate(interpreter: Interpreter, context: Context): Value {
    const callback = context.resolve(this.identifier.asString());
    if (!callback) {
      throw new Error(`Unable to find function: ${this.identifier.asString()}`)
    }
    //const callback = identifier.calculate(interpreter, context);
    if (callback.isUndefined()) {
      this.error(`Can't call undefined identifier`);
      return new UndefinedValue();
    }
    if (!callback.isFunction()) {
      this.error(`Call to a nunfunction`);
      return new UndefinedValue();
    }

    const result = callback.asFunction()(interpreter, context, this.params);
    if (!result) {
      this.error('Callback has no result');
      return new UndefinedValue();
    } else {
      return result;
    }
  }

  asJsString(interpreter: Interpreter, context: Context): string {
    const found = context.resolve(this.identifier.asString());
    if (!found || found.isUndefined()) {
      throw new Error(`Unable to find function: ${this.identifier.asString()}`)
    }
    return found.asJsString(interpreter, context, this.params);
  }

  variableContextId(context: Context): string | null {
    return null;
  }

  dumpToString() {
    return `${this.identifier.asString()}(${this.params.parameter.map(p => p.value.dumpToString()).join(', ')})`
  }
}