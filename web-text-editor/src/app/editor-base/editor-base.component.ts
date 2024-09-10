import { Component, Renderer2 } from '@angular/core';
import { SearchManager } from '../../assets/pkg/editor_wasm';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommentBox, TextRange } from '../types/comment.box';

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
    editor.focus();  // Re-focus the editor
  }

  // Check if the caret is inside bold or italic text and update the button states
  checkTextState() {
    const selection = window.getSelection();
    const parentElement = selection?.anchorNode?.parentElement;
    if (parentElement) {
      // Check for bold state (inside <b>)
      this.isBold = parentElement.closest('b') !== null;

      // Check for italic state (inside <i>)
      this.isItalic = parentElement.closest('i') !== null;
    } else {
      this.isBold = false;
      this.isItalic = false;
    }
  }

  // Check if text is selected, show the floating toolbar, and highlight commented text
  checkTextSelection() {
    this.selectedRange = this.getSelectedPosition();
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const selectedRange = selection.getRangeAt(0);
      this.isTextSelected = true;
      this.selectedText = selection.toString();
      // Check if the selected range overlaps or is inside any existing commented range
      this.isExistingComment = this.commentBoxes.some((commBox) => this.isSubRange(this.selectedRange, commBox.selectionRange));

      // Get bounding rect to position floating toolbar
      const rect = selectedRange.getBoundingClientRect();
      this.toolbarPosition = { top: rect.top - 40, left: rect.left };

      // Show floating toolbar
      this.showFloatingToolbar = true;
    } else {
      this.isTextSelected = false;
      this.showFloatingToolbar = false;
    }
  }

  getSelectedPosition() : {start: number, end: number} {
    let position = {start: 0, end: 0};
    const selection = document.getSelection();

    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      /*let range2 = range.cloneRange();
      range2.selectNodeContents(editor);*/
      position.start = range.startOffset;
      position.end = range.endOffset;
    }
    return position;
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
      this.highlightSelectedText(); // trebace izmena jer izgleda ne radi
      this.closeCommentPopup();
    }
  }

  // Highlight commented text in the editor
  highlightSelectedText() {
    const editor = document.querySelector('.editor') as HTMLElement;
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Get the text node and offsets for start and end
    let startNode = this.getTextNodeAtPosition(editor, this.selectedRange.start);
    let endNode = this.getTextNodeAtPosition(editor, this.selectedRange.end);
    
    if (startNode && endNode) {
      // Set the range from the start and end offsets
      range.setStart(startNode.node, this.selectedRange.start - startNode.startOffset);
      range.setEnd(endNode.node, this.selectedRange.end - endNode.startOffset);
      
      const span = document.createElement('span');
      span.style.backgroundColor = '#f0f0f0';
      span.style.borderRadius = '4px';
      span.textContent = range.toString();
      
      range.deleteContents(); // Remove the selected content
      range.insertNode(span); // Insert the span with the highlighted style
    }
  }


    // Helper function to get the text node at a certain position
  getTextNodeAtPosition(parent: HTMLElement, offset: number) {
    let currentOffset = 0;

    const treeWalker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Text | null;
    while ((node = treeWalker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;

      // Check if the offset falls within the current node's text content
      if (currentOffset + nodeLength >= offset) {
        return {
          node,
          startOffset: currentOffset
        };
      }
      currentOffset += nodeLength;
    }

    return null;
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

  // Attach listeners for caret position changes
  async ngOnInit() {
    const editor = document.querySelector('.editor') as HTMLElement;
    // Listen to keyup and mouseup events and update bold/italic and font size and type
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
