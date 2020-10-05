import Interpreter from "../milos/Interpreter";
import TeaseValue from "./TeaseValue";
import PageValue from "./PageValue";
import ScriptBlockValue from "./ScriptBlockValue";
import { StringLiteral, StringLiteralExpression } from "../milos/Expression";
import { SayMode, Say } from "../eos/commands/Say";
import { GoTo } from "../eos/commands/GoTo";
import ChoiceValue from "./ChoiceValue";
import Choice from "../eos/commands/Choice";
import { Image } from "../eos/commands/Image";
import If from "../eos/commands/If";
import IfValue from "./IfValue";
import Timer from "../eos/commands/Timer";
import Tease from "../eos/Tease";
import { Label } from "../eos/commands/Label";
import { LabelValue, StringValue, InlineJsValue, FunctionValue } from "../milos/Value";
import { Enable } from "../eos/commands/Enable";
import { Disable } from "../eos/commands/Disable";
import { End } from "../eos/commands/End";
import { CreateNotification } from "../eos/commands/CreateNotification";
import { RemoveNotification } from "../eos/commands/RemoveNotification";
import * as path from "path";
import * as fs from "fs";
import ScriptParser from "../milos/ScriptParser";
import { Context } from "../milos/Context";
import ThemeColorsValue, {ThemeColorMode} from "./ThemeColorsValue";
import { AudioPlay } from "../eos/commands/AudioPlay";
import { AudioStop } from "../eos/commands/AudioStop";

export function getThemeColors(context: Context): ThemeColorsValue {
  let value = context.root.getContextValue<ThemeColorsValue>('@themeColors');
  if (value) {
    return value;
  }

  value = new ThemeColorsValue();
  context.root.setContextValue('@themeColors', value);
  return value;
}

function createButton(interpreter: Interpreter, context: Context, label: string) {
  const block = context.getContextValue<ScriptBlockValue>('block')!.block!;
  const choice = new Choice();
  choice.add(label);
  block.push(choice);
}

function toCssColor(context: Context, color: string, colorMode: ThemeColorMode='normal'): string {
  if (color[0] === '#') {
    return color;
  }

  return getThemeColors(context).get(color)[colorMode];
}

function addColorHtml(context: Context, text: string, color: string, colorMode: ThemeColorMode='normal') {
  return `<span style="color:${toCssColor(context, color,colorMode)}">${text}</span>`;
}

export function sayHtml(text: string, context: Context) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/<c:([^>]+)>(.*?)<\/c>/g, (all, color, text) => addColorHtml(context, text, color))
    .replace(/\\n\\n/g, '</p><p>')
    .replace(/\\n/g, '<br/>');
  return `<p>${text}</p>`;
}

