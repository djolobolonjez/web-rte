import { IUndoableCommand } from "../../api/commands/undoable";
import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { TextRange } from "../../types/comment.box";
import { CommentContainer } from "../../types/CommentContainer";
import { CommentReply } from "../../types/CommentReply";
import { CommentHandler } from "../CommentHandler";
import { UndoRedoManager } from "../UndoRedoManager";

export class Comment implements IUndoableCommand {
  private editor: Editor;

  private commentHandler: CommentHandler;

  private undoManager: UndoRedoManager;

  private commentedAreaRange: TextRange;

  private initialComment: string

  private memento: CommentContainer;

  public constructor(initialComment: string) {
    this.editor = Editor.getInstance();
    this.undoManager = UndoRedoManager.getInstance();
    this.commentHandler = CommentHandler.getInstance();
    this.commentedAreaRange = this.editor.getPreviousRange();
    this.initialComment = initialComment;
  }

  undo(): void {
    this.editor.replaceCommentWithPlainText(this.commentedAreaRange);
    this.commentHandler.removeCommentThread(this.commentedAreaRange.start);
    this.editor.setCursorAtPosition(this.commentedAreaRange.end);
  }

  redo(): void {
    this.addCommentThread(this.memento);
  }

  attachReceiver(receiver: IReceiver) {}

  execute(): boolean {
    let {start, end} = this.commentedAreaRange;
    if (start == end) {
      return false;
    }

    let commentThread = new CommentContainer(this.commentedAreaRange);
    commentThread.addReply(new CommentReply("placeholder", this.initialComment));
    this.addCommentThread(commentThread);
    this.undoManager.add(this);

    this.memento = commentThread;
    return true;
  }
  canExecute(): boolean {
    // ne moze da se izvrsi ako je selektovan deo teksta vec komentarisan
    return true;
  }

  private addCommentThread(commentThread: CommentContainer) {

    this.commentHandler.insertCommentThread(commentThread);
    this.editor.highlightCommentedArea(this.commentedAreaRange);

    this.editor.setCursorAtPosition(this.commentedAreaRange.end);
    this.editor.onCommandSuccess();
  }

}
