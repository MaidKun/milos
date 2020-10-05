import { RootContext, Context } from "./Context";
import Script from "./Script";
import StatementList from "./StatementList";
import { Statement } from "./Statement";

export default class Interpreter {
  public readonly root: RootContext = new RootContext;
  private scriptStack: Script[] = [];

  run(script: Script) {
    this.scriptStack.unshift(script);
    this.executeList(script.root, this.root);
    this.scriptStack.shift();
  }

  currentScript(): Script {
    return this.scriptStack[0];
  }

  executeList(list: StatementList, context: Context) {
    for (const item of list.statements) {
      this.execute(item, context)
    }
  }

  execute(stmt: Statement, context: Context) {
    stmt.execute(this, context.current());
  }
}
