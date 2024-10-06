import { Component, HostListener, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Editor } from '../core/impl/editor';
import { InlineStyle } from '../impl/commands/InlineStyle';
import { UndoRedoManager } from '../impl/UndoRedoManager';
import { Find } from '../impl/commands/find';
import { ReplaceAll } from '../impl/commands/replaceall';
import { Replace } from '../impl/commands/replace';
import { Comment } from '../impl/commands/comment';
import { CommentHandler } from '../impl/CommentHandler';
import { CommentContainer } from '../types/CommentContainer';
import { Reply } from '../impl/commands/reply';
import { EventCore } from '../core/impl/EventCore';
import { LoadWasm } from '../core/impl/WasmLoader';
import { StyleHandler } from '../impl/StyleHandler';
import { Router } from '@angular/router';
import { CommonService } from '../services/common.service';

@Component({
  selector: 'app-editor-base',
  standalone: true,
  templateUrl: './editor-base.component.html',
  styleUrls: ['./editor-base.component.css'],
  imports: [CommonModule, FormsModule]
})
export class EditorBaseComponent {

  isBold: boolean = false;    // Track whether bold mode is active or not
  isItalic: boolean = false;  // Track whether italic mode is active or not
  isUnderline: boolean = false;
  editor: Editor;

  wordToFind: string = '';
  searchTerm: string = '';  // Term to find
  replacement: string = '';  // Term to replace with
  isModalOpen: boolean = false;  // Controls Find/Replace modal

  scale: string = '3'; // 2-7 DOM scale
  fontSize: string = '14px'; // Default font size
  fontFamily: string = 'Arial'; // Default font family
  fontSizeMap: { [key: string]: string } = {
    '12': '2',
    '14': '3',
    '16': '4',
    '18': '5',
    '20': '6',
    '22': '7'
  };

  loginUsername: string;
  loginPassword: string;
  loginErrorMessage: string = "";

  welcomeMessage: string = "";

  showDocuments: boolean = false;

  isGuestState: boolean = sessionStorage.getItem('username') == null;

  files: string[] = [];

  isExistingComment: boolean = false;       // Flag to check if selected text has a comment
  showFloatingToolbar: boolean = false;     // Position of the floating toolbar
  isCommentPopupOpen: boolean = false;      // Control for the comment popup
  newCommentText: string = '';              // Holds new comment input

  newReply: string = '';

  commentContainers: CommentContainer[];

  shareAddress: string = "";
  newDocname: string = "";

  showToolbar: boolean = false;
  isShareOpen: boolean = false;
  isSaveOpen: boolean = false;
  isCreateOpen: boolean = false;
  isDocumentSaved: boolean = false;

