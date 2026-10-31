import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtratolistComponent } from './extratolist.component';

describe('ExtratolistComponent', () => {
  let component: ExtratolistComponent;
  let fixture: ComponentFixture<ExtratolistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtratolistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtratolistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
