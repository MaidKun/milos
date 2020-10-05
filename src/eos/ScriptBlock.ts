import Command, {CommandJson} from "./Command";
import { GoTo, GoToJson } from "./commands/GoTo";
import Tease from "./Tease";
import { Say, SayJson } from "./commands/Say";
import { Image, ImageJson } from "./commands/Image";
import Timer, { TimerJson } from "./commands/Timer";
import { EvalJson, Eval } from "./commands/Eval";
import Choice, { ChoiceJson } from "./commands/Choice";
import { End } from "./commands/End";
import If, { IfJson } from "./commands/If";

export type ScriptBlockJson = CommandJson[];

export default class ScriptBlock {
  protected commands: Command[] = [];
  
  clear() {
    this.commands.splice(0);
  }

  push(command: Command) {
    this.commands.push(command);
  }

  addManyFromJson(commands: CommandJson[]) {
    for (const command of commands) {
      this.addFromJson(command);
    }
  }

  addFromJson(command: CommandJson) {
    const key = Object.keys(command);
    if (key.length !== 1) {
      throw new Error('Could not parse command: Too many keys');
    }

    const value: any = (command as any)[key[0]];
    
    switch (key[0]) {
      case 'say': this.push(Say.createFromJson(value as SayJson)); break;
      case 'image': this.push(Image.createFromJson(value as ImageJson)); break;
      case 'timer': this.push(Timer.createFromJson(value as TimerJson)); break;
      case 'goto': this.push(GoTo.createFromJson(value as GoToJson)); break;
      case 'eval': this.push(Eval.createFromJson(value as EvalJson)); break;
      case 'choice': this.push(Choice.createFromJson(value as ChoiceJson)); break;
      case 'if': this.push(If.createFromJson(value as IfJson)); break;
      case 'end': this.push(new End()); break;

      case 'noop': break;

    default:
      console.warn(`Skipping unknown command: ${key[0]}`);
    }
  }

  get all() {
    return this.commands;
  }

  flatten(tease: Tease) {
    let current;
    for (let left=0; left<this.commands.length; left++) {
      current = left;
      //console.log('FLATTEN', left, this.commands[current].constructor.name);
      const result = this.commands[current].flatten(tease);
      if (result === false) {
        //console.log('»» skip');
        continue;
      }

      if (result.removeSelf) {
        //console.log('»» removeSelf');
        this.commands.splice(current, 1);
        left--;
      }

      if (result.newPage) {
        //console.log('»» newPage');
        for (const command of this.commands.splice(current)) {
          //console.log(`~~~~ add`, command);
          result.newPage.script.push(command);
        }
        this.push(new GoTo(result.newPage.id));
        result.newPage.flatten();
        break;
      }

      if (result.stopPage) {
        this.commands.splice(current + 1);
        break;
      }
    }
  }

  asJson(): ScriptBlockJson {
    return this.commands.map(c => c.asJson())
  }
}