import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradaslistComponent } from './entradaslist.component';

describe('EntradaslistComponent', () => {
  let component: EntradaslistComponent;
  let fixture: ComponentFixture<EntradaslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntradaslistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntradaslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
