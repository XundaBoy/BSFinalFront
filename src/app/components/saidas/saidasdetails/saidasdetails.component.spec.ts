import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaidasdetailsComponent } from './saidasdetails.component';

describe('SaidasdetailsComponent', () => {
  let component: SaidasdetailsComponent;
  let fixture: ComponentFixture<SaidasdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaidasdetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaidasdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
