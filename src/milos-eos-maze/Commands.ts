import Interpreter from "../milos/Interpreter"
import ScriptBlockValue from "../milos-eos/ScriptBlockValue";
import { StringLiteral, NumberLiteral, IdentifierExpression, CalculateExpression } from "../milos/Expression";
import { SayMode, Say } from "../eos/commands/Say";
import { Context } from "../milos/Context";
import Choice from "../eos/commands/Choice";
import { Image } from "../eos/commands/Image";
import { AudioPlay } from "../eos/commands/AudioPlay";
import { AudioStop } from "../eos/commands/AudioStop";
import { GoTo } from "../eos/commands/GoTo";
import { Eval } from "../eos/commands/Eval";
import PageValue from "../milos-eos/PageValue";
import Tease from "../eos/Tease";
import ParameterList from "../milos/ParameterList";
import { Parameter } from "../milos/Parameter";
import Identifier from "../milos/Identifier";
import { StringValue, InlineJsValue, FunctionValue } from "../milos/Value";
import TeaseValue from "../milos-eos/TeaseValue";
import Timer from "../eos/commands/Timer";
import { CreateNotification } from "../eos/commands/CreateNotification";
import { RemoveNotification } from "../eos/commands/RemoveNotification";
import If from "../eos/commands/If";
import { MazeContext } from "./MazeContext";
import { getThemeColors } from "../milos-eos/Commands";

let mazeVersion = 0;

let strokeSpeed: {[id: string]: {normal: string, fast: string}} = {}

function createButton(interpreter: Interpreter, context: Context, label: string, parameter: ParameterList) {
  label = label.replace(/~/g, 'CLICK OR PRESS "SPACE" IF YOU ');

  const colors = getThemeColors(context);

  const block = context.getContextValue<ScriptBlockValue>('block')!.block!;
  const say = new Say(`<p><span style="color:${colors.get('fast_button').normal}">- ${label} -</span></p>`, 'pause');
  block.push(say);
}

function createRealButton(interpreter: Interpreter, context: Context, label: string) {
  const block = context.getContextValue<ScriptBlockValue>('block')!.block!;
  const choice = new Choice();
  choice.add(label);
  block.push(choice);
}


export function createContext(): MazeContext {
  return {rooms: {}, deadEnds: {}, tags: [], goals: {}, fetishes: {}, toys: {}};
}

function makeRoomMap(maze: MazeContext, rooms: {[id: string]: string[]}) {
  const roomMap: {[bitmap: number]: string[]} = {}

  for (const room of Object.keys(rooms)) {
    const bitmap = rooms[room].reduce((all: number, cur: string) => (all | (1 << maze.tags.indexOf(cur))), 0);
  
    if (!roomMap.hasOwnProperty(bitmap)) {
      roomMap[bitmap] = [];
    }

    roomMap[bitmap].push(room);
  }

  return roomMap;
}

