import { BehaviorSubject } from "rxjs";
import { TextRange } from "../types/comment.box";
import { CommentContainer } from "../types/CommentContainer";
import { CommentReply } from "../types/CommentReply";
import { Editor } from "../core/impl/editor";

export class CommentHandler {

  private static instance: CommentHandler;

  public allComments: CommentContainer[];

  private commentsObservable: BehaviorSubject<CommentContainer[]>;

  private selectionObservable: BehaviorSubject<boolean>;

  private editor: Editor;

  private constructor() {
    this.allComments = []; // ovde ce se zapravo dohvatati svi postojeci komentari iz baze
    this.commentsObservable = new BehaviorSubject(this.allComments);
    this.selectionObservable = new BehaviorSubject(false);
    this.editor = Editor.getInstance();
  }

  public static getInstance(): CommentHandler {
    if (this.instance == null) {
      this.instance = new CommentHandler();
    }

    return this.instance;
  }

  private cloneCommentContainers(): CommentContainer[] {
    let clonedContainers = [];
    this.allComments.forEach((value, index, array) => {
      const textRange = {start: array[index].getStartIndex(), end: array[index].getEndIndex()};
      clonedContainers.push(Object.assign(new CommentContainer(textRange), array[index].clone()));
    })

    return clonedContainers;
  }

  public clear() {
    this.allComments = [];
    this.commentsObservable.next(this.cloneCommentContainers());
  }

  public getRawComments() {
    return structuredClone(this.allComments);
  }

  public parseComments(bsonDocObject: object[]) {
    let docArray = bsonDocObject.map(obj => Object.entries(obj));
    docArray.forEach(doc => {
      const commentedArea = doc[1][1];
      const allReplies = doc[2][1];

      let commentThread = new CommentContainer({ start: commentedArea[0], end: commentedArea[1] });
      let replyArray = allReplies.map(repl => Object.entries(repl));

      replyArray.forEach(reply => {
        commentThread.addReply(new CommentReply(reply[1][1], reply[2][1], reply[3][1]));
      })

      this.insertCommentThread(commentThread);
    })
  }

  public findSelectedComment(): number {
    const comments = this.getSelectedComments(this.editor.getSelectedPositionAbs());
    return comments[0].getID();
  }

  public insertCommentThread(commentThread: CommentContainer) {
    this.allComments.push(commentThread);
    this.allComments.sort((a, b) => a.getStartIndex() - b.getStartIndex());

    this.commentsObservable.next(this.cloneCommentContainers());
  }

  public removeCommentThread(startIndex: number) {
    this.allComments = this.allComments.filter(x => {
      return x.getStartIndex() != startIndex;
    });
    this.commentsObservable.next(this.cloneCommentContainers());
  }

  public addReply(commentID: number, reply: CommentReply) {
    const comment = this.allComments.find(x => {return x.getID() == commentID});
    comment.addReply(reply);
    this.commentsObservable.next(this.cloneCommentContainers());
  }

  public removeReply(commentID: number) {
    const comment = this.allComments.find(x => {return x.getID() == commentID});
    comment.removeLatestReply();

    this.commentsObservable.next(this.cloneCommentContainers());
  }

  public removeSelectedComments(selectedRange: TextRange): boolean {
    const len = this.allComments.length;
    this.allComments = this.allComments.filter(comm => {
      console.log(comm.getStartIndex(), comm.getEndIndex());
      return (comm.getStartIndex() < selectedRange.start || comm.getEndIndex() > selectedRange.end);
    });

    console.log(this.allComments);

    this.commentsObservable.next(this.cloneCommentContainers());

    return len > 0 && len != this.allComments.length;
  }

  public filterSelectedComments(selectedRange: TextRange): CommentContainer[] {
    return this.allComments.filter(comm => {
      return (comm.getStartIndex() >= selectedRange.start && comm.getEndIndex() <= selectedRange.end);
    });
  }

  public getOverlappingComments(textRange: TextRange): CommentContainer[] {
    let {start, end} = textRange;
    return  this.allComments.filter(comm => {
      return (start >= comm.getStartIndex() && start <= comm.getEndIndex())
      || (end >= comm.getStartIndex() && end <= comm.getEndIndex());
    })
  }

  private getSelectedComments(range: TextRange) {
    return this.allComments.filter(comm => {
      return (range.start >= comm.getStartIndex() && range.start <= comm.getEndIndex()) ||
      (range.end >= comm.getStartIndex() && range.end <= comm.getEndIndex());
    });
  }

  private isCommentSelected(range: TextRange): boolean {
    const comments = this.getSelectedComments(range);
    console.log(comments);
    return comments.length != 0;
  }

  public notifyCommentSelection(range: TextRange) {
    console.log('ok?');
    this.selectionObservable.next(this.isCommentSelected(range));
  }

  public subscribeForCommentThreads(callback): void {
    this.commentsObservable.subscribe(callback);
  }

  public subscribeCommentState(callback): void {
    this.selectionObservable.subscribe(callback);
  }

  shiftComments (shiftAmount: number, start: number, end: number, backspace: boolean = false, force: boolean = false): Map<CommentContainer, TextRange> {
    let changedIndicesMap = new Map<CommentContainer, TextRange>();

    this.allComments.forEach(comm => {
      let startIndex = comm.getStartIndex();
      let endIndex = comm.getEndIndex();

      console.log(startIndex, start);

      if (startIndex > start) {
        comm.setStartIndex(startIndex + shiftAmount);
        comm.setEndIndex(endIndex + shiftAmount);

        if (end > startIndex && end < endIndex) {
          comm.setStartIndex(comm.getStartIndex() + end - startIndex);
        }
      } else if (startIndex == start) {
        comm.setEndIndex(endIndex + shiftAmount);
        if (force) {
          comm.setStartIndex(startIndex + shiftAmount);
        }
      } else {
        console.log(endIndex, start);
        if (endIndex > start || backspace) {
          comm.setEndIndex(endIndex + shiftAmount);
        }
      }

      if (comm.getStartIndex() != startIndex || comm.getEndIndex() != endIndex) {
        changedIndicesMap.set(comm, {start: startIndex, end: endIndex});
      }
    });
    return changedIndicesMap;
  }

  printComments() {
    console.log(this.allComments);
  }
}
