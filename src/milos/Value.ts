import { ScriptFunction, ScriptJsFunction, Context, ScriptTypeFunction } from "./Context";
import {NumberLiteralType, CalculateOperator} from "./Expression";
import Interpreter from "./Interpreter";
import ParameterList from "./ParameterList";

export abstract class Value {
  abstract typeName(): string;
  abstract asString(): string;
  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string { return 'undefined'; }

  isUndefined(): boolean { return false; }

  asHtmlString(): string { return this.asString(); }
  asDurationRangeString(): string {
    return this.asDurationString();
  }
  asDurationString(): string {
    throw new Error(`Unable to convert ${this.typeName()} to duration`);
  }

  variableContextId(context: Context): string | null {
    return null;
  }

  asNumber(): number { return 0; }
  asBoolean(): boolean { return true; }

  isFunction(): boolean { return false; }
  asFunction(): ScriptFunction { throw new Error('Can not cast to function'); }
}

export class UndefinedValue extends Value {
  typeName(): string { return "undefined"; }
  asString(): string { return "<undefined>"; }
  asBoolean(): boolean { return false; }
  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string { return 'undefined'; }
  isUndefined(): boolean { return true; }

  public readonly name?: string;

  constructor(name?: string) {
    super();
    this.name = name;
  }
}

export class ArrayValue<T extends Value=any> extends Value {
  public readonly items: T[];

  typeName(): string { return "array"; }

  constructor(data: T[]) {
    super();
    this.items = data;
  }

  asString(): string {
    return `[${this.items.map(i => i.asString()).join(',')}]`;
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return `[${this.items.map(i => i.asJsString(interpreter, context, parameter)).join(',')}]`;
  }
}

export class MapValue<T extends Value=any> extends Value {
  public readonly items: {[id: string]: T};

  typeName(): string { return "map"; }

  constructor(data: {[id: string]: T}) {
    super();
    this.items = data;
  }

  asString(): string { 
    return `{${Object.keys(this.items).map(key => `${key}: ${this.items[key].asString()}`).join(',')}}`
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return `{${Object.keys(this.items).map(key => `${key}: ${this.items[key].asJsString(interpreter, context, parameter)}`).join(',')}}`
  }
}

export class CalculateValue extends Value {
  protected left: Value;
  protected operator: CalculateOperator;
  protected right: Value;

  typeName(): string { return "calc"; }

  constructor(left: Value, operator: CalculateOperator, right: Value) {
    super();

    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  asString(): string { 
    throw new Error('TODO: CALCULATE');
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return 'TODO: CALCULATE';
  }
}

export class StringValue extends Value {
  public readonly text: string;

  typeName(): string { return "string"; }

  constructor(text: string) {
    super();
    this.text = text;
  }

  asString(): string { 
    return this.text;
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return JSON.stringify(this.text);
  }
}

export class InlineJsValue extends Value {
  public readonly js: string;

  typeName(): string { return "js"; }

  constructor(js: string) {
    super();
    this.js = js;
  }


  asString(): string { 
    return this.js;
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return this.js;
  }
}

export class LabelValue extends Value {
  public readonly text: string;

  typeName(): string { return "label"; }

  constructor(text: string) {
    super();
    this.text = text;
  }

  asString(): string { 
    return this.text;
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return JSON.stringify(this.text);
  }
}

export class RangeValue extends Value {
  public readonly left: Value;
  public readonly right: Value;

  typeName(): string { return "range"; }

  constructor(left: Value, right: Value) {
    super();
    this.left = left;
    this.right = right;
  }

  asString(): string { 
    return this.left.toString() + '..' + this.right.asString();
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    return `lib_range(${this.left.asJsString(interpreter, context, parameter)}, ${this.right.asJsString(interpreter, context, parameter)})`;
  }

  asDurationRangeString(): string {
    return this.left.asDurationString() + '-' + this.right.asDurationString();
  }
}

export class NumberValue extends Value {
  public readonly value: number;

  typeName(): string { return "number"; }

  constructor(value: number) {
    super();
    this.value = value;
  }

  asString(): string { 
    return this.value.toString();
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    const type = context.getVariableContext();
    return `jsNum(${this.value.toString()}, ${JSON.stringify(type)})`;
  }

  asNumber(): number { return this.value; }
  asBoolean(): boolean { return !!this.value; }

  asDurationString(): string {
    return this.value.toString() + "s";
  }
}

export class DurationValue extends NumberValue {
  public readonly type: NumberLiteralType;

  typeName(): string { return "duration"; }

  constructor(value: number, type: NumberLiteralType) {
    super(value);
    this.type = type;
  }

  asString(): string { 
    return `${this.value.toString()}${this.type}`;
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    switch (this.type) {
      case 'millisecond': return (this.value / 1000).toString();
      case 'second': return this.value.toString();
      case 'minute': return (this.value * 60).toString();
      case 'hour': return (this.value * 60 * 24).toString();
    }
  }

  asDurationString(): string {
    return this.value.toString() + this.type[0];
  }
}

export class FunctionValue extends Value {
  public readonly value: ScriptFunction;
  protected jsValue?: ScriptJsFunction;
  protected typeValue?: ScriptTypeFunction;

  typeName(): string { return "function"; }

  constructor(value: ScriptFunction) {
    super();
    this.value = value;
  }

  static JsOnly(callback: ScriptJsFunction) {
    const func = new FunctionValue(function(){return new NumberValue(0)});
    return func.forJs(callback);
  }

  asString(): string { 
    return "<Function>";
  }

  forJs(callback: ScriptJsFunction) {
    this.jsValue = callback;
    return this;
  }

  withType(callback: ScriptTypeFunction) {
    this.typeValue = callback;
    return this;
  }

  asJsString(interpreter: Interpreter, context: Context, parameter?: ParameterList): string {
    if (this.jsValue) {
      return this.jsValue(interpreter, context, parameter);
    }

    return '"function"';
  }

  variableContextId(context: Context): string | null {
    if (this.typeValue) {
      return this.typeValue(context);
    }

    return null;
  }

  isFunction(): boolean { return true; }
  asFunction(): ScriptFunction { return this.value; }
}