export function finalizeMaze(tease: Tease, maze: MazeContext) {
  const storeCode: string[] = ['function gameStoreMazeState(stream) {'];
  const activateCode: string[] = ['function gameActivateAllTags() {'];
  const deactivateCode: string[] = ['function gameDeactivateAllTags() {'];
  const restoreCode: string[] = ['function gameRestoreMazeState(stream, version) {'];
  const storeGameCode: string[] = ['function gameStoreGameState(stream) {'];
  const restoreGameCode: string[] = ['function gameRestoreGameState(stream, version) {'];
  const fetishList: string[] = [];
  const toyList: string[] = [];
  const hashCode: string[] = ['function gameTagsHash() {']
  const hashList: string[] = [];
  let index=0;
  for (const tag of maze.tags) {
    storeCode.push(`gameCodeAddNumber(stream, ${tag}, 1);`);
    activateCode.push(`${tag}=1;`);
    deactivateCode.push(`${tag}=0;`);
    restoreCode.push(`${tag}=gameCodeReadNumber(stream, 1);`);

    hashList.push(`(${tag}?${1 << index}:0)`);
    index++;
  }
  for (const goal of Object.keys(maze.goals)) {
    storeGameCode.push(`gameCodeAddNumber(stream, (curGoals.hasOwnProperty(${JSON.stringify(goal)}) ? (curGoals[${JSON.stringify(goal)}] === 'beat' ? 1 : 2) : 0), 2)`);
    restoreGameCode.push(`switch (gameCodeReadNumber(stream, 2)) {`)
    restoreGameCode.push(`case 1: curGoals[${JSON.stringify(goal)}]='beat'; break;`)
    restoreGameCode.push(`case 2: curGoals[${JSON.stringify(goal)}]='catch'; break;`)
    restoreGameCode.push(`}`)
  }
  for (const fetish of Object.keys(maze.fetishes)) {
    fetishList.push(`(${fetish} ? ${JSON.stringify(maze.fetishes[fetish])} : null)`)
  }
  for (const toy of Object.keys(maze.toys)) {
    toyList.push(`(${toy} ? ${JSON.stringify(maze.toys[toy])} : null)`)
  }
  hashCode.push(`return ${hashList.join('|')};`);
  tease.appendLibScript(storeCode.join('\n') + '}');
  tease.appendLibScript(restoreCode.join('\n') + '}');
  tease.appendLibScript(storeGameCode.join('\n') + '}');
  tease.appendLibScript(restoreGameCode.join('\n') + '}');
  tease.appendLibScript(hashCode.join('\n') + '}');
  tease.appendLibScript(activateCode.join('\n') + '}');
  tease.appendLibScript(deactivateCode.join('\n') + '}');
  tease.appendLibScript(`function gameListFetishes(){return [${fetishList.join(',')}].filter(function(f) {return f!==null;}).join(', ');}`);
  tease.appendLibScript(`function gameListToys(){return [${toyList.join(',')}].filter(function(f) {return f!==null;}).join(', ');}`);


  tease.appendLibScript(`var MAZE_VERSION=${mazeVersion};`);
  tease.appendLibScript(`var MAZE_ROOMS=${JSON.stringify(makeRoomMap(maze, maze.rooms))};`);
  tease.appendLibScript(`var MAZE_DEADENDS=${JSON.stringify(makeRoomMap(maze, maze.deadEnds))};`);
  tease.appendLibScript(`var MAZE_GOALS=${JSON.stringify(makeRoomMap(maze, maze.goals))};`);

  if (index >= 32) {
    throw new Error(`Too many fetishes/toys`);
  }
}

const DEBUG=false;

