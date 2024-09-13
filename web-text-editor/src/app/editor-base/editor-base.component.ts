import { Component, Renderer2 } from '@angular/core';
import { SearchManager } from '../../assets/pkg/editor_wasm';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommentBox, TextRange } from '../types/comment.box';
import { range } from 'rxjs';

@Component({
  selector: 'app-editor-base',
  standalone: true,
  templateUrl: './editor-base.component.html',
  styleUrls: ['./editor-base.component.css'],
  imports: [CommonModule, FormsModule]
})
export class EditorBaseComponent {
  searchManager!: SearchManager;

  isBold: boolean = false;    // Track whether bold mode is active or not
  isItalic: boolean = false;  // Track whether italic mode is active or not

  searchTerm: string = '';  // Term to find
  replacement: string = '';  // Term to replace with
  isModalOpen: boolean = false;  // Controls Find/Replace modal

  scale: number = 3; // 2-7 DOM scale
  fontSize: string = '14px'; // Default font size
  fontFamily: string = 'Arial'; // Default font family
  fontSizeMap: { [key: number]: string } = {
    2: '12px',
    3: '14px',
    4: '16px',
    5: '18px',
    6: '20px',
    7: '22px'
  };

  isTextSelected: boolean = false;          // Tracks if any text is selected
  selectedText: string = '';         // Stores the selected text
  selectedRange: TextRange = {start:0 , end: 0};  // Stores the selected text range
  isExistingComment: boolean = false;       // Flag to check if selected text has a comment
  showFloatingToolbar: boolean = false;     // Control for floating toolbar visibility
  toolbarPosition = { top: 0, left: 0 };    // Position of the floating toolbar
  isCommentPopupOpen: boolean = false;      // Control for the comment popup
  newCommentText: string = '';              // Holds new comment input
  commentBoxes: CommentBox[] = [];  // List of comment threads

  nearestCommentSpan: HTMLElement | null = null;

  content: string = '';       // Store the editor's content

  constructor(private renderer: Renderer2) {}

  updateEditor() {
    const editor = document.querySelector('.editor') as HTMLElement;
    editor.innerHTML = this.content;
  }

  toggleBold() {
    this.isBold = !this.isBold; 
    document.execCommand('bold', false, '');
    this.restoreCaretFocus();
  }

  toggleItalic() {
    this.isItalic = !this.isItalic;
    document.execCommand('italic', false, '');
    this.restoreCaretFocus();
  }

  // Ensure the editor stays focused and the caret remains in the same position
  restoreCaretFocus() {
    const editor = document.querySelector('.editor') as HTMLElement;
    editor.focus();
  }

  // Check if the caret is inside bold or italic text and update the buttfon states
  checkTextState() {
    const selection = window.getSelection();
    const parentElement = selection?.anchorNode?.parentElement;
    if (parentElement) {
      // Check for bold state (inside <b>)
      this.isBold = parentElement.closest('b') !== null;
      
    //  console.log(this.getTextNodeAtPosition(parentElement, this.se))
      // turn off bold if text is deleted
      if (!this.isBold && document.queryCommandState('bold')) {
        document.execCommand('bold', false, '');
      }
      // Check for italic state (inside <i>)
      this.isItalic = parentElement.closest('i') !== null;

      // turn off italic if text is deleted
      if (!this.isItalic && document.queryCommandState('italic')) {
        document.execCommand('italic', false, '');
      }

      if (this.nearestCommentSpan) {
        this.nearestCommentSpan.setAttribute('contenteditable', 'true');
        this.nearestCommentSpan = null;
      }

    } else {
      this.isBold = false;
      this.isItalic = false;
    }
  }

  // HELPER
  handleSpanDeletion(span: HTMLElement, isBackspace: boolean): void {
    // Replace the span with its content and a zero-width space to ensure the caret moves out
    const zeroWidthSpace = document.createTextNode('\u200B');
    span.replaceWith(...Array.from(span.childNodes), zeroWidthSpace);  // Replace the span with its contents

    // Move the caret to after the zero-width space
    const range = document.createRange();

    const previousNode = zeroWidthSpace.previousSibling;
    if (isBackspace && previousNode) {
        range.setStart(previousNode, 1);  // Shift cursor one position to reset the backspace
    }
    else {
      if (previousNode) {
        range.setStart(previousNode, 0);  // Keep the cursor at the same position
      } 
    }
    
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    console.log('Deleted span with comment attribute');
  }


