import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaidaslistComponent } from './saidaslist.component';

describe('SaidaslistComponent', () => {
  let component: SaidaslistComponent;
  let fixture: ComponentFixture<SaidaslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaidaslistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaidaslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
