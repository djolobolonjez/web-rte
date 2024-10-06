import { ICommand } from "./command";

export interface IUndoableCommand extends ICommand {
    undo(): void;
    redo(): void;
}
