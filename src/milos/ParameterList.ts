import { Parameter } from "./Parameter";
import { UndefinedExpression, Expression } from "./Expression";
import { Node } from "./Milos"

export default class ParameterList extends Node {
  public readonly parameter: Parameter[];

  constructor(parameter: Parameter[]) {
    super();
    this.parameter = parameter;
  }

  get length() {
    return this.parameter.length;
  }

  prepend(par: Parameter) {
    this.parameter.unshift(par);
  }

  has(key: string): boolean {
    for (const parameter of this.parameter) {
      if (parameter.name && parameter.name.asString() === key) {
        return true;
      }
    }

    return false;
  }

  get(key: string, fallback?: Expression): Expression {
    for (const parameter of this.parameter) {
      if (parameter.name && parameter.name.asString() === key) {
        return parameter.value;
      }
    }

    return fallback ? fallback : new UndefinedExpression();
  }

  at(index: number) {
    if (this.parameter.length < index) {
      throw new Error(`Missing parameter`);
    }

    return this.parameter[index].value;
  }
}
