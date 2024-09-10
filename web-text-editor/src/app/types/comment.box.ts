export type TextRange = {start: number, end: number};

export class CommentBox {
    selectionRange: TextRange = {start: 0, end: 0};
    comments: string[] = [];
    newReply: string = "";

    constructor(start: number, end: number, initialComment: string) {
        this.selectionRange = { start, end };
        this.comments = [initialComment];
        this.newReply = '';
      }
}