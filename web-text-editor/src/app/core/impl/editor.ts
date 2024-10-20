import { ICommand } from "../../api/commands/command";
import { Typing } from "../../impl/commands/typing";
import { CommentHandler } from "../../impl/CommentHandler";
import { StyleHandler } from "../../impl/StyleHandler";
import { TextRange } from "../../types/comment.box";
import { TypingAction } from "../../types/TypingAction";
import { IReceiver } from "../interfaces/receiver";

export class Editor implements IReceiver {
  private contentEditableElement: HTMLElement;

  private static instance: Editor;

  private selectedRange: TextRange;

  private lastCommand: ICommand;

  private styleHandler: StyleHandler;

  private cursorSurroundingElement: HTMLElement;

  private constructor() {
    this.contentEditableElement = document.querySelector('.editor') as HTMLElement;
    this.styleHandler = StyleHandler.getInstance();
  }

  public listenDOMEvents() {
    this.contentEditableElement.addEventListener('keyup', this.onKeyup.bind(this));
    this.contentEditableElement.addEventListener('keydown', this.onKeydown.bind(this));
    this.contentEditableElement.addEventListener('mouseup', this.onMouseup.bind(this));
  }

  public getLastCommand(): ICommand {
    return this.lastCommand;
  }

  public getStringContent(): string {
    return this.contentEditableElement.innerText;
  }

  public getRawContent(): string {
    return this.contentEditableElement.innerHTML;
  }

  public setSelectionRange(selectedRange: TextRange): void {
    this.selectedRange = selectedRange;
  }

  public setRawContent(content: string): void {
    this.contentEditableElement.innerHTML = content;
  }

  public getPreviousRange(): TextRange {
    return this.selectedRange;
  }

  public clear() {
    this.setRawContent('');
    this.setSelectionRange({start: 0, end: 0});
    this.setLastCommand(null);
  }

  public static getInstance() {
    if (this.instance == null) {
      this.instance = new Editor();
    }

    return this.instance;
  }

  public setLastCommand(command: ICommand) {
    this.lastCommand = command;
  }

  public onCommandSuccess(): void {
    this.contentEditableElement.focus();
  }

