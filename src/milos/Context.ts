import { Value, FunctionValue, UndefinedValue } from "./Value";
import Interpreter from "./Interpreter";
import ParameterList from "./ParameterList";

export interface ScriptBlockOptions<T extends Value> {
  before?: (interpreter: Interpreter, context: Context, parameter: ParameterList) => T | void;
  provides?: (context: Context) => void;
  after?: (interpreter: Interpreter, context: Context, scope?: T) => Value | void;
}

export type ScriptFunction = (interpreter: Interpreter, context: Context, parameter: ParameterList) => Value | void;
export type ScriptJsFunction = (interpreter: Interpreter, context: Context, parameter?: ParameterList) => string;
export type ScriptTypeFunction = (context: Context) => string | null;

export class Context {
  private currentChild?: Context;
  public readonly parentContext?: Context;
  private onExitCurrentChild?: ()=>void;

  private contextValues: {[key: string]: Value} = {};
  private values: {[key: string]: Value} = {};
  private variableContext: string | null = null;

  constructor(parent?: Context) {
    this.parentContext = parent;
  }
  
  get root() {
    if (this.parentContext) {
      return this.parentContext;
    }

    return this;
  }

  enter(context: Context, onLeave: ()=>void) {
    this.currentChild = context;
    this.onExitCurrentChild = onLeave;
  }

  leave() {
    if (this.parentContext) {
      this.parentContext.onLeave();
    }
  }

  setVariableContext(context: string | null) {
    this.variableContext = context;
  }

  getVariableContext(): string {
    if (this.variableContext === null && this.parentContext) {
      return this.parentContext.getVariableContext();
    }

    return this.variableContext || '';
  }

  protected onLeave() {
    if (this.onExitCurrentChild) {
      this.onExitCurrentChild();
    }
    this.onExitCurrentChild = undefined;
    this.currentChild = undefined;
  }

  current(): Context {
    if (this.currentChild) {
      return this.currentChild.current();
    }

    return this;
  }

  setContextValue(name: string, value: Value | null) {
    if (value === null) {
      delete this.contextValues[name];
    } else {
      this.contextValues[name] = value;
    }
  }

  getContextValue<T extends Value>(name: string): T | null {
    if (this.contextValues.hasOwnProperty(name)) {
      return this.contextValues[name] as any as T;
    }

    if (this.parentContext) {
      return this.parentContext.getContextValue<T>(name);
    }

    return null;
  }

  requireContextValue<T extends Value>(name: string): T {
    const value = this.getContextValue<T>(name);

    if (value === null) {
      throw new Error(`Missing context value: ${name}`);
    }

    return value;
  }

  block<T extends Value>(name: string, options: ScriptBlockOptions<T>) {
    this.func(name, function(interpreter: Interpreter, context: Context, parameter: ParameterList) {
      let result: T | UndefinedValue;

      let newContext = new Context(context);
      context.enter(newContext, () => {
        if (options.after) {
          options.after(interpreter, newContext, result as T);
        }
      })

      if (options.before) {
        result = options.before(interpreter, newContext, parameter) || new UndefinedValue();
        if (result) {
          newContext.setContextValue(name, result);
        }
      }

      if (options.provides) {
        options.provides(context);
      }
    })
  }

  set(name: string, value: Value) {
    this.values[name] = value;
  }

  func(name: string, callback: ScriptFunction) {
    const func = new FunctionValue(callback)
    this.values[name] = func;
    return func;
  }
  
  resolve(name: string): Value {
    if (this.values.hasOwnProperty(name)) {
      return this.values[name];
    }

    if (this.parentContext) {
      return this.parentContext.resolve(name);
    }

    //console.warn(`Unable to resolve ${name}`);
    return new UndefinedValue(name);
  }
}

export class RootContext extends Context {

}