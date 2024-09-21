import { BehaviorSubject } from "rxjs";
import { TextRange } from "../types/comment.box";
import { CommentContainer } from "../types/CommentContainer";
import { CommentReply } from "../types/CommentReply";

export class CommentHandler {

  private static instance: CommentHandler;

  public allComments: CommentContainer[];

  private commentsObservable: BehaviorSubject<CommentContainer[]>;

  private constructor() {
    this.allComments = []; // ovde ce se zapravo dohvatati svi postojeci komentari iz baze
    this.commentsObservable = new BehaviorSubject(this.allComments);
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

  public getOverlappingComments(textRange: TextRange): CommentContainer[] {
    let {start, end} = textRange;
    return  this.allComments.filter(comm => {
      return (start >= comm.getStartIndex() && start <= comm.getEndIndex())
      || (end >= comm.getStartIndex() && end <= comm.getEndIndex());
    })
  }

  public subscribeForCommentThreads(callback): void {
    this.commentsObservable.subscribe(callback);
  }
}
