import { IUndoableCommand } from "../../api/commands/undoable";
import { Editor } from "../../core/impl/editor";
import { IReceiver } from "../../core/interfaces/receiver";
import { TextRange } from "../../types/comment.box";
import { CommentContainer } from "../../types/CommentContainer";
import { TypingAction } from "../../types/TypingAction";
import { CommentHandler } from "../CommentHandler";
import { UndoRedoManager } from "../UndoRedoManager";

export class Typing implements IUndoableCommand {

  private action: TypingAction;

  private editor: Editor;

  private undoManager: UndoRedoManager;

  private commentHandler: CommentHandler;

  private commentMemento: CommentContainer[];

  private textMemento: string;

  private isRangeDeleted: boolean;

  private inputRange: TextRange;

  private isUndo: boolean;

  private commentsOldPositions: Map<CommentContainer, TextRange>;

  public constructor(action: TypingAction, input?: string) {
    this.action = action;
    this.editor = Editor.getInstance();
    this.undoManager = UndoRedoManager.getInstance();
    this.commentHandler = CommentHandler.getInstance();
    this.textMemento = input ?? '';
    this.commentMemento = [];
    this.isUndo = false;
  }
  getConstructorName(): string {
    return "Typing";
  }

  private backupContentAndDelete(): void {
    this.textMemento = this.editor.getRawContent();
    this.commentMemento = this.commentHandler.filterSelectedComments(this.inputRange);
    this.deleteSelection();
  }

  private handleDeletion() {
    if (this.inputRange.start == 0 && this.inputRange.end == 0) {
      return;
    }

    this.isRangeDeleted = (this.inputRange.end > this.inputRange.start);
    if (this.inputRange.start == this.inputRange.end) {
      const old: TextRange = {start: this.inputRange.start, end: this.inputRange.end};
      if (this.action === TypingAction.Backspace)
        this.inputRange.start -= 1;
      else
        this.inputRange.end += 1;

      this.editor.selectRange(this.inputRange);
      this.backupContentAndDelete();

      const isBackspace = this.action === TypingAction.Backspace;

      this.commentsOldPositions = this.commentHandler.shiftComments(-1, old.start, old.end, isBackspace, isBackspace);
    }
    else {
      this.backupContentAndDelete();
      const shiftAmount = this.inputRange.end - this.inputRange.start;
      this.commentsOldPositions = this.commentHandler.shiftComments(-shiftAmount, this.inputRange.start, this.inputRange.end,
        this.action === TypingAction.Backspace, false);
    }
  }

  private deleteSelection(): void {
    const removed = this.removeCommentsIfSelected();
  }

  private removeCommentsIfSelected(): boolean {
    return this.commentHandler.removeSelectedComments(this.inputRange);
  }

  private revertCommentDeletion(): void {
    // TODO: pre ovoga bi vrv trebalo odraditi shiftovanje
    this.commentMemento.forEach(container => {
      this.commentHandler.insertCommentThread(container);
    });
  }

  private restorePreviousSelection(): void {
    if (this.isRangeDeleted) {
      this.editor.selectRange(this.inputRange);
    }
    else {
      this.editor.setCursorAtPosition(this.inputRange.start + 1);
    }
  }

  private restoreContent(): void {
    this.editor.setRawContent(this.textMemento);
  }

  private shiftContent() {
    let shiftAmount = -(this.inputRange.end - this.inputRange.start);

    const force = this.isRangeDeleted || this.action === TypingAction.Backspace;
    const start = this.inputRange.start;
    const end = this.inputRange.end;

    this.commentHandler.shiftComments(shiftAmount, start, end, force);
  }

  undo(): void {
    this.commentsOldPositions.forEach((value, key) => {
      key.setStartIndex(value.start);
      key.setEndIndex(value.end);
    });

    this.commentHandler.printComments();

    if (this.action === TypingAction.Other) {
      this.inputRange.end += 1;
      this.editor.replaceSelectedContent(this.inputRange, '');
      this.editor.setCursorAtPosition(this.inputRange.start);
      // TODO: dodati vracanje teksta ako je postojao
    }
    else if (this.action === TypingAction.Enter) {
      this.inputRange.end += 1;
      this.editor.replaceSelectedContent(this.inputRange, '');
      this.editor.setCursorAtPosition(this.inputRange.start);
      // TODO: dodati vracanje teksta ako je postojao
    }
    else if (this.action === TypingAction.Backspace) {
      this.restoreContent();
      this.revertCommentDeletion();
      this.restorePreviousSelection();
    }
    else if (this.action === TypingAction.Delete) {
      this.restoreContent();
      this.revertCommentDeletion();
      this.restorePreviousSelection();
    }
  }

  redo(): void {
    this.isUndo = false;

    if (this.action === TypingAction.Other) {
      this.inputRange.end -= 1;
      this.commentHandler.shiftComments(1, this.inputRange.start, this.inputRange.end, false, true);
      this.editor.replaceSelectedContent(this.inputRange, this.textMemento);
      this.editor.setCursorAtPosition(this.inputRange.end + 1);
    }
    else if (this.action === TypingAction.Enter) {
      this.inputRange.end -= 1;
      this.commentHandler.shiftComments(1, this.inputRange.start, this.inputRange.end, false, true);
      document.execCommand('insertLineBreak');
    }
    else if (this.action === TypingAction.Backspace) {
      this.editor.selectRange(this.inputRange);
      this.backupContentAndDelete();
      this.shiftContent();
    }
    else if (this.action === TypingAction.Delete) {
      this.editor.selectRange(this.inputRange);
      this.backupContentAndDelete();
      this.shiftContent();
    }

  }

  attachReceiver(receiver: IReceiver) {}

  execute(): boolean {
    this.inputRange = this.editor.getSelectedPositionAbs();
    console.log(this.inputRange);
    // TODO: dodati situaciju gde se selektuje tekst, a onda se unese neki karakter (koji nije brisanje)
    switch (this.action) {
      case TypingAction.Other:
        this.commentsOldPositions = this.commentHandler.shiftComments(1, this.inputRange.start, this.inputRange.end, false, true);
        break;
      case TypingAction.Enter:
        this.commentsOldPositions =  this.commentHandler.shiftComments(1, this.inputRange.start, this.inputRange.end, false, true);
        document.execCommand('insertLineBreak');
        break;
      case TypingAction.Backspace:
      case TypingAction.Delete:
        this.handleDeletion();
        break;
    }

    this.undoManager.add(this);
    this.editor.onCommandSuccess();
    return true;
  }

  canExecute(): boolean {
    return true;
  }
}
