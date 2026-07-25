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

// Bump this with every change to this file specifically, so it can be
// checked independently of joint-app.js's stamp — the two files have
// to be uploaded together, and a mismatch between them is a common
// source of "nothing updated" bugs that are otherwise hard to spot.
const MATERIALS_BUILD_STAMP = "2026-07-25-l";

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
  flangeThick: { label: "Flange Thickness", unit: "in", default: 0.35,  min: 0.0625, max: 2,  step: 0.0625 },
  webThick:    { label: "Web Thickness",    unit: "in", default: 0.25,  min: 0.0625, max: 2,  step: 0.0625 },
  hDepth:       { label: "Depth",            unit: "in", default: 8,    min: 1,      max: 24, step: 0.125 },
  hFlangeWidth: { label: "Flange Width",     unit: "in", default: 8,    min: 1,      max: 16, step: 0.125 },
  hFlangeThick: { label: "Flange Thickness", unit: "in", default: 0.5,  min: 0.0625, max: 3,  step: 0.0625 },
  hWebThick:    { label: "Web Thickness",    unit: "in", default: 0.5,  min: 0.0625, max: 3,  step: 0.0625 },
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
    describe: d => `a ${fmtIn(d.thickness)} x ${fmtIn(d.width)} flat plate, ${fmtIn(d.length)} long`
  },
  angle: {
    label: "Angle Iron (L-Shape)", group: "Angle Iron",
    params: ["legA", "legB", "angleThick", "length"],
    crossSectionKind: "angle",
    crossSectionSize: d => ({ h: d.legA, w: d.legB }),
    describe: d => `a ${fmtIn(d.legA)} x ${fmtIn(d.legB)} x ${fmtIn(d.angleThick)} angle iron, ${fmtIn(d.length)} long`
  },
  roundtube: {
    label: "Round Tube / Pipe", group: "Tube / Pipe",
    params: ["outerDia", "wallThick", "length"],
    crossSectionKind: "roundtube",
    crossSectionSize: d => ({ h: d.outerDia, w: d.outerDia }),
    describe: d => `a ${fmtIn(d.outerDia)} OD round tube, ${fmtIn(d.wallThick)} wall, ${fmtIn(d.length)} long`
  },
  sqtube: {
    label: "Square / Rectangular Tube", group: "Tube / Pipe",
    params: ["tubeWidth", "tubeHeight", "wallThick", "length"],
    crossSectionKind: "sqtube",
    crossSectionSize: d => ({ h: d.tubeHeight, w: d.tubeWidth }),
    describe: d => `a ${fmtIn(d.tubeWidth)} x ${fmtIn(d.tubeHeight)} tube, ${fmtIn(d.wallThick)} wall, ${fmtIn(d.length)} long`
  },
  cchannel: {
    label: "C-Channel", group: "C-Channel",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    crossSectionKind: "cchannel",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a ${fmtIn(d.depth)} x ${fmtIn(d.flangeWidth)} C-channel, ${fmtIn(d.length)} long`
  },
  ibeam: {
    label: "I-Beam (W-Shape)", group: "I-Beam",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    crossSectionKind: "ibeam",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a ${fmtIn(d.depth)} x ${fmtIn(d.flangeWidth)} W-beam, ${fmtIn(d.length)} long`
  },
  sbeam: {
    label: "S-Beam (Standard I-Shape)", group: "Structural Steel",
    params: ["depth", "flangeWidth", "flangeThick", "webThick", "length"],
    crossSectionKind: "sbeam",
    crossSectionSize: d => ({ h: d.depth, w: d.flangeWidth }),
    describe: d => `a ${fmtIn(d.depth)} x ${fmtIn(d.flangeWidth)} S-beam, ${fmtIn(d.length)} long`
  },
  hbeam: {
    label: "H-Beam (H-Pile)", group: "Structural Steel",
    // Same parallel-flange geometry as a W-beam — the real difference is
    // proportion: flange width runs roughly equal to depth (square-ish),
    // and thickness is uniform throughout (flange ≈ web), unlike a
    // W-beam's thicker flanges and greater depth-to-width ratio.
    params: ["hDepth", "hFlangeWidth", "hFlangeThick", "hWebThick", "length"],
    crossSectionKind: "hbeam",
    crossSectionSize: d => ({ h: d.hDepth, w: d.hFlangeWidth }),
    describe: d => `a ${fmtIn(d.hDepth)} x ${fmtIn(d.hFlangeWidth)} H-beam, ${fmtIn(d.length)} long`
  },
  roundbar: {
    label: "Round Bar", group: "Structural Steel",
    params: ["barDia", "length"],
    crossSectionKind: "roundbar",
    crossSectionSize: d => ({ h: d.barDia, w: d.barDia }),
    describe: d => `a ${fmtIn(d.barDia)} round bar, ${fmtIn(d.length)} long`
  },
  squarebar: {
    label: "Square Bar", group: "Structural Steel",
    params: ["barSide", "length"],
    crossSectionKind: "rect",
    crossSectionSize: d => ({ h: d.barSide, w: d.barSide }),
    describe: d => `a ${fmtIn(d.barSide)} square bar, ${fmtIn(d.length)} long`
  }
};

const MATERIAL_GROUPS = ["Flat Stock", "Angle Iron", "Tube / Pipe", "C-Channel", "I-Beam", "Structural Steel"];

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
    case "hbeam": {
      // Same parallel-flange geometry as a W-beam — H-beams differ in
      // proportion (square-ish, uniform thickness), not shape formula.
      const fw = d.hFlangeWidth, dep = d.hDepth, ft = d.hFlangeThick, wt = d.hWebThick;
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

// Where a shape's INTERNAL boundaries sit, in its own natural (unrotated)
// coordinate frame — e.g. an angle iron's inner bend line, a C-channel or
// I-beam's flange-to-web lines, a tube's wall thickness. Top/Right views
// extrude these as full-length lines so features that only Front view's
// true cross-section would otherwise show don't disappear from the other
// two views.
function internalEdges(kind, d) {
  switch (kind) {
    case "angle": {
      const t = d.angleThick;
      return { xEdges: [t], yEdges: [d.legA - t] };
    }
    case "cchannel": {
      const ft = d.flangeThick, wt = d.webThick, dep = d.depth;
      return { xEdges: [wt], yEdges: [ft, dep - ft] };
    }
    case "ibeam":
    case "sbeam": {
      const ft = d.flangeThick, wt = d.webThick, fw = d.flangeWidth, dep = d.depth;
      const cx1 = (fw - wt) / 2, cx2 = (fw + wt) / 2;
      return { xEdges: [cx1, cx2], yEdges: [ft, dep - ft] };
    }
    case "hbeam": {
      const ft = d.hFlangeThick, wt = d.hWebThick, fw = d.hFlangeWidth, dep = d.hDepth;
      const cx1 = (fw - wt) / 2, cx2 = (fw + wt) / 2;
      return { xEdges: [cx1, cx2], yEdges: [ft, dep - ft] };
    }
    case "sqtube": {
      const wt = d.wallThick, tw = d.tubeWidth, th = d.tubeHeight;
      return { xEdges: [wt, tw - wt], yEdges: [wt, th - wt] };
    }
    case "roundtube": {
      const r = d.outerDia / 2;
      const inner = Math.max(r - d.wallThick, 0);
      const tangents = [r - inner, r + inner];
      return { xEdges: tangents, yEdges: tangents };
    }
    default:
      return { xEdges: [], yEdges: [] };
  }
}