    // Helper function to get the text node at a certain position, considering only text nodes
  getTextNodeAtPosition(parent: HTMLElement, offset: number) {
    let currentOffset = 0;

    const treeWalker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,  // Only consider text nodes
      null
    );

    let node: Text | null;
    while ((node = treeWalker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;

      // Check if the offset falls within the current node's text content
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


  // Check if text is selected, show the floating toolbar, and highlight commented text
  checkTextSelection() {
    const editor = document.querySelector('.editor') as HTMLElement;
    this.selectedRange = this.getSelectedPositionAbs();
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const parentElement = selection.anchorNode?.parentElement;
      const range = selection.getRangeAt(0);
      this.isTextSelected = true;
      this.selectedText = selection.toString();
      const startNode = this.getTextNodeAtPosition(editor, this.selectedRange.start);
      const endNode = this.getTextNodeAtPosition(editor, this.selectedRange.end);

      // Check if the selected range overlaps or is inside any existing commented range
      this.isExistingComment = startNode?.node.parentElement?.getAttribute('comment') !== null || 
        endNode?.node.parentElement?.getAttribute('comment') !== null;
         
      // Get bounding rect to position floating toolbar
      const rect = range.getBoundingClientRect();
      this.toolbarPosition = { top: rect.top - 40, left: rect.left };

      // Show floating toolbar
      this.showFloatingToolbar = true;
    } else {
      this.isTextSelected = false;
      this.showFloatingToolbar = false;
    }
  }

  getSelectedPositionAbs(): { start: number, end: number } {
    let start = 0;
    let end = 0;
    let charCount = 0;
    
    const selection = window.getSelection();
    const editor = document.querySelector('.editor') as HTMLElement;
  
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      
      const treeWalker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT, // Only show text nodes
        null
      );
  
      let node: Text | null;
      while ((node = treeWalker.nextNode() as Text)) {
        const nodeLength = node.textContent?.length || 0;
  
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
    }
  
    return { start, end };
  }
  

  // Updated isSubRange method to check based on absolute offsets
  isSubRange(selectedRange: TextRange, existingRange: TextRange): boolean {
    return (selectedRange.start >= existingRange.start && selectedRange.start <= existingRange.end) || 
           (selectedRange.end >= existingRange.start && selectedRange.end <= existingRange.end);
  }

  // Open the comment popup
  openCommentPopup() {
    this.isCommentPopupOpen = true;
    this.showFloatingToolbar = false;  // Hide toolbar when popup is open
  }

  setCaretAtPosition(editor: HTMLElement, charPos: number) {
    const range = document.createRange();
    const selection = window.getSelection();
  
    // Get the text node and offset within the node for the specific global character position
    const nodeInfo = this.getTextNodeAtPosition(editor, charPos);
  
    if (nodeInfo) {
      // Set the range to collapse at the desired position
      range.setStart(nodeInfo.node, charPos - nodeInfo.startOffset);
      range.collapse(true);  // Collapse the range to a single point (just the cursor)
  
      // Clear existing selections and apply the new range
      selection?.removeAllRanges();
      selection?.addRange(range);
  
      // Ensure the editor is focused
      editor.focus();
    } else {
      console.error('Failed to set caret position');
    }
  }

  // Save the comment and highlight the selected text
  saveComment() {
    // TODO: izmeniti kako se cuva comment thread
    if (this.newCommentText) {
      // Add comment to the list
      let { start, end } = this.selectedRange;
      console.log(start, end);
      this.commentBoxes.push(new CommentBox(
        start, 
        end,
        this.newCommentText
      ));

      this.commentBoxes.sort((a, b) => a.selectionRange.start - b.selectionRange.start);


      // Highlight the commented text
      this.highlightSelectedText();
      this.closeCommentPopup();

      this.setCaretAtPosition(document.querySelector('.editor') as HTMLElement, end);
    }
  }

