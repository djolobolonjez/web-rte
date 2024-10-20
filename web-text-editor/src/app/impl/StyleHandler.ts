import { BehaviorSubject } from "rxjs";

export class StyleHandler {
  private static instance: StyleHandler;

  private styleObservable: BehaviorSubject<Object>;

  private boldState: boolean = false;

  private italicState: boolean = false;

  private underlineState: boolean = false;

  private constructor() {
    this.styleObservable = new BehaviorSubject({bold: false, italic: false, underline: false})
  }

  public clear() {
    this.boldState = false;
    this.italicState = false;
    this.underlineState = false;
    this.styleObservable.next({bold: this.boldState, italic: this.italicState, underline: this.underlineState});
  }

  public static getInstance(): StyleHandler {
    if (this.instance == null) {
      this.instance = new StyleHandler();
    }

    return this.instance;
  }

  public subscribeStyleState(callback): void {
    this.styleObservable.subscribe(callback);
  }

  public getBold(): boolean {
    return this.boldState;
  }

  public getItalic(): boolean {
    return this.italicState;
  }
  public getUnderline(): boolean {
    return this.underlineState;
  }

  public updateBoldState(state: boolean) {
    this.boldState = state;
    console.log('da');
    this.styleObservable.next({bold: this.boldState, italic: this.italicState, underline: this.underlineState});
  }

  public updateItalicState(state: boolean) {
    this.italicState = state;
    this.styleObservable.next({bold: this.boldState, italic: this.italicState, underline: this.underlineState});
  }

  public updateUnderlineState(state: boolean) {
    this.underlineState = state;
    this.styleObservable.next({bold: this.boldState, italic: this.italicState, underline: this.underlineState});
  }
}
