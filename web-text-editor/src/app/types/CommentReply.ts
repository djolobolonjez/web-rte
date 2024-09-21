const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export class CommentReply {

  private static ID: number = 0;

  private id: number;
  private author: string;
  private text: string;
  private lastModified: string // datum

  private getCurrentDateAsString(): string {
    const today = new Date();

    const month = monthNames[today.getMonth()];
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();

    return `${month} ${day}, ${year}`;
  }

  public constructor(author: string, text: string) {
    this.author = author;
    this.text = text;
    this.lastModified = this.getCurrentDateAsString();
    this.id = CommentReply.ID++;
  }

  public getAuthor(): string {
    return this.author
  }

  public getText(): string {
    return this.text;
  }

  public getLastModified(): string {
    return this.lastModified;
  }

  public getID(): number {
    return this.id;
  }
}