  toolbarPosition: { left: string; top: string } = { left: '0px', top: '0px' };

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    this.hideToolbar();
  }

  toggleDocuments() {
    this.showDocuments = !this.showDocuments;
  }

  hideToolbar() {
    console.log('bb');
    this.showToolbar = false;
  }

  openLogin() {
    document.getElementById('login-modal').classList.add('modal-open');
  }

  closeLogin() {
    document.getElementById('login-modal').classList.remove('modal-open');
  }

  openRegister() {
    document.getElementById('register-modal').classList.add('modal-open');
  }

  closeRegister() {
    document.getElementById('register-modal').classList.remove('modal-open');
  }

  promptSave() {
    if (this.isGuestState) {
      return;
    }
    if (!sessionStorage.getItem('docname')) {
      this.isSaveOpen = true;
    } else {
      this.saveDocument();
    }
  }

  closeSave() {
    this.isSaveOpen = false;
  }

  closeCreate() {
    this.isCreateOpen = false;
    this.create();
  }

  closeAndCreate() {
    this.isCreateOpen = false;
    this.create();
  }

  saveDocument() {
    if (this.isGuestState) {
      return;
    }
    this.isDocumentSaved = true;
    if (this.newDocname) {
      sessionStorage.setItem('docname', this.newDocname);
      this.newDocname = '';
    }

    this.commonService.saveDocument(sessionStorage.getItem('docname'));
  }

  saveAndCreate() {
    this.isCreateOpen = false;
    this.promptSave();
    this.create();
  }

  create() {
    sessionStorage.removeItem('docname');
    sessionStorage.removeItem('owner');
    sessionStorage.removeItem('doctype');

    StyleHandler.getInstance().clear();
    CommentHandler.getInstance().clear();
    this.editor.clear();
    this.router.navigate(['']);
  }

  createDocument() {
    if (this.isGuestState) {
      return;
    }
    if (!this.isDocumentSaved) {
      this.isCreateOpen = true;
    }
    // TODO
    // ask for saving
  }

  shareDocument() {
    if (this.isGuestState) {
      return;
    }
    this.isShareOpen = true;
  }

  closeShare() {
    this.isShareOpen = false;
  }

  share() {
    console.log(this.shareAddress);
    this.commonService.shareDocument(this.shareAddress).subscribe({
      next: (response) => {},
      error: (err) => {
        console.log(err);
      }
    })
  }

  openFile(document: string) {
    console.log(document);
    this.commonService.getDocument(document).subscribe({
      next: (response: any) => {
        this.editor.setRawContent(response.content);
        sessionStorage.setItem('docname', response.name);
        sessionStorage.setItem('owner', response.owner);
        sessionStorage.setItem('doctype', response.doctype);
        console.log(response.comments);
        CommentHandler.getInstance().parseComments(response.comments);

      },
      error: (err) => {
        if (err.status === 400) {
          alert("No document found!");
        }
        else if (err.status === 500) {
          console.log(err);
        }
      }
    })
    this.showDocuments = false;
  }

  logout() {
    sessionStorage.clear();
    this.isGuestState = true;
    this.router.navigate(['']);
  }

  login() {
    // TODO: sacuvati username i nazive svih dokumenata u sessionStorage
    this.commonService.login(this.loginUsername, this.loginPassword).subscribe({
      next: (response: any) => {
        console.log(response);
        sessionStorage.setItem('username', response.username);
        for (let i = 0; i < response.documents.length; i++) {
          this.files.push(response.documents[i].name);
        }
        sessionStorage.setItem('documents', this.files.join(", "));

        this.isGuestState = false;
        this.closeLogin();
      },
      error: (error) => {
        if (error.status === 400) {
          this.loginErrorMessage = "Invalid username or password";
        }
        else if (error.status === 500) {
          this.loginErrorMessage = "Unexpected error";
        }
        else {
          this.loginErrorMessage = "";
        }
      }
    });
  }

  updateToolbarPosition(event: MouseEvent) {
    const offset = 0;
    if (isNaN(event.clientX) || isNaN(event.clientY)) {
      this.showToolbar = false;
      return;
    }
    this.toolbarPosition = {
      left: `${event.clientX + offset}px`,
      top: `${event.clientY - offset}px`
    };
    this.showToolbar = true;
  }

  content: string = '';       // Store the editor's content

  constructor(private router: Router, private commonService: CommonService, private renderer: Renderer2) {}

  updateEditor() {
    const editor = document.querySelector('.editor') as HTMLElement;
    editor.innerHTML = this.content;
  }

  toggleBold() {
    new InlineStyle('bold').execute();
  }

  toggleItalic() {
    new InlineStyle('italic').execute();
  }

  toggleUnderline() {
    new InlineStyle('underline').execute();
  }

  // Ensure the editor stays focused and the caret remains in the same position
  restoreCaretFocus() {
    const editor = document.querySelector('.editor') as HTMLElement;
    editor.focus();
  }

  undo() {
    UndoRedoManager.getInstance().undo();
  }

  redo() {
    UndoRedoManager.getInstance().redo();
  }

  // Open the comment popup
  openCommentPopup() {
    this.isCommentPopupOpen = true;
    setTimeout(() => {
      const input = document.querySelector('.temporary-comment .reply-input') as HTMLInputElement;
      input?.focus(); // Auto-focus on the new comment box
    }, 100);
  }

  // Save the comment and highlight the selected text
  saveComment() {
    const commentCommand = new Comment(this.newCommentText);
    commentCommand.execute();
    this.closeCommentPopup();
  }


  // Close the comment popup
  closeCommentPopup() {
    this.isCommentPopupOpen = false;
    this.newCommentText = '';
  }

  // Add a reply to a specific comment thread
  addReply(commentID: number) {
    const replyCommand = new Reply(commentID, this.newReply);
    replyCommand.execute();
    this.newReply = '';
  }

  // Focus on the comment in the panel
  goToComment() {
    const commentID = CommentHandler.getInstance().findSelectedComment();
    const index = this.commentContainers.findIndex(comment => comment.getID() == commentID);
    if (index != -1) {
      const commentBox = document.getElementById(`comment-${index}`);
      if (commentBox) {
        console.log(commentBox);
        commentBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightCommentBox(commentBox);
      }
    }

  }
  highlightCommentBox(commentBox: HTMLElement) {
    // Remove any existing highlight
    const previouslyHighlighted = document.querySelector('.highlight');
    if (previouslyHighlighted) {
      previouslyHighlighted.classList.remove('highlight');
    }

    // Add the highlight class
    commentBox.classList.add('highlight');

    // Optional: Remove highlight after a few seconds
    setTimeout(() => {
      commentBox.classList.remove('highlight');
    }, 3000); // Adjust time as needed
  }


  /*updateFontIndicator() {
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
  }*/

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

  findNext() {
    const findCommand = new Find(this.searchTerm);
    if (!findCommand.execute()) {
      console.log('No found occurences');
    }
  }

  replace() {
    const replaceCommand = new Replace(this.searchTerm, this.replacement);
    replaceCommand.execute();
  }


  replaceAll() {
    new ReplaceAll(this.searchTerm, this.replacement).execute();
  }

  // Change the font family based on user selection
  changeFont(event: Event) {
    console.log('wftf');
    const selectedFont = (event.target as HTMLSelectElement).value;
    this.fontFamily = selectedFont;
    document.execCommand('fontName', false, selectedFont);  // Change the font
    this.restoreCaretFocus();
  }



  changeFontSize(event) {
    this.fontSize = (event.target as HTMLSelectElement).value;
    this.applyFontSize();
  }

  // Apply the correct font size after increasing or decreasing
  applyFontSize() {
    this.scale = this.fontSizeMap[this.fontSize];
    document.execCommand('fontSize', false, this.scale);
    this.restoreCaretFocus();  // Restore caret focus after applying font size
  }


  // Attach listeners for caret position changes
  ngOnInit() {
    EventCore.initializeCoreEvents();
    this.editor = Editor.getInstance();

    const commentHandler = CommentHandler.getInstance();
    commentHandler.subscribeForCommentThreads((comments: CommentContainer[]) => {
      this.commentContainers = comments;
    });

    this.files = sessionStorage.getItem('documents')?.split(", ") || [];
    this.welcomeMessage = "Hello, " + sessionStorage.getItem('username');

    commentHandler.subscribeCommentState((commentExists: boolean) => {
      this.isExistingComment = commentExists;
    });

    const styleHandler = StyleHandler.getInstance();
    styleHandler.subscribeStyleState((states) => {
      this.isBold = states.bold;
      this.isItalic = states.italic;
      this.isUnderline = states.underline;
    });

    const editor = document.querySelector('.editor') as HTMLElement;

    this.renderer.listen(editor, 'mouseup', (event) => {
      const selRange = this.editor.getPreviousRange();
      if (selRange.end > selRange.start) {
        this.updateToolbarPosition(event);
      }
    });

    // Initialize font and font size;
    editor.focus();
    document.execCommand('fontSize', false, this.scale);
    document.execCommand('fontName', false, this.fontFamily);

    LoadWasm();
  }
}
