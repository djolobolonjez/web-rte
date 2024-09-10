import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorBaseComponent } from './editor-base.component';

describe('EditorBaseComponent', () => {
  let component: EditorBaseComponent;
  let fixture: ComponentFixture<EditorBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorBaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
