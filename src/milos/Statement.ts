import { Expression, IdentifierExpression, StringLiteralExpression, StringLiteral } from "./Expression";
import { Parameter } from "./Parameter";
import Interpreter from "./Interpreter";
import { Context } from "./Context";
import ParameterList from "./ParameterList";
import Identifier from "./Identifier";
import { Node } from "./Milos";

export abstract class Statement extends Node {
  prepare(interpreter: Interpreter, context: Context): void {}

  abstract execute(interpreter: Interpreter, context: Context): void;
}

export class CallStatement extends Statement {
  public readonly callback: Expression;
  public readonly params: ParameterList;

  constructor(callback: Expression, params: ParameterList = new ParameterList([])) {
    super();
    this.callback = callback;
    this.params = params;
  }

  execute(interpreter: Interpreter, context: Context) {
    const callback = this.callback.calculate(interpreter, context);
    let varContext = this.callback.variableContextId(context);
    if (varContext === null && this.params.parameter.length > 0) {
      varContext = this.params.at(0).variableContextId(context);
    }
    context.setVariableContext(varContext);

    if (callback.isUndefined()) {
      this.error(`Can't call undefined identifier`);
      return;
    }
    if (!callback.isFunction()) {
      return;
    }

    try {
      callback.asFunction()(interpreter, context, this.params);
    } catch (err) {
      console.error(`Error calling: ${this.callback.dumpToString()}: ${err}`);
    }
  }
}

export class LabelStatement extends Statement {
  public readonly identifier: Identifier;

  constructor(identifier: Identifier) {
    super();
    this.identifier = identifier;
  }

  execute(interpreter: Interpreter, context: Context) {
    const labelFunc = context.resolve('$label');
    if (!labelFunc.isFunction()) {
      return;
    }

    labelFunc.asFunction()(interpreter, context, new ParameterList([new Parameter(new StringLiteral(this.identifier.asString()))]));
  }
}