  highlightSelectedText() {
    const editor = document.querySelector('.editor') as HTMLElement;
    let range = document.createRange();
    
    let {start, end} = this.selectedRange;
    // Get the text node and offsets for start and end
    let startNodeInfo = this.getTextNodeAtPosition(editor, start);
    let endNodeInfo = this.getTextNodeAtPosition(editor, end);
    
    if (startNodeInfo && endNodeInfo) {
      // Set the range from the start and end offsets
      console.log(startNodeInfo.startOffset, endNodeInfo.startOffset);
      range.setStart(startNodeInfo.node, start - startNodeInfo.startOffset);
      range.setEnd(endNodeInfo.node, end - endNodeInfo.startOffset);
  
      const span = document.createElement('span');
      span.style.backgroundColor = '#f0f0f0';
      span.style.borderRadius = '4px';
      span.textContent = range.toString();
      span.setAttribute('comment', 'true');
      
      range.deleteContents();
      range.insertNode(span); 
    } 

  }

  // crutch solution
  moveCaretAfterSpan(span: HTMLElement) {
    const range = document.createRange();
    const selection = window.getSelection();
  
    // Check if there is a next sibling to place the caret at the start of
    if (span.nextSibling && span.nextSibling.textContent?.length) {
      range.setStart(span.nextSibling, 1); // Move caret to the start of the next sibling
    } else if (span.parentNode) {
      // If no sibling, move the caret to the end of the parent element
      const separatorSpan = document.createElement('span');
      separatorSpan.innerHTML = '&nbsp'; // Use CSS to hide this
      span.parentNode.insertBefore(separatorSpan, span.nextSibling);
      range.setStartAfter(separatorSpan);
    }
  
    range.collapse(true);  // Collapse the range to ensure caret placement
  
    // Clear any previous selection and set the new range
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  
  // Close the comment popup
  closeCommentPopup() {
    this.isCommentPopupOpen = false;
    this.newCommentText = '';
  }

  // Add a reply to a specific comment thread
  addReply(commentBoxIndex: number) {
    const commentBox = this.commentBoxes[commentBoxIndex];
    if (commentBox.newReply.trim() !== '') {
      commentBox.comments.push(commentBox.newReply);  // Add reply to the comments array
      commentBox.newReply = '';  // Clear the input field
    }
  }

  // Focus on the comment in the panel
  goToComment() {
    // TODO: izmeniti pretragu
    const commentBox = this.commentBoxes.find(box => this.isSubRange(this.selectedRange, box.selectionRange));
    if (commentBox) {
      console.log('koji k');
      const boxIndex = this.commentBoxes.indexOf(commentBox);
      console.log(boxIndex);
      const commentBoxElement = document.getElementById('comment-' + boxIndex);
      if (commentBoxElement) {
        commentBoxElement.scrollIntoView({ behavior: 'smooth' });
      }
    } 
    
    this.showFloatingToolbar = false;
  }
  updateFontIndicator() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer.parentElement;

      if (node) {
        // Check if the parent node is a <font> tag
        const fontTag = node.closest('font');
        if (fontTag) {
          const size = parseInt(fontTag.getAttribute('size')!);
          if (size >= 2 && size <= 7) {
            if (size != this.scale)
              document.execCommand('fontName', false, size.toString()); // font size changed
            this.scale = size; 
            this.fontSize = this.fontSizeMap[size];
          }
          const face = fontTag.getAttribute('face');
          if (face) {
            if (face !== this.fontFamily) 
              document.execCommand('fontName', false, face); // font changed
            this.fontFamily = face;
            const fontSelect = document.getElementById('fontSelect') as HTMLSelectElement;
            fontSelect.value = face;
          }

        }
      }
    }
  }

  // Handle input events to update the content
  onInput(event: Event) {
    const target = event.target as HTMLElement;
    this.content = target.innerHTML;  // Capture the current inner HTML content
    console.log('Current content:', this.content);
  }

  openFindReplaceModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  replaceAll() {
    this.searchManager.set_content(this.content);
    const updatedContent = this.searchManager.find_and_replace(this.searchTerm, this.replacement);
    this.content = updatedContent;  
    
    this.updateEditor()
    this.closeModal();  // Close the modal after text replacement
  }

  // Change the font family based on user selection
  changeFont(event: Event) {
    const selectedFont = (event.target as HTMLSelectElement).value;
    this.fontFamily = selectedFont;
    document.execCommand('fontName', false, selectedFont);  // Change the font
    this.restoreCaretFocus();
  }

  increaseFontSize() {
    if (this.scale < 7) {
      this.scale += 1;
    }
    this.applyFontSize();  
  }

  decreaseFontSize() {
    if (this.scale > 2) {
      this.scale -= 1;
    }
    this.applyFontSize();  
  }

  // Apply the correct font size after increasing or decreasing
  applyFontSize() {
    this.fontSize = this.fontSizeMap[this.scale];
    document.execCommand('fontSize', false, this.scale.toString());
    this.restoreCaretFocus();  // Restore caret focus after applying font size
  }

  getSelectionParentElement(): HTMLElement | undefined {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return selection.anchorNode?.parentNode as HTMLElement;
    }
    return undefined
  }

  getCurrentRange(): Range | undefined {
    return window.getSelection()?.getRangeAt(0);
  }

  processCommentDeletion(isBackspace: boolean) {

    // TODO: azurirati indekse komentara
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = selection.anchorNode?.parentNode as HTMLElement;
      const nextSibling =  selection.anchorNode?.nextSibling as HTMLElement;

      const parentSpan = parentElement && parentElement?.tagName?.toLowerCase() === 'span' && parentElement?.hasAttribute('comment');
      const siblingSpan = nextSibling && nextSibling?.tagName?.toLowerCase() === 'span' && nextSibling?.hasAttribute('comment');
      // Check if the caret is inside a span with the 'comment' attribute
      if (parentSpan || siblingSpan) {

        const allSpans = Array.from(document.querySelectorAll<HTMLSpanElement>('span[comment]'));          
        let spanIndex = allSpans.indexOf(parentElement);

        const span = spanIndex < 0 ? nextSibling : parentElement;
        spanIndex = spanIndex < 0 ? allSpans.indexOf(nextSibling) : spanIndex; 

        // Check if it's the last character in the span
        const spanContentLength = span.textContent?.length || 0;

        // For Backspace: Check if the caret is at the start (deleting the last character)
        if (spanContentLength === 1) {
          this.handleSpanDeletion(span, isBackspace);
          this.commentBoxes.splice(spanIndex, 1);
        } 
      }
    }
  }

  
  checkCommentAreaChange(isInput: boolean) {
    // check if character is inserted, or just the cursor was moved
    const parentElement = this.getSelectionParentElement();
    const range = this.getCurrentRange();
    if (parentElement && this.isComment(parentElement)) {
      if (isInput) {
        const shouldPreventEdit = range?.startOffset == 0 || range?.startOffset == parentElement.textContent?.length; // borders of comment span
        if (shouldPreventEdit) {
          parentElement.setAttribute('contenteditable', 'false');
          this.moveCaretOutsideSpan(parentElement, range?.startOffset !== 0);
          const editor = document.querySelector('.editor') as HTMLElement;
          editor.focus();
          this.nearestCommentSpan = parentElement;
        } else {
          // TODO: azurirati indekse komentara
        }    
      } 
    }
  }



  isComment(element: HTMLElement | undefined): boolean {
    if (!element) 
      return false;

    return element.tagName.toLowerCase() === 'span' && element.hasAttribute('comment');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.processCommentDeletion(event.key === 'Backspace');
    } else {
      this.checkCommentAreaChange(event.key != 'ArrowLeft' && event.key != 'ArrowRight'); // check for possible character input that affects commented text
    } 
  }

  moveCaretOutsideSpan(span: HTMLElement, moveAfter: boolean) {
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
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  // Attach listeners for caret position changes
  async ngOnInit() {
    const editor = document.querySelector('.editor') as HTMLElement;

    this.renderer.listen(editor, 'keyup', () => {
      this.checkTextState();
      this.updateFontIndicator();
      this.checkTextSelection();
    });
    this.renderer.listen(editor, 'mouseup', () => {
      this.checkTextState();
      this.updateFontIndicator();
      this.checkTextSelection();
    });

    // Initialize font and font size;
    editor.focus();
    document.execCommand('fontSize', false, this.scale.toString());
    document.execCommand('fontName', false, this.fontFamily);

    try {
      const wasmModule = await import('../../assets/pkg/editor_wasm.js');
      
      // Initialize the Wasm module by loading the .wasm file
      const wasm = await wasmModule.default({
        module_or_path: 'assets/pkg/editor_wasm_bg.wasm'
      });
      
      this.searchManager = SearchManager.new(this.content);
    } catch (err) {
      console.error("Failed to load Wasm module", err);
    }
  }
}
