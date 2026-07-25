// ============================================================
// JOINT MATERIALS LIBRARY
// Parametric structural shapes for the Joint Builder.
//
// Every material defines ONE true cross-section (crossSectionSize +
// crossSectionKind) — what you'd see looking straight down its cut
// end — plus a length. The three principal views are all derived
// from that single source of truth, so they can never disagree:
//
//   Front view = cross-section HEIGHT  x length
//   Top view   = cross-section WIDTH   x length
//   End view   = the true cross-section shape itself, full size
//
// This is the same logic Board 2-2 used for Joint 6: the pipe's
// front view is a plain rectangle (you can't see it's round from the
// side), but the top view shows the true circle. Every material here
// works the same way — flat stock and square bar simply have "rect"
// cross-sections, so Front and Top end up being the same two
// dimensions in a different arrangement, which is honest, since a
// prismatic shape really does look the same from the front and the
// top (only End view reveals whether it's flat vs. square).
// ============================================================

const MATERIAL_PARAM_DEFS = {
  thickness:   { label: "Thickness",        unit: "in", default: 0.5,   min: 0.0625, max: 4,  step: 0.0625 },
  width:       { label: "Width",            unit: "in", default: 2,     min: 0.25,   max: 24, step: 0.125 },
  length:      { label: "Length",           unit: "in", default: 4,     min: 0.5,    max: 24, step: 0.125 },
  legA:        { label: "Leg A Length",     unit: "in", default: 3,     min: 0.5,    max: 12, step: 0.125 },
  legB:        { label: "Leg B Length",     unit: "in", default: 3,     min: 0.5,    max: 12, step: 0.125 },
  angleThick:  { label: "Thickness",        unit: "in", default: 0.25,  min: 0.0625, max: 2,  step: 0.0625 },
  outerDia:    { label: "Outer Diameter",   unit: "in", default: 2,     min: 0.25,   max: 12, step: 0.125 },
  wallThick:   { label: "Wall Thickness",   unit: "in", default: 0.188, min: 0.035,  max: 1,  step: 0.0155 },
  tubeWidth:   { label: "Width",            unit: "in", default: 2,     min: 0.5,    max: 12, step: 0.125 },
  tubeHeight:  { label: "Height",           unit: "in", default: 2,     min: 0.5,    max: 12, step: 0.125 },
  depth:       { label: "Depth",            unit: "in", default: 6,     min: 1,      max: 24, step: 0.125 },
  flangeWidth: { label: "Flange Width",     unit: "in", default: 4,     min: 1,      max: 16, step: 0.125 },
  flangeThick: { label: "Flange Thickness", unit: "in", default: 0.25,  min: 0.0625, max: 2,  step: 0.0625 },
  webThick:    { label: "Web Thickness",    unit: "in", default: 0.25,  min: 0.0625, max: 2,  step: 0.0625 },
  barDia:      { label: "Diameter",         unit: "in", default: 1,     min: 0.125,  max: 6,  step: 0.0625 },
  barSide:     { label: "Side",             unit: "in", default: 1,     min: 0.125,  max: 6,  step: 0.0625 }
};

