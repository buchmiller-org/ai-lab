/**
 * Gravity Wars — Solo Orbital Challenges
 * Six handcrafted puzzle levels. Exposed as window.GW.Challenges. DOM-free.
 *
 * Every level has limited ammo; target drones die to any detonation that
 * touches them (direct hit or blast splash). Stars are awarded by shots used:
 *   3★ = used <= par,   2★ = par + 1,   1★ = anything else that clears the board.
 *
 * Special bodies:
 *   blackHole – tiny, very massive, lethal core.
 *   barriers  – "planetary shield" lines/arcs. Solid but massless: they absorb
 *               shots without bending them. Built from overlapping pylons so the
 *               stock circle-collision physics handles them.
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});
  const { Entities } = GW;

  const DRONE_RADIUS = 12;
  const PYLON_RADIUS = 8;
  const PYLON_SPACING = 11;

  const C = { cyan: '#38bdf8', pink: '#f472b6', gold: '#facc15', violet: '#a78bfa', green: '#06d6a0', orange: '#fb923c' };

  // Spec helpers (data only; instantiated fresh by build()).
  const planet = (x, y, r, density, color) => ({ x, y, r, mass: r * r * density, color });
  const hole = (x, y, r, mass) => ({ x, y, r, mass, color: '#a78bfa', blackHole: true });
  const line = (x1, y1, x2, y2) => ({ kind: 'line', x1, y1, x2, y2 });
  const arc = (cx, cy, r, a0, a1) => ({ kind: 'arc', cx, cy, r, a0, a1 }); // degrees, screen coords (y down)
  const drone = (x, y) => ({ x, y });

  const LEVELS = [
    {
      name: 'First Light',
      hint: 'A single world blocks the shot. Let its gravity bend your path.',
      ammo: 3, par: 1,
      ship: { x: 70, y: 430 },
      planets: [planet(400, 300, 46, 700, C.cyan)],
      barriers: [],
      drones: [drone(690, 190)],
    },
    {
      name: 'Event Horizon',
      hint: 'Anything that touches the singularity is lost. Skirt it.',
      ammo: 3, par: 2,
      ship: { x: 70, y: 300 },
      planets: [hole(400, 300, 16, 2.4e6)],
      barriers: [],
      drones: [drone(700, 235), drone(700, 365)],
    },
    {
      name: 'Shield Arc',
      hint: 'The shield eats shots head-on. Arc over it, or around it.',
      ammo: 3, par: 2,
      ship: { x: 70, y: 300 },
      planets: [planet(540, 300, 42, 800, C.pink)],
      barriers: [arc(540, 300, 88, 110, 250)],
      drones: [drone(660, 300), drone(640, 390)],
    },
    {
      name: 'Slalom',
      hint: 'Three pockets, four shots. Spend them wisely.',
      ammo: 4, par: 3,
      ship: { x: 70, y: 300 },
      planets: [planet(300, 190, 50, 750, C.gold), planet(480, 420, 54, 750, C.green)],
      barriers: [],
      drones: [drone(680, 120), drone(640, 500), drone(710, 310)],
    },
    {
      name: 'The Corridor',
      hint: 'Thread the gap between two heavy worlds, then let gravity carry you.',
      ammo: 3, par: 2,
      ship: { x: 70, y: 300 },
      planets: [planet(400, 180, 62, 900, C.orange), planet(400, 420, 62, 900, C.violet)],
      barriers: [line(400, 0, 400, 118), line(400, 482, 400, 600)],
      drones: [drone(690, 140), drone(690, 460)],
    },
    {
      name: 'Singularity Gauntlet',
      hint: 'Black hole, shield wall and a heavy world. Plan every shell.',
      ammo: 4, par: 3,
      ship: { x: 70, y: 520 },
      planets: [hole(330, 300, 16, 2.2e6), planet(600, 450, 44, 800, C.cyan)],
      barriers: [line(500, 110, 500, 330)],
      drones: [drone(700, 120), drone(640, 300), drone(700, 540)],
    },
  ];

  /** Overlapping massless pylons along a barrier so circle collision walls it off. */
  function pylonsFor(b) {
    const pts = [];
    if (b.kind === 'line') {
      const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
      const n = Math.max(1, Math.ceil(len / PYLON_SPACING));
      for (let i = 0; i <= n; i++) pts.push({ x: b.x1 + ((b.x2 - b.x1) * i) / n, y: b.y1 + ((b.y2 - b.y1) * i) / n });
    } else {
      const span = ((b.a1 - b.a0) * Math.PI) / 180;
      const n = Math.max(1, Math.ceil((Math.abs(span) * b.r) / PYLON_SPACING));
      for (let i = 0; i <= n; i++) {
        const a = (b.a0 * Math.PI) / 180 + (span * i) / n;
        pts.push({ x: b.cx + Math.cos(a) * b.r, y: b.cy + Math.sin(a) * b.r });
      }
    }
    return pts.map((q) => {
      const p = new Entities.Planet(q.x, q.y, PYLON_RADIUS, 0, '#38bdf8');
      p.shield = true;
      return p;
    });
  }

  /** Fresh, mutable level state for index i (0-based). */
  function build(i) {
    const def = LEVELS[i];
    const planets = def.planets.map((s) => {
      const p = new Entities.Planet(s.x, s.y, s.r, s.mass, s.color);
      if (s.blackHole) p.blackHole = true;
      return p;
    });
    for (const b of def.barriers) planets.push(...pylonsFor(b));
    const drones = def.drones.map((d) => {
      const s = new Entities.Ship(0, d.x, d.y, '#fb7185', -1);
      s.radius = DRONE_RADIUS;
      s.kind = 'drone';
      return s;
    });
    const ship = new Entities.Ship(1, def.ship.x, def.ship.y, '#06d6a0', 1);
    return {
      index: i, name: def.name, hint: def.hint, ammo: def.ammo, par: def.par,
      planets, barriers: def.barriers, drones, ship,
    };
  }

  /** 1–3 stars for clearing a level using `used` shots. */
  function starsFor(index, used) {
    const par = LEVELS[index].par;
    return Math.max(1, Math.min(3, 3 - Math.max(0, used - par)));
  }

  GW.Challenges = {
    LEVELS,
    COUNT: LEVELS.length,
    build,
    starsFor,
    pylonsFor,
  };
})();
