// One-off generator for the low-poly facet texture in app/globals.css
// (--facet-svg). Not part of the build — run by hand, and the output is
// pasted into the CSS as a committed data URI, the same way tech-icons.ts
// is generated once and committed rather than computed at runtime.
//
// Seeded PRNG so re-running this produces the *same* mesh — the texture is
// meant to be a stable, reviewable asset, not something that silently
// changes shape on every regeneration.

const TILE = 640;
const CELLS = 12; // 12x12 grid of quads -> 288 triangles per tile
const CELL = TILE / CELLS;
const JITTER = 0.42; // fraction of a cell each interior point may move

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260920);

// The mesh is built on a torus: the point at column CELLS *is* the point at
// column 0, shifted one tile right, and likewise for rows. Every point —
// including the ones on the border — is fully jittered.
//
// This matters because a repeating tile is given away by its seam, and a
// seam is only invisible if nothing lines up along it. Pinning border
// points to the tile's edge (or even sliding them along it) leaves a run of
// collinear points, and a run of collinear points is a straight line the
// full width of the tile — the exact artifact that reads as "this is
// tiled". Wrapping instead lets triangles straddle the boundary, so there
// is no line there at all. The cost is that a straddling triangle has to be
// drawn more than once (see `placements` below), since the half that hangs
// off one side has to reappear on the other.
const base = [];
for (let j = 0; j < CELLS; j++) {
  base[j] = [];
  for (let i = 0; i < CELLS; i++) {
    base[j][i] = [
      i * CELL + (rand() - 0.5) * 2 * JITTER * CELL,
      j * CELL + (rand() - 0.5) * 2 * JITTER * CELL,
    ];
  }
}

const points = [];
for (let j = 0; j <= CELLS; j++) {
  points[j] = [];
  for (let i = 0; i <= CELLS; i++) {
    const [x, y] = base[j % CELLS][i % CELLS];
    points[j][i] = [x + (i === CELLS ? TILE : 0), y + (j === CELLS ? TILE : 0)];
  }
}

const tris = [];
for (let j = 0; j < CELLS; j++) {
  for (let i = 0; i < CELLS; i++) {
    const tl = points[j][i];
    const tr = points[j][i + 1];
    const bl = points[j + 1][i];
    const br = points[j + 1][i + 1];
    // Alternate the split diagonal per cell so the mesh doesn't read as a
    // uniform herringbone of identically-oriented triangle pairs.
    if ((i + j) % 2 === 0) {
      tris.push([tl, tr, bl]);
      tris.push([tr, br, bl]);
    } else {
      tris.push([tl, tr, br]);
      tris.push([tl, br, bl]);
    }
  }
}

// Per-facet shade: heavily biased toward near-black, with only occasional
// lighter facets standing in for a surface that happens to catch the light
// — dark enough that the mesh reads as a shadowed material, not a pale grey
// carpet, and dark enough that the hover-glow (which lights the same mesh's
// edges) has real contrast to punch through.
function shade() {
  const v = rand();
  const lightness = 0.015 + v * v * v * 0.34; // cubed: even more mass near 0
  const g = Math.round(lightness * 255);
  return `#${g.toString(16).padStart(2, '0').repeat(3)}`;
}

// Every offset at which a triangle still shows inside the tile. A triangle
// wholly inside gets one; one straddling an edge gets the copies that bring
// its overhanging half back round the other side. The SVG viewport clips
// the rest, so what lands in the tile is exactly the torus unwrapped.
function placements([a, b, c]) {
  const xs = [a[0], b[0], c[0]];
  const ys = [a[1], b[1], c[1]];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const out = [];
  for (const dx of [-TILE, 0, TILE]) {
    for (const dy of [-TILE, 0, TILE]) {
      if (maxX + dx > 0 && minX + dx < TILE && maxY + dy > 0 && minY + dy < TILE) {
        out.push([dx, dy]);
      }
    }
  }
  return out;
}

const draw = (tri, attrs) =>
  placements(tri)
    .map(([dx, dy]) => {
      const pts = tri
        .map((p) => `${(p[0] + dx).toFixed(1)},${(p[1] + dy).toFixed(1)}`)
        .join(' ');
      return `<polygon points='${pts}' ${attrs}/>`;
    })
    .join('');

// One shade per triangle, shared by all of its copies — a straddling
// triangle has to be the same colour on both sides of the seam or the seam
// comes straight back as a colour break.
const shades = tris.map(() => shade());

const polys = tris.map((tri, n) => draw(tri, `fill='${shades[n]}'`)).join('');

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE}' height='${TILE}'>${polys}</svg>`;

// The hover mask needs the mesh's own edges, not a fill — "the sharp edges
// only will light", not whole facets. Same triangles, stroke only, no fill,
// used as `.bg-spot__grid`'s mask so what lights up under the cursor is
// recognisably *this* mesh and not a different shape.
const edges = tris
  .map((tri) => draw(tri, `fill='none' stroke='white' stroke-width='1'`))
  .join('');
const edgeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE}' height='${TILE}'>${edges}</svg>`;

// Data-URI encoding matching the style already used for the other inline
// SVGs in globals.css: literal characters where possible, %-escapes only
// for the ones a CSS url() can't contain unescaped.
const encode = (s) => s.replace(/#/g, '%23').replace(/'/g, '%27').replace(/\n/g, '');

console.log(`--facet-svg: url("data:image/svg+xml,${encode(svg)}");`);
console.log(`\n--facet-edges-svg: url("data:image/svg+xml,${encode(edgeSvg)}");`);
console.log(
  `\n(${tris.length} triangles, tile ${TILE}px, fill ${svg.length}->${encode(svg).length}b, edges ${edgeSvg.length}->${encode(edgeSvg).length}b)`,
);
