import { IUndoableCommand } from "../../api/commands/undoable";
import { IReceiver } from "../../core/interfaces/receiver";
import { CommentReply } from "../../types/CommentReply";
import { CommentHandler } from "../CommentHandler";
import { UndoRedoManager } from "../UndoRedoManager";

export class Reply implements IUndoableCommand {

  private commentHandler: CommentHandler;

  private undoManager: UndoRedoManager;

  private reply: string;

  private commentID: number;

  private memento: CommentReply;

  public constructor(commentID: number, reply: string) {
    this.undoManager = UndoRedoManager.getInstance();
    this.commentHandler = CommentHandler.getInstance();
    this.reply = reply;
    this.commentID = commentID;
  }

  undo(): void {
    this.commentHandler.removeReply(this.commentID);
  }
  redo(): void {
    this.commentHandler.addReply(this.commentID, this.memento);
  }
  attachReceiver(receiver: IReceiver) {}
  execute(): boolean {

    if (this.reply.length == 0) {
      return false;
    }

    const newReply = new CommentReply("placeholder", this.reply);
    this.commentHandler.addReply(this.commentID, newReply);
    this.undoManager.add(this);

    this.memento = newReply;
    return true;
  }
  canExecute(): boolean {
    return true;
  }

}
