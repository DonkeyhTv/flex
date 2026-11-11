import { TestBed } from '@angular/core/testing';
import type { Desk, Office } from '../core/models';
import { deskStates } from './desk-state';
import { FloorPlan } from './floor-plan';

const desk = (id: string, x: number, extra: Partial<Desk> = {}): Desk => ({
  id,
  code: id.replace('desk-', '').replace('-', '.'),
  floorId: 'f1',
  zone: 'tech',
  x,
  y: 100,
  facing: 'north',
  equipment: [],
  active: true,
  disabledReason: null,
  ...extra,
});

const desks = [
  desk('desk-1-01', 80, { equipment: ['window'] }),
  desk('desk-1-02', 152),
  desk('desk-1-03', 224, { active: false }),
];
const office: Office = {
  width: 940,
  height: 580,
  desk: { width: 66, height: 40 },
  floors: [
    {
      id: 'f1',
      level: 1,
      rooms: [
        {
          id: 'r',
          kind: 'meeting',
          name: 'Sablon',
          x: 470,
          y: 290,
          width: 210,
          height: 130,
          seats: 8,
        },
      ],
      desks,
    },
  ],
};

async function render(selectedId: string | null = null) {
  const fixture = TestBed.createComponent(FloorPlan);
  fixture.componentRef.setInput('office', office);
  fixture.componentRef.setInput('floor', office.floors[0]);
  fixture.componentRef.setInput('states', deskStates(desks, [], null, []));
  fixture.componentRef.setInput('selectedId', selectedId);
  await fixture.whenStable();
  return fixture;
}

describe('FloorPlan', () => {
  it('draws each desk as a named button, with one tab stop for the whole plan', async () => {
    const fixture = await render();
    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<SVGGElement>('[role="button"]'),
    ];
    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute('aria-label')).toBe(
      'Bureau 1.01, Tech, côté fenêtre, libre toute la journée',
    );
    expect(buttons[2].getAttribute('aria-label')).toContain('hors service');
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-label')).toBe(
      'Plan du 1er étage',
    );
  });

  it('puts the tab stop on the selected desk', async () => {
    const fixture = await render('desk-1-02');
    const selected = fixture.nativeElement.querySelector('[data-desk="desk-1-02"]');
    expect(selected.getAttribute('tabindex')).toBe('0');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  it('picks with Enter, and moves with the arrows', async () => {
    const fixture = await render();
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((id) => picked.push(id));
    const first = fixture.nativeElement.querySelector('[data-desk="desk-1-01"]') as SVGGElement;

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(picked).toEqual(['desk-1-01']);

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[data-desk="desk-1-02"]').getAttribute('tabindex'),
    ).toBe('0');
  });
});
