import Command, {CommandJson, CommandFlattenResult} from "../Command";
import ScriptBlock, { ScriptBlockJson } from "../ScriptBlock";

export interface CreateNotificationJson {
  title?: string;
  buttonLabel?: string;
  buttonCommands?: ScriptBlockJson;
  timerDuration?: string;
  timerCommands?: ScriptBlockJson;
  id?: string;
}

export class CreateNotification extends Command {
  public id: string;
  public title?: string;
  public buttonLabel?: string;
  public readonly onClick: ScriptBlock;
  public timerDuration?: string;
  public readonly onTimer: ScriptBlock;

  constructor(id: string, title?: string) {
    super();

    this.id = id;
    this.title = title;
    this.onClick = new ScriptBlock();
    this.onTimer = new ScriptBlock();
  }

  asJson(): CommandJson {
    const result: CreateNotificationJson = {
      id: this.id,
      title: this.title,
      buttonLabel: this.buttonLabel,
      timerDuration: this.timerDuration,
    };

    if (this.onClick.all.length) {
      result.buttonCommands = this.onClick.asJson();
    }

    if (this.onTimer.all.length) {
      result.timerCommands = this.onTimer.asJson();
    }

    return {"notification.create": result};
  }
}