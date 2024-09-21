import { IReceiver } from "../../core/interfaces/receiver";

export interface ICommand {
    attachReceiver(receiver: IReceiver);
    execute(): boolean;
    canExecute(): boolean;
}
