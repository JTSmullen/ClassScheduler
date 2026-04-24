import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSchedulePage } from './create-schedule-page';

describe('CreateSchedulePage', () => {
  let component: CreateSchedulePage;
  let fixture: ComponentFixture<CreateSchedulePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSchedulePage],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSchedulePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
