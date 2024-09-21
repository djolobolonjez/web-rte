import { ICommand } from "../../api/commands/command";
import { TextRange } from "../../types/comment.box";
import { IReceiver } from "../interfaces/receiver";

export class Editor implements IReceiver {
  private contentEditableElement: HTMLElement;

  private static instance: Editor;

  private selectedRange: TextRange;

  private lastCommand: ICommand;

  private constructor() {
    this.contentEditableElement = document.querySelector('.editor') as HTMLElement;
    console.log(this.contentEditableElement);
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

  public updateContent(content: string) {
    this.contentEditableElement.innerHTML = content;
  }

  public setSelectionRange(selectedRange: TextRange): void {
    this.selectedRange = selectedRange;
  }

  public getPreviousRange(): TextRange {
    return this.selectedRange;
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

  public getSelectedRange(): Range | undefined {
    const selection = window.getSelection();
    return selection.getRangeAt(0);
  }

  public getSelectedPositionAbs(): TextRange {
    let start = 0;
    let end = 0;
    let charCount = 0;

    const range = this.getSelectedRange();

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

  public selectRange(selectedRange: TextRange) {
    const range = document.createRange();

    if (this.setRangeNodesForPosition(selectedRange, range)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();  // Clear previous selections
      selection?.addRange(range);  // Highlight the range
    }
  }

  public replaceSelectedContent(selectedRange: TextRange, replacement: string): void {
    const range = document.createRange();
    if (this.setRangeNodesForPosition(selectedRange, range)) {
      const containterFragment = range.cloneContents();
      const content = containterFragment.firstElementChild as HTMLElement;

      let newNode: Node | null;
      if (content) {
        // treba da se prilagodi komentarima
        content.textContent = replacement;
        newNode = content;
      } else {
        newNode = document.createTextNode(replacement);
      }

      range.deleteContents();
      range.insertNode(newNode);
    }
  }

  public replaceCommentWithPlainText(selectedRange: TextRange): void {
    const range = document.createRange();
    if (this.setRangeNodesForPosition(selectedRange, range)) {
      const containterFragment = range.cloneContents();
      const content = containterFragment.firstElementChild as HTMLElement;

      let node = document.createTextNode(content.textContent);
      range.deleteContents();
      range.insertNode(node);

      this.contentEditableElement.innerHTML = this.contentEditableElement.innerHTML.replace(/<span\b[^>]*>\s*<\/span>/gi, '');
    }
  }

  highlightCommentedArea(selectedRange: TextRange) {
    let range = document.createRange();

    if (this.setRangeNodesForPosition(selectedRange,  range)) {
      const span = document.createElement('span');
      span.style.backgroundColor = '#f0f0f0';
      span.style.borderRadius = '4px';
      span.textContent = range.toString();
      span.setAttribute('comment', 'true');

      range.deleteContents();
      range.insertNode(span);
    }
  }

  setCursorAtPosition(pos: number) {
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
}
