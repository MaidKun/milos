import Interpreter from "../milos/Interpreter";
import Tease from "../eos/Tease";
import {sayHtml} from "../milos-eos";
import TeaseValue from "../milos-eos/TeaseValue";
import ParameterList from "../milos/ParameterList";
import { Context } from "../milos/Context";
import { Value, UndefinedValue, StringValue } from "../milos/Value";
import ScriptBlockValue from "../milos-eos/ScriptBlockValue";
import { Eval } from "../eos/commands/Eval";
import { Prompt } from "../eos/commands/Prompt";
import { Label } from "../eos/commands/Label";
import If from "../eos/commands/If";
import { GoTo } from "../eos/commands/GoTo";
import { Say } from "../eos/commands/Say";

var nextLabelId = 0;

export function freeLabelId() {
  return `label${nextLabelId++}`;
}

export function globalId(id: string) {
  return `v${id[0].toUpperCase()}${id.substr(1)}`;
}

export function varTypeId(id: string) {
  return `vartype:${id[0].toUpperCase()}${id.substr(1)}`;
}

function eachVariable(interpreter: Interpreter, context: Context, parameter: ParameterList, callback: (tease: Tease, key: string, initial: Value) => any) {
  const tease = context.requireContextValue<TeaseValue>('tease').tease;

  for (const par of parameter.parameter) {
    if (par.name) {
      callback(tease, par.name.asString(), par.value.calculate(interpreter, context));
    } else {
      callback(tease, par.value.calculate(interpreter, context).asString(), new UndefinedValue());
    }
  }
}

function setupVariableGetterSetter(context: Context, id: string) {
  context.func(`${id}`, function(interpreter, context, parameter) {
    throw new Error('Direct access to variable not supported yet');
  }).forJs(function(interpreter, context, parameter) {
    const hint = context.getContextValue('typehint');
    if (hint) {
      return `jsGet(${globalId(id)}, ${hint.asJsString(interpreter, context)})`;
    } else {
      return `jsGet(${globalId(id)}, '${id}')`;
    }
  }).withType(function() {
    return id;
  });

  context.func(`${id}=`, function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>('block');
    block.block.push(new Eval(`${globalId(id)}=jsSet(${parameter.at(0).asJsString(interpreter, context)}, '${id}');`))
  }).withType(function() {
    return id;
  });
}

export function setup(interpreter: Interpreter) {
  const tease = interpreter.root.requireContextValue<TeaseValue>('tease').tease;

  interpreter.root.func('number', function(interpreter, context, parameter) {
    eachVariable(interpreter, context, parameter, function(tease: Tease, id: string, initial: Value) {
      tease.prependInitScript(`var ${globalId(id)} = ${initial.asJsString(interpreter, context)};`);
      context.setContextValue(varTypeId(id), new StringValue("number"));

      setupVariableGetterSetter(context, id);
    });
  })

  interpreter.root.func('boolean', function(interpreter, context, parameter) {
    eachVariable(interpreter, context, parameter, function(tease: Tease, id: string, initial: Value) {
      tease.prependInitScript(`var ${globalId(id)} = ${initial.asJsString(interpreter, context)};`);
      context.setContextValue(varTypeId(id), new StringValue("boolean"));

      setupVariableGetterSetter(context, id);
    });
  })

  interpreter.root.func('string', function(interpreter, context, parameter) {
    eachVariable(interpreter, context, parameter, function(tease: Tease, id: string, initial: Value) {
      tease.prependInitScript(`var ${globalId(id)} = ${initial.asJsString(interpreter, context)};`);
      context.setContextValue(varTypeId(id), new StringValue("string"));

      setupVariableGetterSetter(context, id);
    });
  })

  interpreter.root.func('enum', function(interpreter, context, parameter) {
    eachVariable(interpreter, context, parameter, function(tease: Tease, id: string, initial: Value) {
      tease.prependInitScript(`var ${globalId(id)} = 0;`);
      context.setContextValue(varTypeId(id), new StringValue("enum"));

      setupVariableGetterSetter(context, id);
    });
  });

  interpreter.root.func('prompt', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = globalId(parameter.at(0).calculate(interpreter, context).asString());

    block.push(new Prompt(id));
  });

  interpreter.root.func('prompt_number', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = globalId(parameter.at(0).calculate(interpreter, context).asString());
    const message = sayHtml(parameter.at(1).asHtmlString(interpreter, context), context);
    const label = freeLabelId();

    block.push(new Label(label));
    block.push(new Say(message));
    block.push(new Prompt(id));
    
    const condition = new If(`!libIsInteger(${id})`);
    condition.commands.push(new GoTo(label));

    block.push(condition);
    block.push(new Eval(`${id}=parseInt(${id}, 10)`))
  });

  interpreter.root.func('include_default_getter_and_setter', function() {
    tease.appendLibScript('var jsNum=function(num,type){return num;}')
    tease.appendLibScript('var jsGet=function(num,type){return num;}')
    tease.appendLibScript('var jsSet=function(num,type){return num;}')
    tease.appendLibScript('var jsTextConst=function(text){return text;}')
    tease.appendLibScript('var libRange=function(a, b) {return (Math.random() * (b - a) + a);}');
    tease.appendLibScript('var libDuration=function(a) {return a * 1000;}');
    tease.appendLibScript('var libIsInteger=function(txt) {return !!txt.toString().match(/^\\d+$/);}');
  })
}