export function setup(interpreter: Interpreter, maze: MazeContext) {
  interpreter.root.func('room_init', function(interpreter, context, parameter) {
    const page = context.getContextValue<PageValue>('page')!.page!;
    const block = context.getContextValue<ScriptBlockValue>('block')!.block!;
    const fileName = parameter.at(0).calculate(interpreter, context).asString();

    const isMulti = parameter.get('multiple', new NumberLiteral(0)).calculate(interpreter, context).asBoolean();
    const isDeadEnd = parameter.get('club', new NumberLiteral(0)).calculate(interpreter, context).asBoolean();
    const isGoal = parameter.get('goal', new NumberLiteral(0)).calculate(interpreter, context).asBoolean();
    const isGoalBeat = parameter.get('goal_beat', new NumberLiteral(0)).calculate(interpreter, context).asBoolean();
    const isGoalCatch = parameter.get('goal_catch', new NumberLiteral(0)).calculate(interpreter, context).asBoolean();

    block.push(Image.fromFile(`${fileName}${isMulti ? '-*' : ''}.jpg`));

    if (DEBUG) {
      block.push(new Say(`<p><span style="color:#888">~~ <strong>DEBUG VIEW</strong> - <strong>Room: </strong>${fileName} - <strong>Code: <eval>gameCodeGenerate(curMaze, true)</eval></strong> ~~</span></p>`, 'instant'));
    }

    if (isGoal) {
      maze.goals[page.id] = []
    } else if (isGoalBeat) {
    } else if (isGoalCatch) {
    } else if (isDeadEnd) {
      maze.deadEnds[page.id] = []
    } else {
      maze.rooms[page.id] = []
    }
  })

  interpreter.root.block('room', {
    before: function(interpreter, context, parameter) {
      const id = parameter.at(0).calculate(interpreter, context).asString();

      const page = context.requireContextValue<TeaseValue>("tease").tease.page(id);
      context.setContextValue('page', new PageValue(page))
      context.setContextValue('block', new ScriptBlockValue(page.script));
      context.resolve('room_init').asFunction()(interpreter, context, parameter);
      return new PageValue(page);
    },
    after: function(interpreter, context, scope) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      block.push(new GoTo('next-room'));
      //const parameter = new ParameterList([]);
      //context.resolve('end_of_room').asFunction()(interpreter, context, parameter);
    }
  });
  
  interpreter.root.func("stroke_speed", function(interpreter, context, parameter) {
    const id = parameter.at(0).calculate(interpreter, context).asString();
    const normal = parameter.at(1).calculate(interpreter, context).asString();
    let fast = normal;
    
    if (parameter.has('fast')) {
      fast = parameter.get('fast').calculate(interpreter, context).asString();
    }

    strokeSpeed[id] = {normal, fast};
  });

  interpreter.root.func("stroke_for", function(interpreter, context, parameter) {
    const duration = new CalculateExpression(parameter.at(0), '*', new IdentifierExpression(new Identifier('stroke_duration_power')));
    const speed = parameter.at(1);

    context.resolve('start_stroke').asFunction()(interpreter, context, new ParameterList([new Parameter(speed)]));
    context.resolve('wait').asFunction()(interpreter, context, new ParameterList([new Parameter(duration), new Parameter(new StringLiteral('secret'), new Identifier('mode'))]));
    context.resolve('stop_stroke').asFunction()(interpreter, context, new ParameterList([]));
  });
  
  interpreter.root.func("hit_for", function(interpreter, context, parameter) {
    const duration = new CalculateExpression(parameter.at(0), '*', new IdentifierExpression(new Identifier('hit_power')));
    const speed = parameter.at(1);

    context.resolve('start_stroke').asFunction()(interpreter, context, new ParameterList([new Parameter(speed)]));
    context.resolve('wait').asFunction()(interpreter, context, new ParameterList([new Parameter(duration), new Parameter(new StringLiteral('secret'), new Identifier('mode'))]));
    context.resolve('stop_stroke').asFunction()(interpreter, context, new ParameterList([]));
  });

  interpreter.root.func("flash", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const file = parameter.at(0).calculate(interpreter, context).asString();
    block.push(Image.fromFile(`white.jpg`));
    block.push(new Timer('50ms', 'hidden', false));
    block.push(Image.fromFile(`${file}.jpg`));
    block.push(new Timer('50ms', 'hidden', false));
    block.push(Image.fromFile(`white.jpg`));
    block.push(new Timer('50ms', 'hidden', false));
    block.push(Image.fromFile(`${file}.jpg`));
  });

  interpreter.root.func("tell", function(interpreter, context, parameter) {
    const colors = getThemeColors(context);
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const message = `<p><span style="color:${colors.get('tell')}">` + parameter.at(0).asHtmlString(interpreter, context).replace(/<\p><p>/g, `</span></p><p><span style="color:${colors.get('tell')}">`) + '</span></p>';
    const mode: SayMode = parameter.get("mode", new StringLiteral("auto")).calculate(interpreter, context).asString() as SayMode;
    block.push(new Say(message, mode));
  });

  interpreter.root.func("demon_say", function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const message = '<p><span style="color:#ec5040">' + parameter.at(0).asHtmlString(interpreter, context) + '</span></p>';
    const mode: SayMode = parameter.get("mode", new StringLiteral("auto")).calculate(interpreter, context).asString() as SayMode;
    block.push(new Say(message, mode));
  });

  interpreter.root.func('fetish', function(interpreter, context, parameter) {
    const name = parameter.at(0).calculate(interpreter, context).asString();
    const text = parameter.at(1).calculate(interpreter, context).asString();
    const varName = `fetish_${name}`;
    const outerVarName = `vFetish_${name}`;
    const variableParameter = new ParameterList([new Parameter(new NumberLiteral(1), new Identifier(varName))]);
    context.resolve('number').asFunction()(interpreter, context, variableParameter);
    maze.fetishes[outerVarName] = text;
    maze.tags.push(outerVarName);
  })

  interpreter.root.func('toy', function(interpreter, context, parameter) {
    const name = parameter.at(0).calculate(interpreter, context).asString();
    const text = parameter.at(1).calculate(interpreter, context).asString();
    const varName = `toy_${name}`;
    const outerVarName = `vToy_${name}`;
    const variableParameter = new ParameterList([new Parameter(new NumberLiteral(1), new Identifier(varName))]);
    context.resolve('boolean').asFunction()(interpreter, context, variableParameter);
    maze.toys[outerVarName] = text;
    maze.tags.push(outerVarName);
  })

  interpreter.root.func('reset_goal', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = parameter.at(0).calculate(interpreter, context).asString();

    block.push(new Eval(`curGoals[${JSON.stringify(id)}]='';`));
  })

  interpreter.root.func('beat', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = parameter.at(0).calculate(interpreter, context).asString();

    block.push(new Eval(`curGoals[${JSON.stringify(id)}]='beat';`));
  })

  interpreter.root.func('catch', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = parameter.at(0).calculate(interpreter, context).asString();

    block.push(new Eval(`curGoals[${JSON.stringify(id)}]='catch';`));
  })

  interpreter.root.func('initialize_maze', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const size = parameter.at(0).calculate(interpreter, context).asNumber();

    block.push(new Eval(`mazeStartGame(${size}, ${size})`));
  })

  interpreter.root.func('initialize_lottery', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const debug = parameter.at(0).calculate(interpreter, context).asNumber();
    block.push(new Eval(`lotteryStartGame(${debug})`));
  })

  interpreter.root.func('end_of_room', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;

    const condition = new If(`!isLotteryMode`);
    condition.commands.push(new Say("<p>Where do you want to go?</p>", "instant"));

    const choices = new Choice();
    choices.add('North', undefined, `$mazeAllowPath(MAZE_DIR_UP)`).push(new GoTo(`$mazePageInPath(MAZE_DIR_UP)`));
    choices.add('East', undefined, `$mazeAllowPath(MAZE_DIR_RIGHT)`).push(new GoTo(`$mazePageInPath(MAZE_DIR_RIGHT)`));
    choices.add('South', undefined, `$mazeAllowPath(MAZE_DIR_DOWN)`).push(new GoTo(`$mazePageInPath(MAZE_DIR_DOWN)`));
    choices.add('West', undefined, `$mazeAllowPath(MAZE_DIR_LEFT)`).push(new GoTo(`$mazePageInPath(MAZE_DIR_LEFT)`));
    condition.commands.push(choices);

    condition.otherwise.push(new Say(`<p>You move on to the next room</p>`))
    condition.otherwise.push(new GoTo(`$mazeNextPageInLottery()`))

    block.push(condition);
  })

  interpreter.root.func('debug_end_of_room', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;

    block.push(new Say("<p>Where do you want to go?</p>", "instant"));

    const choices = new Choice();
    choices.add('North', undefined, `$mazeAllowPath(MAZE_DIR_UP)`).push(new Eval(`mazePageInPath(MAZE_DIR_UP)`));
    choices.add('East', undefined, `$mazeAllowPath(MAZE_DIR_RIGHT)`).push(new Eval(`mazePageInPath(MAZE_DIR_RIGHT)`));
    choices.add('South', undefined, `$mazeAllowPath(MAZE_DIR_DOWN)`).push(new Eval(`mazePageInPath(MAZE_DIR_DOWN)`));
    choices.add('West', undefined, `$mazeAllowPath(MAZE_DIR_LEFT)`).push(new Eval(`mazePageInPath(MAZE_DIR_LEFT)`));
    choices.add('Return').push(new GoTo(`debug`));
    block.push(choices);
  })

  interpreter.root.func('edge', function(interpreter, context, parameter) {
    createButton(interpreter, context, '~EDGED', parameter);
  })
  
  interpreter.root.func('fast_button', function(interpreter, context, parameter) {
    createButton(interpreter, context, parameter.at(0).asHtmlString(interpreter, context), parameter);
  })

  interpreter.root.func('hit_balls', function(interpreter, context, parameter) {
    createButton(interpreter, context, '~HIT YOUR BALLS', parameter);
  })


  interpreter.root.func('require_fetish', function(interpreter, context, parameter) {
    const page = context.getContextValue<PageValue>('page')!.page!;
    const id = parameter.at(0).calculate(interpreter, context).asString();

    if (maze.rooms.hasOwnProperty(page.id)) {
      maze.rooms[page.id].push(`vFetish_${id}`);
    } else if (maze.goals.hasOwnProperty(page.id)) {
      maze.goals[page.id].push(`vFetish_${id}`);
    } else {
      maze.deadEnds[page.id].push(`vFetish_${id}`);
    }
  })

  interpreter.root.func('require_toy', function(interpreter, context, parameter) {
    const page = context.getContextValue<PageValue>('page')!.page!;
    const id = parameter.at(0).calculate(interpreter, context).asString();
    
    if (maze.rooms.hasOwnProperty(page.id)) {
      maze.rooms[page.id].push(`vToy_${id}`);
    } else if (maze.goals.hasOwnProperty(page.id)) {
      maze.goals[page.id].push(`vToy_${id}`);
    } else {
      maze.deadEnds[page.id].push(`vToy_${id}`);
    }
  })

  interpreter.root.func('set_filter', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const filter = parameter.at(0).calculate(interpreter, context).asString();
    const id = parameter.at(1).calculate(interpreter, context).asString();
    const modify = parameter.at(2).asJsString(interpreter, context);

    block.push(new Eval(`gameAddFilter(${JSON.stringify(filter)}, ${JSON.stringify(id)}, ${modify})`));
  });

  interpreter.root.func('remove_filter', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const filter = parameter.at(0).calculate(interpreter, context).asString();
    const id = parameter.at(1).calculate(interpreter, context).asString();

    block.push(new Eval(`gameRemoveFilter(${JSON.stringify(filter)}, ${JSON.stringify(id)})`));
  });

  interpreter.root.func('start_stroke', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const speed = parameter.at(0).calculate(interpreter, context).asString();
    var bpm = 60;

    if (!strokeSpeed.hasOwnProperty(speed)) {
      throw new Error(`Undefined stroking speed: ${speed}`);
    }

    const {normal, fast} = strokeSpeed[speed];

    const cond = new If(`gameFilter("stroke_duration") >= 1.1`);
    cond.otherwise.push(new AudioPlay('stroke_audio', `file:${normal}.mp3`));
    cond.commands.push(new AudioPlay('stroke_audio', `file:${fast}.mp3`));
    block.push(cond);3
  })

  interpreter.root.func('stop_stroke', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    block.push(new AudioStop('stroke_audio'));
  })

  interpreter.root.func('restore_maze_from_code', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = parameter.at(0).asJsString(interpreter, context);

    block.push(new Eval(`mazeRestore(${id})`));
  })

  interpreter.root.block("encounter", {
    before: function(interpreter, context, parameter) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      const tease = context.requireContextValue<TeaseValue>("tease").tease;
      const config: string[] = [];
      
      const id = parameter.at(0).calculate(interpreter, context).asString();
      const roomId = `encounter-${id}`;
      let label;

      if (parameter.has('in_steps')) {
        config.push(`inSteps: ${parameter.get('in_steps').asJsString(interpreter, context)}`)
      }
      if (parameter.has('demon')) {
        config.push(`demon: ${parameter.get('demon').asJsString(interpreter, context)}`)
      }
      if (parameter.has('label')) {
        label = parameter.get('label').calculate(interpreter, context).asString();
      }

      block.push(new Eval(`gameAddEncounter(${JSON.stringify(id)}, ${JSON.stringify(roomId)}, {${config.join(',')}})`))
      if (label) {
        block.push(new CreateNotification(roomId, label));
      }

      const newBlock = new ScriptBlockValue(tease.page(roomId).script);
      newBlock.block.push(new RemoveNotification(roomId));
      context.setContextValue('block', newBlock);
      context.setContextValue('encounter_id', new StringValue(id));
    },
    after: function(interpreter, context) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      block.push(new GoTo('$mazeResumeAfterEncounter()'))
    }
  })

  interpreter.root.block("interrupt", {
    before: function(interpreter, context, parameter) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      const tease = context.requireContextValue<TeaseValue>("tease").tease;
      
      const id = parameter.at(0).calculate(interpreter, context).asString();
      const roomId = `interrupt-${id}`;

      const args = [JSON.stringify(roomId)];
      if (parameter.has('each_steps')) {
        args.push(`function(){return ${parameter.get('each_steps').asJsString(interpreter, context)}}`);
      }

      block.push(new Eval(`gameAddInterrupt(${args.join(',')})`))

      const newBlock = new ScriptBlockValue(tease.page(roomId).script);
      newBlock.block.push(new RemoveNotification(roomId));
      context.setContextValue('block', newBlock);
    },
    after: function(interpreter, context) {
      const block = context.requireContextValue<ScriptBlockValue>("block").block;
      block.push(new GoTo('$mazeResumeAfterInterrupt()'))
    }
  })

  interpreter.root.func('stop_interrupt', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = parameter.at(0).calculate(interpreter, context).asString();
    const roomId = `interrupt-${id}`;
    block.push(new Eval(`gameRemoveInterrupt(${JSON.stringify(roomId)})`))
  });

  interpreter.root.func('dressup', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    const id = parameter.at(0).asJsString(interpreter, context);
    block.push(new Eval(`curDress=${id};`));
  });

  interpreter.root.func('restore_fetish_config', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    block.push(new Eval(`gameDeactivateAllTags(); try { gameCodeRestore(teaseStorage.getItem('fetish_config')||''); } catch(err) { console.error(err); }`));
  });

  interpreter.root.func('store_fetish_config', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;
    block.push(new Eval(`teaseStorage.setItem('fetish_config', gameCodeGenerate(null))`));
  });

  interpreter.root.func('has_anal_task', function(interpreter, context, parameter) {
    const block = context.requireContextValue<ScriptBlockValue>("block").block;

    const condition = new If(`vAnal_initialized === 0`);
    condition.commands.push(new GoTo(`anal-initialize`))
    block.push(condition);
  });

  interpreter.root.func('maze_version', function(interpreter, context, parameter) {
    mazeVersion = parameter.at(0).calculate(interpreter, context).asNumber();
  });

  interpreter.root.set('stroke_duration_power', new InlineJsValue('gameFilter("stroke_duration")'));
  interpreter.root.set('stroke_speed_power', new InlineJsValue('gameFilter("stroke_speed")'));
  interpreter.root.set('hit_power', new InlineJsValue('gameFilter("hits")'));
  interpreter.root.set('maze_is_valid', new InlineJsValue('mazeIsValid()'));
  interpreter.root.set('current_dress', new InlineJsValue('curDress'));
  interpreter.root.set('is_lottery_mode', new InlineJsValue('isLotteryMode'));
  interpreter.root.set('is_maze_mode', new InlineJsValue('!isLotteryMode'));
  interpreter.root.set('is_debug_mode', new InlineJsValue(DEBUG ? '1' : '0'));
  interpreter.root.set('current_num_catch', new InlineJsValue('gameNumCatch()'));
  interpreter.root.set('has_current_dress', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    return 'curDress!=="none"';
  }));
  interpreter.root.set('resume_by_code', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    if (!parameter) {
      return "false";
    }

    return `gameResumeByCode(${parameter.at(0).asJsString(interpreter, context)})`;
  }));
  interpreter.root.set('has_encounter', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    if (!parameter) {
      return "false";
    }

    return `gameHasEncounter(${parameter.at(0).asJsString(interpreter, context)})`;
  }));
  interpreter.root.set('maze_goal_state', FunctionValue.JsOnly(function(interpreter, context, parameter) {
    if (!parameter) {
      return "0";
    }

    return `gameGoalState(${parameter.at(0).asJsString(interpreter, context)})`;
  }));

}