import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradasdetailsComponent } from './entradasdetails.component';

describe('EntradasdetailsComponent', () => {
  let component: EntradasdetailsComponent;
  let fixture: ComponentFixture<EntradasdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntradasdetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntradasdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