  private onKeyup(event: KeyboardEvent): void {
    this.checkTextState();
    this.cleanUpElements();
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const typingCommand = new Typing(TypingAction.Enter);
      typingCommand.execute();
      event.preventDefault();
    }
    else if (event.key === 'Backspace' || event.key === 'Delete') {
      const action = event.key === 'Backspace' ? TypingAction.Backspace : TypingAction.Delete;
      const typingCommand = new Typing(action);
      typingCommand.execute();
    }
    else {

      const noTextKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'CapsLock'];
      const isInput = !noTextKeys.includes(event.key);
      this.checkCommentAreaChange(isInput);
      if (isInput) {
        const typingCommand = new Typing(TypingAction.Other, event.key);
        typingCommand.execute();
      }
    }
  }

  private isComment(element: HTMLElement | undefined): boolean {
    if (!element)
      return false;

    return element.tagName?.toLowerCase() == 'span' && element.hasAttribute('comment');
  }



  private onMouseup(event: MouseEvent): void {
    this.checkTextState();
  }

  private isCursorInsideComment() {
    console.log('mmh');
    console.log(this.cursorSurroundingElement);

    return this.cursorSurroundingElement.tagName?.toLowerCase() == 'span' && this.cursorSurroundingElement.hasAttribute('comment');
  }

  private checkTextState() {
    const selection = window.getSelection();
    const parentElement = selection.anchorNode.parentElement;
    this.setSelectionRange(this.getSelectedPositionAbs());
    if (this.selectedRange.end > this.selectedRange.start) {
      CommentHandler.getInstance().notifyCommentSelection(this.selectedRange);
    }
    if (parentElement) {
      // Check for bold state (inside <b>)
      const boldState = this.styleHandler.getBold();
      const isBold = parentElement.closest('b') !== null;

      // turn off bold if text is deleted
      if (!isBold && document.queryCommandState('bold')) {
        document.execCommand('bold', false, '');
      }

      if (isBold != boldState) {
        this.styleHandler.updateBoldState(isBold);
      }

      // Check for italic state (inside <i>)
      const italicState = this.styleHandler.getItalic();
      const isItalic = parentElement.closest('i') !== null;

      // turn off italic if text is deleted
      if (!isItalic && document.queryCommandState('italic')) {
        document.execCommand('italic', false, '');
      }

      if (isItalic != italicState) {
        this.styleHandler.updateItalicState(isItalic);
      }

      const underlineState = this.styleHandler.getUnderline();
      const isUnderline = parentElement.closest('u') !== null;

      if (!isUnderline && document.queryCommandState('underline')) {
        document.execCommand('underline', false, '');
      }

      if (isUnderline != underlineState) {
        this.styleHandler.updateUnderlineState(isUnderline);
      }
      if (this.cursorSurroundingElement) {

        // writing after or before comment (you can only write inside it, or use find/replace dialog)
        if (this.isCursorInsideComment()) {
          console.log(this.cursorSurroundingElement);
          this.cursorSurroundingElement.setAttribute('contenteditable', 'true');
          this.cursorSurroundingElement = null;
        }
      }
    } else {
      this.styleHandler.updateBoldState(false);
      this.styleHandler.updateItalicState(false);
      this.styleHandler.updateUnderlineState(false);
    }
  }

  public getSelectedRange(): Range | undefined {
    const selection = window.getSelection();
    return selection.getRangeAt(0);
  }

  private getElementOffset(range: Range): number {
    let charCount = 0;

    const treeWalker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT, // Only show text nodes
      null
    );

    let node;
    while ((node = treeWalker.nextNode())) {
      if (node === range.startContainer) {
        return charCount + range.startOffset;
      }
      charCount += node.textContent.length || 0;
    }

    return charCount;
  }

  public getSelectedPositionAbs(): TextRange {
    let start = 0;
    let end = 0;
    let charCount = 0;

    const range = this.getSelectedRange();

    const parent = range.commonAncestorContainer;
    if (parent && parent.nodeType === Node.ELEMENT_NODE) {
      parent.normalize();
    }
    // if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    //   console.log('ovo sranje');
    //   start = this.getElementOffset(range);
    //   end = start + window.getSelection().toString().length;
    //   return {start, end};
    // }

    const treeWalker = document.createTreeWalker(
      this.contentEditableElement,
      NodeFilter.SHOW_TEXT, // Only show text nodes
      null
    );

    let node: Text | null;
    while ((node = treeWalker.nextNode() as Text)) {
      const nodeLength = node.textContent.length || 0;

      // If the start of the range is in this node
      if (node === range.startContainer) {
        start = charCount + range.startOffset;
      }

      // If the end of the range is in this node
      if (node === range.endContainer) {
        end = charCount + range.endOffset;
        break;
      }

      charCount += nodeLength;
    }

    return { start, end };
  }

  public getTextNodeAtPosition(offset: number) {
    if (!this.contentEditableElement)
      return null;

    let currentOffset = 0;

    const treeWalker = document.createTreeWalker(
      this.contentEditableElement,
      NodeFilter.SHOW_TEXT,  // Only consider text nodes
      null
    );

    let node: Text | null;
    while ((node = treeWalker.nextNode() as Text)) {
      const nodeLength = node.textContent.length || 0;

      // Check if the offset falls within the current nodes text content
      if (currentOffset + nodeLength >= offset) {
        return {
          node,
          startOffset: currentOffset  // Record the start offset for this node
        };
      }
      currentOffset += nodeLength;
    }
    return null;
  }

  public setRangeNodesForPosition(textRange: TextRange, range: Range): boolean {
    if (!this.contentEditableElement)
      return false;

    const startNodeInfo = this.getTextNodeAtPosition(textRange.start);
    const endNodeInfo = this.getTextNodeAtPosition(textRange.end);

    if (!startNodeInfo || !endNodeInfo)
      return false;

    range.setStart(startNodeInfo.node, textRange.start - startNodeInfo.startOffset);
    range.setEnd(endNodeInfo.node, textRange.end - endNodeInfo.startOffset);
    return true;
  }

  public cleanUpElements() {
    function removeEmptyTags(node: Node) {
      // Traverse the children of the element
      Array.from(node.childNodes).forEach(child => {
        // If the child is an element, check its contents recursively
        if (child.nodeType === Node.ELEMENT_NODE) {
          removeEmptyTags(child);
          if (isEmptyElement(child)) {
            child.parentNode.removeChild(child);
          }
        }
      });
    }

    // Check if an element is empty (no child nodes and no text content)
    function isEmptyElement(element) {
      return element.nodeType === Node.ELEMENT_NODE &&
             element.children.length === 0 &&
             element.textContent.trim() === '';
    }
    removeEmptyTags(this.contentEditableElement);
  }

  public selectRange(selectedRange: TextRange) {
    const range = document.createRange();

    if (this.setRangeNodesForPosition(selectedRange, range)) {
      const selection = window.getSelection();
      selection.removeAllRanges();  // Clear previous selections
      selection.addRange(range);  // Highlight the range
    }
  }

  public replaceSelectedContent(selectedRange: TextRange, replacement: string): void {
    const range = document.createRange();
    console.log(selectedRange);
    if (this.setRangeNodesForPosition(selectedRange, range)) {
      const containterFragment = range.cloneContents();
      const content = containterFragment.firstElementChild as HTMLElement;

      let newNode: Node | null;
      if (content) {
        // TODO: treba da se prilagodi komentarima da se ne bi sav tekst obrisao vrv?
        content.textContent = replacement;
        newNode = content;
      } else {
        newNode = document.createTextNode(replacement);
      }

      range.deleteContents();
      range.insertNode(newNode);
    }
  }

  public cleanUpComments(): number[] {
    let indices = [];
    console.log(this.contentEditableElement.querySelectorAll('span'));
    const spans = Array.from(this.contentEditableElement.querySelectorAll('span'));
    console.log(spans.length);
    spans.forEach(span => {
      console.log(span.textContent);
      if (!span.textContent.trim()) {
        indices.push(spans.indexOf(span));
      }
    });

    return indices;
  }

  public replaceCommentWithPlainText(selectedRange: TextRange): void {
    const range = document.createRange();
    if (this.setRangeNodesForPosition(selectedRange, range)) {
      const containterFragment = range.cloneContents();
      const content = containterFragment.firstElementChild as HTMLElement;

      let node = document.createTextNode(content.textContent);
      range.deleteContents();
      range.insertNode(node);

      this.cleanUpComments();
    }
  }

  public highlightCommentedArea(selectedRange: TextRange): Node {
    let range = document.createRange();

    if (this.setRangeNodesForPosition(selectedRange,  range)) {
      const span = document.createElement('span');
      span.style.backgroundColor = '#f0f0f0';
      span.style.borderRadius = '4px';
      span.setAttribute('comment', 'true');

      const clone = range.cloneContents();
      range.deleteContents();
      span.appendChild(clone); // wrap range with span
      range.insertNode(span);

      return span;
    }

    return null;
  }

  public setCursorAtPosition(pos: number) {
    const range = document.createRange();
    const selection = window.getSelection();

    // Get the text node and offset within the node for the specific global character position
    const nodeInfo = this.getTextNodeAtPosition(pos);

    if (nodeInfo) {
      // Set the range to collapse at the desired position
      range.setStart(nodeInfo.node, pos - nodeInfo.startOffset);
      range.collapse(true);  // Collapse the range to a single point (just the cursor)

      // Clear existing selections and apply the new range
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  private moveCaretOutsideSpan(span: HTMLElement, moveAfter: boolean) {
    const range = document.createRange();
    const selection = window.getSelection();

    if (moveAfter) {
      // Move caret after the span
      if (span.nextSibling) {
        range.setStart(span.nextSibling, 0); // Move to the start of the next sibling
      } else if (span.parentNode) {
        range.setStartAfter(span); // If no sibling, move to the end of the span
      }
    } else {
      // Move caret before the span
      range.setStartBefore(span);
    }

    range.collapse(true); // Collapse the range to set the caret position
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private checkCommentAreaChange(isInput: boolean) {
    // check if character is inserted, or just the cursor was moved
    const selection = window.getSelection();
    const parentElement = selection.anchorNode.parentNode as HTMLElement;
    const nextSibling =  selection.anchorNode.nextSibling as HTMLElement;

    const parentSpan = parentElement && this.isComment(parentElement);
    const siblingSpan = nextSibling && this.isComment(nextSibling);
    const range = selection.getRangeAt(0);
    if (parentSpan || siblingSpan) {
      if (isInput) {
        const allSpans = Array.from(document.querySelectorAll<HTMLSpanElement>('span[comment]'));
        let spanIndex = allSpans.indexOf(parentElement);

        const span = spanIndex < 0 ? nextSibling : parentElement;
        spanIndex = spanIndex < 0 ? allSpans.indexOf(nextSibling) : spanIndex;

        const shouldPreventEdit = range.startOffset == 0 || range.startOffset == parentElement.textContent.length; // borders of comment span
        if (shouldPreventEdit) {
          console.log('aha');
          parentElement.setAttribute('contenteditable', 'false');
          this.moveCaretOutsideSpan(parentElement, range.startOffset !== 0);
          this.contentEditableElement.focus();
          this.cursorSurroundingElement = parentElement;
        }
      }
    }
  }
}
