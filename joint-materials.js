// ============================================================
// JOINT MATERIALS LIBRARY
// Parametric structural shapes for the Joint Builder.
//
// Every member is always drawn in ELEVATION (a side view along its
// length — this is what a plate, tube, beam, or bar looks like from
// the side, and it's honest for every material because you're seeing
// its true outer silhouette).
//
// Materials whose true cross-section shape would otherwise be invisible
// or misleading in elevation alone (anything that isn't a plain
// rectangle when you look at its cut end — tube, angle, channel, beam,
// round bar) also get an automatic CROSS-SECTION view: the true cut
// profile, shown the same way Board 2-2's Joint 6 added a top view to
// show a pipe's roundness alongside its front-view rectangle.
// ============================================================

const MATERIAL_PARAM_DEFS = {
  thickness:   { label: "Thickness",        unit: "in", default: 0.5,   min: 0.0625, max: 4,  step: 0.0625 },
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

// crossSectionKind: null means the elevation rectangle already tells the
// whole story (flat stock, square bar) — no second view is generated.
const MATERIAL_TYPES = {
  flat: {
    label: "Flat Stock", group: "Flat Stock",
    params: ["thickness", "length"],
    elevationSize: d => ({ h: d.thickness, w: d.length }),
    crossSectionKind: null,
    describe: d => `a flat plate ${fmtIn(d.thickness)} thick and ${fmtIn(d.length)} long`
  },
  angle: {
    label: "Angle Iron (L-Shape)", group: "Angle Iron",
    params: ["legA", "legB", "angleThick", "length"],
    elevationSize: d => ({ h: Math.max(d.legA, d.legB), w: d.length }),
    crossSectionKind: "angle",
    crossSectionSize: d => ({ h: d.legA, w: d.legB }),
    describe: d => `an angle iron with a ${fmtIn(d.legA)} leg and a ${fmtIn(d.legB)} leg, ${fmtIn(d.angleThick)} thick, ${fmtIn(d.length)} long`
  },
  roundtube: {
    label: "Round Tube / Pipe", group: "Tube / Pipe",
    params: ["outerDia", "wallThick", "length"],
    elevationSize: d => ({ h: d.outerDia, w: d.length }),
    crossSectionKind: "roundtube",
    crossSectionSize: d => ({ h: d.outerDia, w: d.outerDia }),
    describe: d => `a round tube with a ${fmtIn(d.outerDia)} outer diameter, ${fmtIn(d.wallThick)} wall thickness, and ${fmtIn(d.length)} length`
  },
  sqtube: {
    label: "Square / Rectangular Tube", group: "Tube / Pipe",
    params: ["tubeWidth", "tubeHeight", "wallThick", "length"],
    elevationSize: d => ({ h: d.tubeHeight, w: d.length }),
    crossSectionKind: "sqtube",
    crossSectionSize: d => ({ h: d.tubeHeight, w: d.tubeWidth }),
    describe: d => `a rectangular tube ${fmtIn(d.tubeWidth)} by ${fmtIn(d.tubeHeight)}, ${fmtIn(d.wallThick)} wall thickness, ${fmtIn(d.length)} long`
  },
  cchannel: {
    label: "C-Channel", group: "C-Channel",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    elevationSize: d => ({ h: d.depth, w: d.length }),
    crossSectionKind: "cchannel",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a C-channel ${fmtIn(d.depth)} deep with ${fmtIn(d.flangeWidth)} flanges, ${fmtIn(d.length)} long`
  },
  ibeam: {
    label: "I-Beam (W-Shape)", group: "I-Beam",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    elevationSize: d => ({ h: d.depth, w: d.length }),
    crossSectionKind: "ibeam",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a wide-flange I-beam (W-shape) ${fmtIn(d.depth)} deep with ${fmtIn(d.flangeWidth)} flanges, ${fmtIn(d.length)} long`
  },
  sbeam: {
    label: "S-Beam (Standard I-Shape)", group: "Structural Steel",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    elevationSize: d => ({ h: d.depth, w: d.length }),
    crossSectionKind: "sbeam",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a standard I-beam (S-shape) ${fmtIn(d.depth)} deep with ${fmtIn(d.flangeWidth)} flanges, ${fmtIn(d.length)} long`
  },
  roundbar: {
    label: "Round Bar", group: "Structural Steel",
    params: ["barDia", "length"],
    elevationSize: d => ({ h: d.barDia, w: d.length }),
    crossSectionKind: "roundbar",
    crossSectionSize: d => ({ h: d.barDia, w: d.barDia }),
    describe: d => `a round solid bar ${fmtIn(d.barDia)} in diameter and ${fmtIn(d.length)} long`
  },
  squarebar: {
    label: "Square Bar", group: "Structural Steel",
    params: ["barSide", "length"],
    elevationSize: d => ({ h: d.barSide, w: d.length }),
    crossSectionKind: null,
    describe: d => `a square solid bar ${fmtIn(d.barSide)} in per side and ${fmtIn(d.length)} long`
  }
};

const MATERIAL_GROUPS = ["Flat Stock", "Angle Iron", "Tube / Pipe", "C-Channel", "I-Beam", "Structural Steel"];

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

// ---------- Cross-section path builders ----------
// All coordinates are in real-world inches, origin at the shape's own
// top-left bounding corner. joint-app.js scales + translates into place.

function crossSectionPoints(kind, d) {
  switch (kind) {
    case "angle": {
      const t = d.angleThick;
      return [[0,0],[t,0],[t,d.legA-t],[d.legB,d.legA-t],[d.legB,d.legA],[0,d.legA]];
    }
    case "sqtube": {
      // returns two rects (outer, inner) rather than a single polygon
      return null; // handled specially in renderer
    }
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
