import { Component, Renderer2 } from '@angular/core';
import { SearchManager } from '../../assets/pkg/editor_wasm';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommentBox, TextRange } from '../types/comment.box';

import * as $ from 'jquery';
import { connect } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';

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

  wordToFind: string = '';
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

  foundWords: number[] = [];
  foundWordRangeStart: number = -1;

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

        // writing after or before comment (you can only write inside it, or use find/replace dialog)
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
      this.isExistingComment = this.commentBoxes.some(box => this.isSubRange(this.selectedRange, box.selectionRange));
         
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

  undo() {

  }

  redo() {

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
    if (this.newCommentText) {
      // Add comment to the list
      let { start, end } = this.selectedRange;
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
      // ovde
    }
  }

  highlightSelectedText() {
    const editor = document.querySelector('.editor') as HTMLElement;
    let range = document.createRange();

    if (this.setRangeNodesForPosition(editor, this.selectedRange,  range)) {
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
  // probably useless function
  moveCaretAfterSpan(span: HTMLElement) {
    const range = document.createRange();
    const selection = window.getSelection();
  
    // Check if there is a next sibling to place the caret at the start of
    if (span.nextSibling && span.nextSibling.textContent?.length) {
      range.setStart(span.nextSibling, 1); // Move caret to the start of the next sibling
    } else if (span.parentNode) {
      // If no sibling, move the caret to the end of the parent element
      const separatorSpan = document.createElement('span');
      separatorSpan.innerHTML = '&nbsp'; // Use CSS to hide thiskey
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
    const commentBox = this.commentBoxes.find(box => this.isSubRange(this.selectedRange, box.selectionRange));
    if (commentBox) {
      const boxIndex = this.commentBoxes.indexOf(commentBox);
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
    this.selectedRange = this.getSelectedPositionAbs();
  }

  setRangeNodesForPosition(element: HTMLElement | null, textRange: TextRange, range: Range): boolean {
    if (!element)
      return false;

    const startNodeInfo = this.getTextNodeAtPosition(element, textRange.start);
    const endNodeInfo = this.getTextNodeAtPosition(element, textRange.end);

    if (!startNodeInfo || !endNodeInfo)
      return false;

    range.setStart(startNodeInfo.node, textRange.start - startNodeInfo.startOffset);
    range.setEnd(endNodeInfo.node, textRange.end - endNodeInfo.startOffset);
    return true;
  }

  closeModal() {
    const editor = document.querySelector('.editor') as HTMLElement;
    this.isModalOpen = false;

    let range = document.createRange();
    if (this.setRangeNodesForPosition(editor, this.selectedRange, range)) {
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.focus();
    }

    this.foundWords = [];
    this.foundWordRangeStart = -1;
    this.searchTerm = '';
    this.wordToFind = '';
    this.replacement = '';
  }

  highlightRange(start: number, end: number) {
    const editor = document.querySelector('.editor') as HTMLElement;
    const range = document.createRange();

    if (this.setRangeNodesForPosition(editor, {start: start, end: end}, range)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();  // Clear previous selections
      selection?.addRange(range);  // Highlight the range

      editor.focus();  
    }
  }

  isValidSearch(startIndex: number, endIndex: number): boolean {

    if (this.commentBoxes.length == 0) 
      return true;

    let foundComments = this.commentBoxes.filter(comm => {
      return (startIndex >= comm.selectionRange.start && startIndex <= comm.selectionRange.end)
      || (endIndex >= comm.selectionRange.start && endIndex <= comm.selectionRange.end);
    })

    if (foundComments.length > 1) {
      return false;
    }

    if (foundComments.length == 0) {
      return true;
    }    
    const comm = foundComments[0];

    return startIndex >= comm.selectionRange.start && endIndex <= comm.selectionRange.end; 
  }

  findNext() {
    const editor = document.querySelector('.editor') as HTMLElement;

    if (this.searchTerm !== this.wordToFind) {
      this.foundWords = [];
    }
    this.wordToFind = this.searchTerm;
    if (!this.foundWords.length) {
      this.searchManager.set_content(editor.innerText);
      this.foundWords = Array.from(this.searchManager.find_all(this.wordToFind));
    }
    if (this.foundWords.length) {
      this.foundWords = this.foundWords.filter(startIndex => {
        return this.isValidSearch(startIndex, startIndex + this.wordToFind.length);
      });

      if (!this.foundWords.length) {
        return;
      }
      this.foundWordRangeStart = this.foundWords.shift()!;
      this.foundWords.push(this.foundWordRangeStart);

      this.selectedRange = {start: this.foundWordRangeStart, end: this.foundWordRangeStart + this.wordToFind.length};
      this.highlightRange(this.selectedRange.start, this.selectedRange.end);
    }

  }

  replace() {
    // For now, don't allow empty replacement word
    if (!this.replacement.length) {
      return;
    }
    const editor = document.querySelector('.editor') as HTMLElement;

    if (this.searchTerm !== this.wordToFind) {
      this.foundWords = [];
    }
    this.wordToFind = this.searchTerm;
    if (!this.foundWords.length) {
      this.searchManager.set_content(editor.innerText);
      this.foundWords = Array.from(this.searchManager.find_all(this.wordToFind));
      if (!this.foundWords.length)
        return;
    }

    this.foundWords = this.foundWords.filter(startIndex => {
      return this.isValidSearch(startIndex, startIndex + this.wordToFind.length);
    });

    if (!this.foundWords.length) {
      return;
    }

    if (this.foundWordRangeStart == -1) {
      this.foundWordRangeStart = this.foundWords.shift()!; // replace the next word that matches searched word
    } else {
      this.foundWords.pop(); // replace found word (after click on 'Find next')
    }
    
    this.selectedRange = {start: this.foundWordRangeStart, end: this.foundWordRangeStart + this.replacement.length};
    
    const shiftAmount = this.replacement.length - this.wordToFind.length;
    this.replaceWordAndShiftSpaces(editor, this.selectedRange.start, this.selectedRange.start + this.wordToFind.length, this.replacement);

    this.searchManager.set_content(editor.innerText);
    this.foundWords.forEach((value, index, array) => {
      if (array[index] > this.foundWordRangeStart) 
        array[index] += shiftAmount;  
    });
    // ovde
    this.foundWordRangeStart = -1;
  }
  

  replaceAll() {
    this.searchManager.set_content(this.content);
    const updatedContent = this.searchManager.replace_all(this.searchTerm, this.replacement);
    this.content = updatedContent;  

    this.updateEditor()
  }

    // Replace word considering both text and HTML elements
  replaceWordAndShiftSpaces(editor: HTMLElement, start: number, end: number, replacement: string) {

    let range = document.createRange();

    const comment = this.commentBoxes.filter(comm => {
      return start >= comm.selectionRange.start && end <= comm.selectionRange.end;
    }) 

    let startIndex = start, endIndex = end;
    if (comment.length > 0) {
      startIndex = comment[0].selectionRange.start;
      endIndex = comment[0].selectionRange.end;
    }

    if (this.setRangeNodesForPosition(editor, {start: startIndex, end: endIndex}, range)) {
      const shiftAmount = replacement.length - (end - start);

      const containerFragment = range.cloneContents();  

      const content = containerFragment.firstElementChild as HTMLElement;

      console.log(content);

      let newNode: Node | null;
      if (content) {
        if (!comment.length) {
          content.textContent = replacement;
        }
        else {
          let str = content.textContent;
          content.textContent = str?.substring(0, start - startIndex) + replacement + str?.substring(end - startIndex);
        }

        newNode = content;
      } else {
        newNode = document.createTextNode(replacement);
      }
      range.deleteContents();
      range.insertNode(newNode);
    
      // in case of empty spans (crutch solution)
      if (comment.length > 0) 
        editor.innerHTML = editor.innerHTML.replace(/<span\b[^>]*>\s*<\/span>/gi, '');

      this.shiftComments(shiftAmount, start, end);
    }
  }

  shiftComments (shiftAmount: number, start: number, end: number, force: boolean = false) {
    // TODO: ugly method
    this.commentBoxes.forEach((value, index, array) => {
      let startIndex = array[index].selectionRange.start;
      let endIndex = array[index].selectionRange.end;
      if (startIndex > start) {
        array[index].selectionRange.start += shiftAmount;
        array[index].selectionRange.end += shiftAmount;

        if (end > startIndex && end < endIndex) {
          array[index].selectionRange.start += (end - startIndex); // add back range lost due to deletion part of comment
        }
      } else if (startIndex == start) {
        array[index].selectionRange.end += shiftAmount;
        if (force) {
          array[index].selectionRange.start += shiftAmount;
        }
      } else {
        if (endIndex >= start) {
          array[index].selectionRange.end += shiftAmount;
        }
      }
    });
  }
  
  // Adds spaces after the given node or appends them if no sibling exists

  // Probably useless function
  addSpacesAfter(node: Node, shiftAmount: number, start: number, end: number) {
      const spaceText = ' '.repeat(shiftAmount);
      const spaceNode = document.createTextNode(spaceText);
  
      if (node.nextSibling) {
        // Insert spaces after the node if there's a next sibling
        node.parentNode?.insertBefore(spaceNode, node.nextSibling);
      } else {
          // Append spaces at the end if no sibling exists
        node.parentNode?.appendChild(spaceNode);
      }
      this.shiftComments(shiftAmount, start, end);
  }
  
  // Removes `shiftAmount` spaces from the given text node
  // Probably useless function
  removeSpacesFromNode(node: Node, shiftAmount: number, start: number, end: number) {
      const textContent = node.textContent || '';
      const spaceCount = (textContent.match(/ +$/)?.[0]?.length || 0); // Find trailing spaces
  
      if (spaceCount > 0) {
          // Remove `shiftAmount` spaces
        node.textContent = textContent.slice(0, textContent.length - Math.min(shiftAmount, spaceCount));
        this.shiftComments(shiftAmount, start, end);
      }
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

  removeAllSubrangeComments (selectedRange: TextRange) {
    this.commentBoxes = this.commentBoxes.filter(box => {
      return !(box.selectionRange.start >= selectedRange.start && box.selectionRange.end <= selectedRange.end);
    });
  }

  processSelectionIntersectingComments(selectedRange: TextRange) {
    this.removeAllSubrangeComments(selectedRange);
    const shiftAmount = selectedRange.end - selectedRange.start;
    this.shiftComments(-shiftAmount, selectedRange.start, selectedRange.end);
  } 

  processCommentDeletion(isBackspace: boolean, isRangeDeleted: boolean, selectedRange: TextRange) {
    if (isRangeDeleted) {
      this.processSelectionIntersectingComments(selectedRange);    
      return;
    } 
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
     //   this.shiftComments(-1, this.getCursorOnKeyDown(isBackspace));
        this.shiftComments(-1, selectedRange.start, selectedRange.end, isBackspace);
      }
    }
  }

  
  checkCommentAreaChange(isInput: boolean) {
    // check if character is inserted, or just the cursor was moved
    const selection = window.getSelection();
    const parentElement = selection?.anchorNode?.parentNode as HTMLElement;
    const nextSibling =  selection?.anchorNode?.nextSibling as HTMLElement;

    const parentSpan = parentElement && this.isComment(parentElement);
    const siblingSpan = nextSibling && this.isComment(nextSibling);
    const range = this.getCurrentRange();
    if (parentSpan || siblingSpan) {
      if (isInput) {
        const allSpans = Array.from(document.querySelectorAll<HTMLSpanElement>('span[comment]'));          
        let spanIndex = allSpans.indexOf(parentElement);

        const span = spanIndex < 0 ? nextSibling : parentElement;
        spanIndex = spanIndex < 0 ? allSpans.indexOf(nextSibling) : spanIndex; // TODO: I OVO SE PONAVLJA, SREDITI
        
        const shouldPreventEdit = range?.startOffset == 0 || range?.startOffset == parentElement.textContent?.length; // borders of comment span
        console.log(range?.startOffset);
        console.log(parentElement.textContent?.length);
        if (shouldPreventEdit) {
          parentElement.setAttribute('contenteditable', 'false');
          this.moveCaretOutsideSpan(parentElement, range?.startOffset !== 0);
          const editor = document.querySelector('.editor') as HTMLElement;
          editor.focus();
          this.nearestCommentSpan = parentElement;
        }     
      } 
    }
  }

  isComment(element: HTMLElement | undefined): boolean {
    if (!element) 
      return false;

    return element.tagName?.toLowerCase() === 'span' && element.hasAttribute('comment');
  }

  getCursorOnKeyDown(shift: boolean): number {
    let cursor = this.getSelectedPositionAbs().start;
    cursor = shift ? cursor - 1 : cursor;
    return cursor < 0 ? 0 : cursor; // in case of document beginning
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      // bilo je drugacije
      const selectedRange = this.getSelectedPositionAbs();
      const shiftAmount = selectedRange.end - selectedRange.start;
      this.shiftComments(1, selectedRange.start, selectedRange.end, true);
      document.execCommand('insertLineBreak');
      event.preventDefault();
      // ovde
    }
    else if (event.key === 'Backspace' || event.key === 'Delete') {
      const selectedRange = this.getSelectedPositionAbs();
      console.log(selectedRange);
      const isRangeDeleted = (selectedRange.end - selectedRange.start > 0);
      this.processCommentDeletion(event.key === 'Backspace', isRangeDeleted, selectedRange);
      // ovde
      // change comments position after delete  
    } 
    else {
      const noTextKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'CapsLock'];
      const isInput = !noTextKeys.includes(event.key);
      // check for possible character input that affects commented text, and shift subsequent comments anyway
      this.checkCommentAreaChange(isInput); 
      if (isInput) {
        //this.shiftComments(1, this.getCursorOnKeyDown(false), true);
        const selectedRange = this.getSelectedPositionAbs();
        this.shiftComments(1, selectedRange.start, selectedRange.end, true);
        // ovde
      }
    } 
    console.log(this.commentBoxes);
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