// crossSectionKind "rect" = a plain rectangle (fully honest — nothing
// hidden by drawing it as a box). Every other kind gets a true-shape
// End view since a rectangle would misrepresent it.
const MATERIAL_TYPES = {
  flat: {
    label: "Flat Stock", group: "Flat Stock",
    params: ["thickness", "width", "length"],
    crossSectionKind: "rect",
    crossSectionSize: d => ({ h: d.thickness, w: d.width }),
    describe: d => `a flat plate ${fmtIn(d.thickness)} thick, ${fmtIn(d.width)} wide, and ${fmtIn(d.length)} long`
  },
  angle: {
    label: "Angle Iron (L-Shape)", group: "Angle Iron",
    params: ["legA", "legB", "angleThick", "length"],
    crossSectionKind: "angle",
    crossSectionSize: d => ({ h: d.legA, w: d.legB }),
    describe: d => `an angle iron with a ${fmtIn(d.legA)} leg and a ${fmtIn(d.legB)} leg, ${fmtIn(d.angleThick)} thick, ${fmtIn(d.length)} long`
  },
  roundtube: {
    label: "Round Tube / Pipe", group: "Tube / Pipe",
    params: ["outerDia", "wallThick", "length"],
    crossSectionKind: "roundtube",
    crossSectionSize: d => ({ h: d.outerDia, w: d.outerDia }),
    describe: d => `a round tube with a ${fmtIn(d.outerDia)} outer diameter, ${fmtIn(d.wallThick)} wall thickness, and ${fmtIn(d.length)} length`
  },
  sqtube: {
    label: "Square / Rectangular Tube", group: "Tube / Pipe",
    params: ["tubeWidth", "tubeHeight", "wallThick", "length"],
    crossSectionKind: "sqtube",
    crossSectionSize: d => ({ h: d.tubeHeight, w: d.tubeWidth }),
    describe: d => `a rectangular tube ${fmtIn(d.tubeWidth)} by ${fmtIn(d.tubeHeight)}, ${fmtIn(d.wallThick)} wall thickness, ${fmtIn(d.length)} long`
  },
  cchannel: {
    label: "C-Channel", group: "C-Channel",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    crossSectionKind: "cchannel",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a C-channel ${fmtIn(d.depth)} deep with ${fmtIn(d.flangeWidth)} flanges, ${fmtIn(d.length)} long`
  },
  ibeam: {
    label: "I-Beam (W-Shape)", group: "I-Beam",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    crossSectionKind: "ibeam",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a wide-flange I-beam (W-shape) ${fmtIn(d.depth)} deep with ${fmtIn(d.flangeWidth)} flanges, ${fmtIn(d.length)} long`
  },
  sbeam: {
    label: "S-Beam (Standard I-Shape)", group: "Structural Steel",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    crossSectionKind: "sbeam",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a standard I-beam (S-shape) ${fmtIn(d.depth)} deep with ${fmtIn(d.flangeWidth)} flanges, ${fmtIn(d.length)} long`
  },
  roundbar: {
    label: "Round Bar", group: "Structural Steel",
    params: ["barDia", "length"],
    crossSectionKind: "roundbar",
    crossSectionSize: d => ({ h: d.barDia, w: d.barDia }),
    describe: d => `a round solid bar ${fmtIn(d.barDia)} in diameter and ${fmtIn(d.length)} long`
  },
  squarebar: {
    label: "Square Bar", group: "Structural Steel",
    params: ["barSide", "length"],
    crossSectionKind: "rect",
    crossSectionSize: d => ({ h: d.barSide, w: d.barSide }),
    describe: d => `a square solid bar ${fmtIn(d.barSide)} in per side and ${fmtIn(d.length)} long`
  }
};

const MATERIAL_GROUPS = ["Flat Stock", "Angle Iron", "Tube / Pipe", "C-Channel", "I-Beam", "Structural Steel"];

// Which global axis each member's LENGTH runs along, per joint type and
// member role. This is what makes true third-angle projection possible:
// a member whose length points along the axis a view is looking down
// shows only its cross-section in that view (you can't see length when
// looking straight down it) — e.g. a T-joint's upright member shows its
// full height in Front/Right Side views, but only its cross-section in
// Top view, since Top looks straight down the upright's length.
const JOINT_MEMBER_AXES = {
  tjoint:  { m1: "X", m2: "Y" },
  butt:    { m1: "X", m2: "X" },
  lap:     { m1: "X", m2: "X" },
  corner:  { m1: "X", m2: "Y" },
  edge:    { m1: "X", m2: "X" }
};

// Which axis is NOT visible (the viewing direction) in each principal view
const VIEW_HIDDEN_AXIS = { front: "Z", top: "Y", right: "X" };
const VIEW_LABELS = { front: "Front View", top: "Top View", right: "Right Side View" };

const JOINT_ARRANGEMENTS = {
  tjoint:  { label: "T-Joint",   desc: "Member 2 stands perpendicular on top of Member 1, forming a T." },
  butt:    { label: "Butt Joint", desc: "Members meet edge to edge in the same plane." },
  lap:     { label: "Lap Joint",  desc: "Members overlap, one above the other." },
  corner:  { label: "Corner Joint", desc: "Members meet at a right-angle corner, like the corner of a frame." },
  edge:    { label: "Edge Joint", desc: "Members sit directly on top of one another, edges aligned." }
};

function fmtIn(n) {
  const r = Math.round(n * 10000) / 10000;
  return `${r}"`;
}

function defaultDims(materialKey) {
  const mat = MATERIAL_TYPES[materialKey];
  const d = {};
  mat.params.forEach(p => { d[p] = MATERIAL_PARAM_DEFS[p].default; });
  return d;
}

// ---------- Cross-section (End view) path builders ----------
// All coordinates are in real-world inches, origin at the shape's own
// top-left bounding corner. joint-app.js scales + translates into place.

function crossSectionPoints(kind, d) {
  switch (kind) {
    case "rect":
      return null; // drawn as a plain rect directly by the renderer
    case "angle": {
      const t = d.angleThick;
      return [[0,0],[t,0],[t,d.legA-t],[d.legB,d.legA-t],[d.legB,d.legA],[0,d.legA]];
    }
    case "sqtube":
      return null; // drawn specially (outer rect + inner rect) by the renderer
    case "cchannel": {
      const fw = d.flangeWidth, dep = d.depth, ft = d.flangeThick, wt = d.webThick;
      return [[0,0],[fw,0],[fw,ft],[wt,ft],[wt,dep-ft],[fw,dep-ft],[fw,dep],[0,dep]];
    }
    case "ibeam": {
      const fw = d.flangeWidth, dep = d.depth, ft = d.flangeThick, wt = d.webThick;
      const cx1 = (fw - wt) / 2, cx2 = (fw + wt) / 2;
      return [
        [0,0],[fw,0],[fw,ft],[cx2,ft],[cx2,dep-ft],[fw,dep-ft],[fw,dep],[0,dep],
        [0,dep-ft],[cx1,dep-ft],[cx1,ft],[0,ft]
      ];
    }
    case "sbeam": {
      // Same envelope as an I-beam but with tapered (sloped) flange
      // faces on the inside — the visual cue that distinguishes an
      // S-shape (American Standard) from a W-shape (wide-flange).
      const fw = d.flangeWidth, dep = d.depth, ft = d.flangeThick, wt = d.webThick;
      const taper = Math.min(fw * 0.18, ft * 1.4);
      const cx1 = (fw - wt) / 2, cx2 = (fw + wt) / 2;
      return [
        [0,0],[fw,0],[fw,ft],[cx2+taper,ft],[cx2,dep-ft],[fw,dep-ft],[fw,dep],[0,dep],
        [0,dep-ft],[cx1,dep-ft],[cx1-taper,ft],[0,ft]
      ];
    }
    default:
      return null;
  }
}

function crossSectionCircles(kind, d) {
  if (kind === "roundtube") {
    const r = d.outerDia / 2;
    const inner = Math.max(r - d.wallThick, 0);
    return { outerR: r, innerR: inner };
  }
  if (kind === "roundbar") {
    return { outerR: d.barDia / 2, innerR: 0 };
  }
  return null;
}