export function setup(interpreter: Interpreter) {
  const tease = new Tease();
  interpreter.root.setContextValue('tease', new TeaseValue(tease))

  interpreter.root.block("page", {
    before: function(interpreter, context, parameter) {
      const page = context.requireContextValue<TeaseValue>("tease").tease.page(parameter.at(0).calculate(interpreter, context).asString());
      context.setContextValue('page', new PageValue(page))
      context.setContextValue('block', new ScriptBlockValue(page.script));
      return new PageValue(page);
    },
    after: function(interpreter, context) {
      const goto = context.getContextValue<StringValue>('page_default_goto');
      if (goto !== null) {
        context.requireContextValue<PageValue>('page').page.script.push(new GoTo(goto.asString()));
      }
    }
  });

  interpreter.root.block("choices", {
    before: function(interpreter, context, parameter) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      const choice = new ChoiceValue(new Choice());
      context.setContextValue('choice', choice);
      block.push(choice.choice);
    },
    provides: function(library) {
      library.block("choice", {
        before: function(interpreter, context, parameter) {
          const choice = context.requireContextValue<ChoiceValue>("choice").choice;

          const text = parameter.at(0).calculate(interpreter, context).asString();
          const color = parameter.get('color', new StringLiteral('')).calculate(interpreter, context).asString();
          const visible = parameter.has('if') ? parameter.get('if', new StringLiteral('')).asJsString(interpreter, context) : undefined;

          const block = choice.add(text, color ? toCssColor(context, color, 'dark') : undefined, visible ? `\$${visible}` : undefined);
          const blockValue = new ScriptBlockValue(block);
          
          context.setContextValue('block', blockValue);
        }
      });
    }
  })


  interpreter.root.block('create_button', {
    before: function(interpreter, context, parameter) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      const noti = new CreateNotification(parameter.at(0).calculate(interpreter, context).asString());
      noti.buttonLabel = parameter.at(1).calculate(interpreter, context).asString();

      context.setContextValue('block', new ScriptBlockValue(noti.onClick));
      block.push(noti);
    }
  });

  interpreter.root.block('create_timer', {
    before: function(interpreter, context, parameter) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      const noti = new CreateNotification(parameter.at(0).calculate(interpreter, context).asString());
      if (parameter.has('title')) {
        noti.title = parameter.get('title').calculate(interpreter, context).asString();
      }

      noti.timerDuration = parameter.at(1).calculate(interpreter, context).asDurationString();

      context.setContextValue('block', new ScriptBlockValue(noti.onTimer));
      block.push(noti);
    }
  });

  interpreter.root.func('theme_color', function(interpreter, context, parameter) {
    const key = parameter.at(0).calculate(interpreter, context).asString();
    const color = parameter.at(1).calculate(interpreter, context).asString();
    let darkColor = color

    if (parameter.has('dark')) {
      darkColor = parameter.get('dark').calculate(interpreter, context).asString();
    }

    getThemeColors(context).set(key, color, darkColor);
  });

  interpreter.root.func('remove_button', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const noti = new RemoveNotification(parameter.at(0).calculate(interpreter, context).asString());
    block.push(noti);
  });

  interpreter.root.func('remove_timer', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const noti = new RemoveNotification(parameter.at(0).calculate(interpreter, context).asString());
    block.push(noti);
  });

  interpreter.root.block('if', {
    before: function(interpreter, context, parameter) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      const test = new If(parameter.at(0).asJsString(interpreter, context));
      context.setContextValue('block', new ScriptBlockValue(test.commands));
      block.push(test);
      return new IfValue(test);
    },
    provides: function(context) {
      context.func('elsif', function(interpreter, context, parameter) {
        const test = context.requireContextValue<IfValue>("if").value;
        const newTest = new If(parameter.at(0).asJsString(interpreter, context));
        context.setContextValue('if', new IfValue(newTest));
        context.setContextValue('block', new ScriptBlockValue(newTest.commands));
        test.otherwise.push(newTest);
      })
      context.func('else', function(interpreter, context, parameter) {
        const test = context.requireContextValue<IfValue>("if").value;
        context.setContextValue('block', new ScriptBlockValue(test.otherwise));
      });
    }
  });

  interpreter.root.func('$label', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const page = context.requireContextValue<PageValue>("page").page;
    const label = "lbl" + page.id + "id" + parameter.at(0).calculate(interpreter, context).asString();

    block.push(new Label(label));
  });

  interpreter.root.func('goto_label', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const page = context.requireContextValue<PageValue>("page").page;
    const label = "lbl" + page.id + "id" + parameter.at(0).calculate(interpreter, context).asString();

    block.push(new GoTo(label));
  })

  interpreter.root.func("say", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const message = sayHtml(parameter.at(0).asHtmlString(interpreter, context), context);
    const mode: SayMode = parameter.get("mode", new StringLiteral("auto")).calculate(interpreter, context).asString() as SayMode;
    const align: string = parameter.get("align", new StringLiteral("center")).calculate(interpreter, context).asString();
    block.push(new Say(message, mode, align));
  });

  interpreter.root.func("default_goto_page", function(interpreter, context, parameter) {
    context.setContextValue("page_default_goto", parameter.at(0).calculate(interpreter, context));
  });

  interpreter.root.func("goto_page", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const page = parameter.at(0).calculate(interpreter, context).asString();
    block.push(new GoTo(page));
  });

  interpreter.root.func("stop_tease", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    block.push(new End());
  });

  interpreter.root.func("enable_page", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const page = parameter.at(0).calculate(interpreter, context).asString();
    block.push(new Enable(page));
  });

  interpreter.root.func("disable_page", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const page = parameter.at(0).calculate(interpreter, context).asString();
    block.push(new Disable(page));
  });

  interpreter.root.func("image", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const file = parameter.at(0).calculate(interpreter, context).asString();
    block.push(Image.fromFile(`${file}.jpg`));
  })

  interpreter.root.func("wait", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const duration = parameter.at(0).asJsString(interpreter, context);
    const style = parameter.get("style", parameter.get("mode", new StringLiteral("secret"))).calculate(interpreter, context).asString();
    block.push(new Timer(`$libDuration(${duration})`, style, false));
  });

  interpreter.root.func('button', function(interpreter, context, parameter) {
    createButton(interpreter, context, parameter.at(0).asHtmlString(interpreter, context));
  })

  interpreter.root.func("include", function(interpreter, context, parameter) {
    const fileName = parameter.at(0).calculate(interpreter, context).asString();
    const includeFile = path.join(path.dirname(interpreter.currentScript().fileName), fileName);
    const parser = new ScriptParser();
    const text = fs.readFileSync(includeFile, 'utf8');
    try {
      const script = parser.parse(text, includeFile);
      interpreter.run(script);
    } catch(err) {
      console.error(`Error in ${fileName}: ${err.toString()}`);
    }
  });

  interpreter.root.func('play_audio', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const file = parameter.at(0).calculate(interpreter, context).asString();
    const id = parameter.get('as', new StringLiteral('default')).calculate(interpreter, context).asString();

    block.push(new AudioPlay(id, `file:${file}.mp3`));
  })

  interpreter.root.func('stop_audio', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = (parameter.length > 0 ? parameter.at(0) : new StringLiteral('default')).calculate(interpreter, context).asString();
    block.push(new AudioStop(id));
  })

  
  interpreter.root.set('random_float', new InlineJsValue('Math.random()'));

  interpreter.root.set('round', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    if (!parameter) {return "0";}
    return `Math.round(${parameter.at(0).asJsString(interpreter, context)})`;
  }));
  interpreter.root.set('floor', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    if (!parameter) {return "0";}
    return `Math.floor(${parameter.at(0).asJsString(interpreter, context)})`;
  }));
  interpreter.root.set('ceil', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    if (!parameter) {return "0";}
    return `Math.ceil(${parameter.at(0).asJsString(interpreter, context)})`;
  }));

  interpreter.root.func("include_script", function(interpreter, context, parameter) {
    const fileName = parameter.at(0).calculate(interpreter, context).asString();
    const includeFile = path.join(path.dirname(interpreter.currentScript().fileName), fileName);

    tease.appendLibScript(fs.readFileSync(includeFile, 'utf-8'));
  });

  interpreter.root.set('current_time', new InlineJsValue('Math.round((new Date()).getTime()/1000)'));
}

