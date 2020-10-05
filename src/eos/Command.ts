import { GoToJson } from "./commands/GoTo";
import { SayJson } from "./commands/Say";
import { ChoiceJson } from "./commands/Choice";
import { ImageJson } from "./commands/Image";
import { IfJson } from "./commands/If";
import { TimerJson } from "./commands/Timer";
import { EvalJson } from "./commands/Eval";
import { EnableJson } from "./commands/Enable";
import { DisableJson } from "./commands/Disable";
import { EndJson } from "./commands/End";
import { CreateNotificationJson } from "./commands/CreateNotification";
import { RemoveNotificationJson } from "./commands/RemoveNotification";
import Page from "./Page";
import Tease from "./Tease";
import { AudioPlayJson } from "./commands/AudioPlay";
import { PromptJson } from "./commands/Prompt";

export interface CommandJson {
  goto?: GoToJson;
  say?: SayJson;
  choice?: ChoiceJson;
  image?: ImageJson;
  if?: IfJson;
  timer?: TimerJson;
  eval?: EvalJson;
  enable?: EnableJson;
  disable?: DisableJson;
  prompt?: PromptJson;
  end?: EndJson;
  "notification.create"?: CreateNotificationJson;
  "notification.remove"?: RemoveNotificationJson;
  "audio.play"?: AudioPlayJson;
}

export interface CommandFlattenResult {
  newPage?: Page;
  removeSelf?: boolean;
  stopPage?: boolean;
}

export default abstract class Command {
  abstract asJson(): CommandJson;

  flatten(tease: Tease): CommandFlattenResult | false {
    return false;
  }
}
