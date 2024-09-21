import { TextRange } from "./comment.box";
import { CommentReply } from "./CommentReply";

export class CommentContainer {

  private static ID: number = 0;

  private id: number
  private commentedArea: TextRange;
  private allReplies: CommentReply[];

  public constructor(commentedArea: TextRange, replies?: CommentReply[], id?: number) {
    this.allReplies = replies ?? [];
    this.commentedArea = commentedArea;
    this.id = id ?? CommentContainer.ID++;
  }

  public addReply(reply: CommentReply) {
    this.allReplies.push(reply);
  }

  public removeLatestReply() {
    this.allReplies.pop();
  }

  public getStartIndex(): number {
    return this.commentedArea.start;
  }

  public getEndIndex(): number {
    return this.commentedArea.end;
  }

  public getReplies() {
    return this.allReplies;
  }

  public getID(): number {
    return this.id;
  }

  public clone(): CommentContainer {

    let cloneReplies = [];
    this.allReplies.forEach((value, index, array) => {
      const reply = array[index];
      const proto = Object.getPrototypeOf(reply);
      let cloneObject = Object.create(proto);
      cloneReplies.push(Object.assign(cloneObject, structuredClone(reply)));
    });
    const textRange = {start: this.commentedArea.start, end: this.commentedArea.end};

    return new CommentContainer(textRange, cloneReplies, this.id);
  }

}
