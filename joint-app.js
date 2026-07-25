// ============================================================
// JOINT BUILDER — APPLICATION LOGIC
//
// BUILD_STAMP: bump this string with every change shipped. It's shown
// in the page footer so you can confirm at a glance whether what's
// live actually matches what was last sent — no console needed.
// ============================================================
const BUILD_STAMP = "2026-07-25-h";
{
  const el = document.getElementById("build-stamp");
  if (el) el.textContent = BUILD_STAMP;
}
// Model (matches Board 2-2's convention and third-angle projection):
//   FRONT VIEW = the true end-on profile of each member (what you'd
//     see looking straight down its length) — a circle for tube, an
//     L for angle iron, a plain rectangle for flat stock — arranged
//     per joint type. Length never appears here.
//   TOP VIEW    = each member's Front silhouette (x position, width)
//     extruded downward by ITS OWN length.
//   RIGHT VIEW  = each member's Front silhouette (y position, height)
//     extruded rightward by ITS OWN length.
// Rotating a member spins its true shape in Front view; Top/Right
// automatically inherit whatever footprint that rotation produces.
// ============================================================

const state = {
  jointType: "tjoint",
  activeMember: 0,
  attachOffset: 0,
  showPrincipalViews: true,
  members: [
    { material: "flat", dims: defaultDims("flat"), rotation: 0, offsetX: 0, offsetY: 0 },
    { material: "flat", dims: defaultDims("flat"), rotation: 0, offsetX: 0, offsetY: 0 }
  ]
};

const NAVY = "#8FA3C2";
const NAVY_STROKE = "#E8EEF5";
const RED_ACCENT = "#F2C744";

// Which member gets rotated 90° to "stand up" in Front view, per joint
// type — this has to be explicit and shared, because arrangeMembers()
// (which positions the box) and trueShapeMarkup() (which draws the
// actual shape inside it) both need to agree on it.
const ROLE_ROTATION = {
  tjoint:  { m1: 0, m2: 90 },
  butt:    { m1: 0, m2: 0 },
  lap:     { m1: 0, m2: 0 },
  corner:  { m1: 0, m2: 90 },
  edge:    { m1: 0, m2: 0 }
};

function getRotatedCrossSection(member) {
  const raw = MATERIAL_TYPES[member.material].crossSectionSize(member.dims);
  const rot = member.rotation || 0;
  return (rot === 90 || rot === 270) ? { h: raw.w, w: raw.h } : raw;
}

// ---------- Front view arrangement (pure profile, no length) ----------
// attachOffset: how far the upright member (M2) sinks down into M1's
// silhouette instead of always sitting at the very top of it — needed
// for shapes like an I-beam where the actual weld-able surface (the
// web) isn't at the top of the bounding box.
function arrangeMembers(jointType, s1, s2, attachOffset) {
  const offset = attachOffset || 0;
  if (jointType === "tjoint") {
    const totalW = Math.max(s1.w, s2.h);
    const effTotalH = s1.h + s2.w - offset;
    const m1 = { x: (totalW - s1.w) / 2, y: effTotalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: (totalW - s2.h) / 2, y: 0, w: s2.h, h: s2.w };
    return { m1, m2, totalW, totalH: effTotalH };
  }
  if (jointType === "butt") {
    const gap = Math.max(s1.w, s2.w) * 0.015;
    const totalW = s1.w + s2.w + gap;
    const totalH = Math.max(s1.h, s2.h);
    const m1 = { x: 0, y: totalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: s1.w + gap, y: totalH - s2.h, w: s2.w, h: s2.h };
    return { m1, m2, totalW, totalH };
  }
  if (jointType === "lap") {
    const overlap = Math.min(s1.w, s2.w) * 0.4;
    const totalW = s1.w + s2.w - overlap;
    const totalH = s1.h + s2.h;
    const m1 = { x: 0, y: s2.h, w: s1.w, h: s1.h };
    const m2 = { x: s1.w - overlap, y: 0, w: s2.w, h: s2.h };
    return { m1, m2, totalW, totalH };
  }
  if (jointType === "corner") {
    const effTotalH = s1.h + s2.w - offset;
    const totalW = s1.w;
    const m1 = { x: 0, y: effTotalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: Math.max(0, s1.w - s2.h), y: 0, w: Math.min(s2.h, s1.w), h: s2.w };
    return { m1, m2, totalW, totalH: effTotalH };
  }
  // edge — edges sit directly against one another, no gap
  const totalW = Math.max(s1.w, s2.w);
  const totalH = s1.h + s2.h;
  const m1 = { x: (totalW - s1.w) / 2, y: totalH - s1.h, w: s1.w, h: s1.h };
  const m2 = { x: (totalW - s2.w) / 2, y: 0, w: s2.w, h: s2.h };
  return { m1, m2, totalW, totalH };
}

function computeFrontLayout() {
  const s1 = getRotatedCrossSection(state.members[0]);
  const s2 = getRotatedCrossSection(state.members[1]);
  const attach = (state.jointType === "tjoint" || state.jointType === "corner")
    ? Math.min(state.attachOffset || 0, s2.w * 0.9, s1.h * 0.9)
    : 0;
  const layout = arrangeMembers(state.jointType, s1, s2, attach);

  // Manual nudge, applied on top of the automatic arrangement. Members
  // can be pushed anywhere, including negative territory, so the whole
  // bounding box gets renormalized to start at (0,0) afterward — this is
  // what keeps Top/Right (which read Front's x/w or y/h directly) and
  // the shared-scale grid math correct no matter how far things move.
  const ox1 = state.members[0].offsetX || 0, oy1 = state.members[0].offsetY || 0;
  const ox2 = state.members[1].offsetX || 0, oy2 = state.members[1].offsetY || 0;
  const m1 = { x: layout.m1.x + ox1, y: layout.m1.y + oy1, w: layout.m1.w, h: layout.m1.h };
  const m2 = { x: layout.m2.x + ox2, y: layout.m2.y + oy2, w: layout.m2.w, h: layout.m2.h };

  const minX = Math.min(m1.x, m2.x, 0);
  const minY = Math.min(m1.y, m2.y, 0);
  const maxX = Math.max(m1.x + m1.w, m2.x + m2.w);
  const maxY = Math.max(m1.y + m1.h, m2.y + m2.h);
  m1.x -= minX; m2.x -= minX;
  m1.y -= minY; m2.y -= minY;

  return { m1, m2, totalW: maxX - minX, totalH: maxY - minY };
}

// Top/Right are directly derived from Front — same x/w (Top) or y/h
// (Right), each member's own length filling the other axis.
function computeTopLayout() {
  const front = computeFrontLayout();
  const len1 = state.members[0].dims.length;
  const len2 = state.members[1].dims.length;
  const m1 = { x: front.m1.x, w: front.m1.w, y: 0, h: len1 };
  const m2 = { x: front.m2.x, w: front.m2.w, y: 0, h: len2 };
  return { m1, m2, totalW: front.totalW, totalH: Math.max(len1, len2) };
}
function computeRightLayout() {
  const front = computeFrontLayout();
  const len1 = state.members[0].dims.length;
  const len2 = state.members[1].dims.length;
  const m1 = { y: front.m1.y, h: front.m1.h, x: 0, w: len1 };
  const m2 = { y: front.m2.y, h: front.m2.h, x: 0, w: len2 };
  return { m1, m2, totalW: Math.max(len1, len2), totalH: front.totalH };
}

// ---------- Sentence templates per joint arrangement ----------
const JOINT_SENTENCE = {
  tjoint: (d1, d2) => `T-joint: ${d2}, perpendicular to ${d1}.`,
  butt:   (d1, d2) => `Butt joint: ${d1} and ${d2}, edge to edge.`,
  lap:    (d1, d2) => `Lap joint: ${d1}, overlapped by ${d2}.`,
  corner: (d1, d2) => `Corner joint: ${d1} and ${d2}, at a right angle.`,
  edge:   (d1, d2) => `Edge joint: ${d1} and ${d2}, stacked, edges aligned.`
};

function $(id) { return document.getElementById(id); }

// ---------- Joint type picker ----------
function renderJointTypeGrid() {
  const grid = $("joint-type-grid");
  grid.innerHTML = "";
  Object.keys(JOINT_ARRANGEMENTS).forEach(key => {
    const j = JOINT_ARRANGEMENTS[key];
    const b = document.createElement("button");
    b.type = "button";
    b.className = state.jointType === key ? "active" : "";
    b.textContent = j.label;
    b.setAttribute("aria-pressed", state.jointType === key ? "true" : "false");
    b.addEventListener("click", () => { state.jointType = key; state.attachOffset = 0; render(); });
    grid.appendChild(b);
  });
  renderAttachOffset();
}

// Only meaningful for T-joint and Corner, where Member 2 stacks on top
// of Member 1 — lets it sink down to rest on an internal feature (like
// an I-beam's web) instead of always sitting at the very top edge.
function renderAttachOffset() {
  const wrap = $("attach-offset-wrap");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (state.jointType !== "tjoint" && state.jointType !== "corner") return;

  const s1 = getRotatedCrossSection(state.members[0]);
  const s2 = getRotatedCrossSection(state.members[1]);
  const maxOffset = Math.round(Math.min(s2.w * 0.9, s1.h * 0.9) * 1000) / 1000;
  state.attachOffset = Math.min(state.attachOffset || 0, maxOffset);

  const group = document.createElement("div");
  group.className = "field-group";
  group.style.marginTop = "12px";
  const label = document.createElement("label");
  label.setAttribute("for", "attach-offset-range");
  label.textContent = "Member 2 attachment depth";
  group.appendChild(label);
  const hint = document.createElement("p");
  hint.className = "field-hint";
  hint.style.margin = "2px 0 8px";
  hint.textContent = "How far Member 2 sinks down to rest on an internal surface (like an I-beam's web) instead of the very top edge.";
  group.appendChild(hint);

  const row = document.createElement("div");
  row.className = "number-input-row";
  const range = document.createElement("input");
  range.type = "range";
  range.id = "attach-offset-range";
  range.min = 0; range.max = maxOffset || 0.01; range.step = 0.0625;
  range.value = state.attachOffset;
  const number = document.createElement("input");
  number.type = "number";
  number.min = 0; number.max = maxOffset || 0.01; number.step = 0.0625;
  number.value = state.attachOffset;
  number.setAttribute("aria-label", "Attachment depth in inches");
  const unit = document.createElement("span");
  unit.className = "unit-suffix";
  unit.textContent = "in";

  function apply(v) {
    const clamped = Math.min(maxOffset, Math.max(0, v));
    state.attachOffset = clamped;
    range.value = clamped;
    number.value = clamped;
    renderAllViews();
    renderDescription();
  }
  range.addEventListener("input", () => apply(parseFloat(range.value)));
  number.addEventListener("change", () => apply(isNaN(parseFloat(number.value)) ? 0 : parseFloat(number.value)));

  row.appendChild(range);
  row.appendChild(number);
  row.appendChild(unit);
  group.appendChild(row);
  wrap.appendChild(group);
}

// ---------- Member tabs ----------
function selectMember(i) {
  state.activeMember = i;
  render();
}

// ---------- Member editor (material + dimension fields) ----------
function renderMemberEditor() {
  $("tab-member-0").classList.toggle("active", state.activeMember === 0);
  $("tab-member-0").setAttribute("aria-selected", state.activeMember === 0 ? "true" : "false");
  $("tab-member-1").classList.toggle("active", state.activeMember === 1);
  $("tab-member-1").setAttribute("aria-selected", state.activeMember === 1 ? "true" : "false");

  const member = state.members[state.activeMember];
  const container = $("member-editor");
  container.innerHTML = "";

  const matLabel = document.createElement("label");
  matLabel.setAttribute("for", "material-select");
  matLabel.textContent = "Material type";
  matLabel.style.cssText = "display:block;font-size:13px;font-weight:600;margin-bottom:5px;";
  container.appendChild(matLabel);

  const select = document.createElement("select");
  select.id = "material-select";
  MATERIAL_GROUPS.forEach(group => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group;
    Object.keys(MATERIAL_TYPES).filter(k => MATERIAL_TYPES[k].group === group).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = MATERIAL_TYPES[key].label;
      if (key === member.material) opt.selected = true;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
  select.addEventListener("change", () => {
    member.material = select.value;
    member.dims = defaultDims(select.value);
    member.rotation = 0;
    render();
  });
  container.appendChild(select);

  // Orientation — quarter-turn rotation of this member about its own length axis
  const rotateRow = document.createElement("div");
  rotateRow.className = "rotate-row";
  const rotateBtn = document.createElement("button");
  rotateBtn.type = "button";
  rotateBtn.className = "btn-rotate";
  rotateBtn.innerHTML = "&#8635; Rotate 90&deg;";
  rotateBtn.setAttribute("aria-label", "Rotate this member a quarter turn");
  const rotateReadout = document.createElement("span");
  rotateReadout.className = "rotate-readout";
  rotateReadout.id = "rotate-readout";
  rotateReadout.textContent = "Orientation: " + (member.rotation || 0) + "\u00B0";
  rotateBtn.addEventListener("click", () => {
    member.rotation = ((member.rotation || 0) + 90) % 360;
    rotateReadout.textContent = "Orientation: " + member.rotation + "\u00B0";
    renderAllViews();
    renderDescription();
  });
  rotateRow.appendChild(rotateBtn);
  rotateRow.appendChild(rotateReadout);
  container.appendChild(rotateRow);

  container.appendChild(buildPositionControls(member));

  const dimsWrap = document.createElement("div");
  dimsWrap.style.marginTop = "14px";
  const mat = MATERIAL_TYPES[member.material];
  mat.params.forEach(paramKey => {
    const def = MATERIAL_PARAM_DEFS[paramKey];
    const group = document.createElement("div");
    group.className = "field-group";

    const label = document.createElement("label");
    label.setAttribute("for", "dim-range-" + paramKey);
    label.textContent = def.label;
    group.appendChild(label);

    const row = document.createElement("div");
    row.className = "number-input-row";

    const range = document.createElement("input");
    range.type = "range";
    range.id = "dim-range-" + paramKey;
    range.min = def.min; range.max = def.max; range.step = def.step;
    range.value = member.dims[paramKey];

    const number = document.createElement("input");
    number.type = "number";
    number.id = "dim-num-" + paramKey;
    number.min = def.min; number.max = def.max; number.step = def.step;
    number.value = member.dims[paramKey];
    number.setAttribute("aria-label", def.label + " in inches, type an exact value");

    const unit = document.createElement("span");
    unit.className = "unit-suffix";
    unit.setAttribute("aria-hidden", "true");
    unit.textContent = def.unit || "";

    function applyValue(v) {
      const clamped = Math.min(def.max, Math.max(def.min, v));
      member.dims[paramKey] = clamped;
      range.value = clamped;
      number.value = clamped;
      renderAllViews();
      renderDescription();
    }
    range.addEventListener("input", () => applyValue(parseFloat(range.value)));
    number.addEventListener("change", () => {
      const v = parseFloat(number.value);
      applyValue(isNaN(v) ? def.default : v);
    });

    row.appendChild(range);
    row.appendChild(number);
    row.appendChild(unit);
    group.appendChild(row);
    dimsWrap.appendChild(group);
  });
  container.appendChild(dimsWrap);
}

// Manual left/right/up/down nudge on top of the automatic joint
// arrangement — independent of rotation and attachment depth. Position
// is stored in Front view's coordinate frame (X = horizontal, Y =
// vertical, positive Y is downward) and propagates into Top (via X)
// and Right Side (via Y) automatically since those views derive their
// positions directly from Front's.
const NUDGE_STEP = 0.125;

function buildPositionControls(member) {
  const wrap = document.createElement("div");
  wrap.className = "field-group";

  const label = document.createElement("label");
  label.textContent = "Position (nudge from automatic placement)";
  wrap.appendChild(label);

  const grid = document.createElement("div");
  grid.className = "nudge-grid";

  const readout = document.createElement("div");
  readout.className = "position-readout";

  function updateReadout() {
    const ox = member.offsetX || 0, oy = member.offsetY || 0;
    const dist = Math.sqrt(ox * ox + oy * oy);
    if (dist < 0.001) {
      readout.textContent = "Not moved from automatic position.";
    } else {
      const parts = [];
      if (Math.abs(ox) > 0.001) parts.push((ox > 0 ? "right " : "left ") + fmtIn(Math.abs(ox)));
      if (Math.abs(oy) > 0.001) parts.push((oy > 0 ? "down " : "up ") + fmtIn(Math.abs(oy)));
      readout.textContent = "Moved " + fmtIn(dist) + " total (" + parts.join(", ") + ")";
    }
  }

  function nudge(dx, dy) {
    member.offsetX = Math.round(((member.offsetX || 0) + dx) * 10000) / 10000;
    member.offsetY = Math.round(((member.offsetY || 0) + dy) * 10000) / 10000;
    updateReadout();
    renderAllViews();
    renderDescription();
  }

  const dirs = [
    { cls: "nudge-up", label: "Move up", glyph: "\u2191", dx: 0, dy: -NUDGE_STEP },
    { cls: "nudge-left", label: "Move left", glyph: "\u2190", dx: -NUDGE_STEP, dy: 0 },
    { cls: "nudge-center", label: null, glyph: "+", dx: null, dy: null },
    { cls: "nudge-right", label: "Move right", glyph: "\u2192", dx: NUDGE_STEP, dy: 0 },
    { cls: "nudge-down", label: "Move down", glyph: "\u2193", dx: 0, dy: NUDGE_STEP }
  ];
  dirs.forEach(d => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = d.cls;
    b.textContent = d.glyph;
    if (d.label) {
      b.setAttribute("aria-label", d.label + " (" + NUDGE_STEP + " inch)");
      b.addEventListener("click", () => nudge(d.dx, d.dy));
    } else {
      b.disabled = true;
      b.setAttribute("aria-hidden", "true");
      b.tabIndex = -1;
    }
    grid.appendChild(b);
  });

  wrap.appendChild(grid);
  updateReadout();
  wrap.appendChild(readout);
  return wrap;
}
function dimLineH(x1, x2, y, label) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#9FB2D1" stroke-width="1.5"/>` +
    `<line x1="${x1}" y1="${y-5}" x2="${x1}" y2="${y+5}" stroke="#9FB2D1" stroke-width="1.5"/>` +
    `<line x1="${x2}" y1="${y-5}" x2="${x2}" y2="${y+5}" stroke="#9FB2D1" stroke-width="1.5"/>` +
    `<text x="${(x1+x2)/2}" y="${y-8}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#D9E1EC">${label}</text>`;
}
function dimLineV(y1, y2, x, label) {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#9FB2D1" stroke-width="1.5"/>` +
    `<line x1="${x-5}" y1="${y1}" x2="${x+5}" y2="${y1}" stroke="#9FB2D1" stroke-width="1.5"/>` +
    `<line x1="${x-5}" y1="${y2}" x2="${x+5}" y2="${y2}" stroke="#9FB2D1" stroke-width="1.5"/>` +
    `<text x="${x-8}" y="${(y1+y2)/2}" text-anchor="end" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#D9E1EC">${label}</text>`;
}
function vbBg() { return "#12324F"; }

// Given a member as drawn in Front view (its true shape, at rectPx, with
// combined role+user rotation applied), work out where its internal
// edges (bend lines, flange/web lines, wall lines) land in absolute
// pixel space, classified as vertical (relevant to Top view, which
// shares Front's X axis) or horizontal (relevant to Right view, which
// shares Front's Y axis). Quarter-turn rotation keeps every edge exactly
// vertical or horizontal, never diagonal, so this classification is exact.
function computeInternalLines(member, roleRotation, rectPx) {
  const mat = MATERIAL_TYPES[member.material];
  const kind = mat.crossSectionKind;
  const dims = member.dims;
  const rotationDeg = ((member.rotation || 0) + (roleRotation || 0)) % 360;
  const naturalSize = mat.crossSectionSize(dims);
  const edges = internalEdges(kind, dims);

  const rotated90 = rotationDeg === 90 || rotationDeg === 270;
  const boxW = rotated90 ? rectPx.h : rectPx.w;
  const boxH = rotated90 ? rectPx.w : rectPx.h;
  const shapeScale = Math.min(boxW / naturalSize.w, boxH / naturalSize.h);
  const shapeW = naturalSize.w * shapeScale, shapeH = naturalSize.h * shapeScale;
  const cx = rectPx.x + rectPx.w / 2, cy = rectPx.y + rectPx.h / 2;
  const offX = cx - shapeW / 2, offY = cy - shapeH / 2;
  const rad = rotationDeg * Math.PI / 180;
  const cos = Math.round(Math.cos(rad) * 1000) / 1000, sin = Math.round(Math.sin(rad) * 1000) / 1000;

  function rotatePoint(px, py) {
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  const verticalX = [], horizontalY = [];
  edges.xEdges.forEach(ex => {
    const p1 = rotatePoint(offX + ex * shapeScale, offY);
    const p2 = rotatePoint(offX + ex * shapeScale, offY + shapeH);
    if (Math.abs(p1.x - p2.x) < 0.5) verticalX.push(p1.x); else horizontalY.push(p1.y);
  });
  edges.yEdges.forEach(ey => {
    const p1 = rotatePoint(offX, offY + ey * shapeScale);
    const p2 = rotatePoint(offX + shapeW, offY + ey * shapeScale);
    if (Math.abs(p1.x - p2.x) < 0.5) verticalX.push(p1.x); else horizontalY.push(p1.y);
  });
  return { verticalX, horizontalY };
}

// ---------- True cross-section shape rendering (Front view only) ----------
function trueShapeMarkup(member, rectPx, roleRotation) {
  const mat = MATERIAL_TYPES[member.material];
  const kind = mat.crossSectionKind;
  const dims = member.dims;
  const rotationDeg = ((member.rotation || 0) + (roleRotation || 0)) % 360;
  const naturalSize = mat.crossSectionSize(dims);

  const rotated90 = rotationDeg === 90 || rotationDeg === 270;
  const boxW = rotated90 ? rectPx.h : rectPx.w;
  const boxH = rotated90 ? rectPx.w : rectPx.h;
  const shapeScale = Math.min(boxW / naturalSize.w, boxH / naturalSize.h);
  const shapeW = naturalSize.w * shapeScale, shapeH = naturalSize.h * shapeScale;
  const cx = rectPx.x + rectPx.w / 2, cy = rectPx.y + rectPx.h / 2;
  const offX = cx - shapeW / 2, offY = cy - shapeH / 2;

  let inner = "";
  const circles = crossSectionCircles(kind, dims);
  if (circles) {
    const ccx = offX + shapeW / 2, ccy = offY + shapeH / 2;
    inner += `<circle cx="${ccx}" cy="${ccy}" r="${circles.outerR * shapeScale}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
    if (circles.innerR > 0) {
      inner += `<circle cx="${ccx}" cy="${ccy}" r="${circles.innerR * shapeScale}" fill="${vbBg()}" stroke="${NAVY_STROKE}" stroke-width="1.5"/>`;
    }
  } else if (kind === "sqtube") {
    inner += `<rect x="${offX}" y="${offY}" width="${shapeW}" height="${shapeH}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
    const wt = dims.wallThick * shapeScale;
    const iw = Math.max(shapeW - wt * 2, 0), ih = Math.max(shapeH - wt * 2, 0);
    if (iw > 0 && ih > 0) {
      inner += `<rect x="${offX + wt}" y="${offY + wt}" width="${iw}" height="${ih}" fill="${vbBg()}" stroke="${NAVY_STROKE}" stroke-width="1.5"/>`;
    }
  } else if (kind === "rect") {
    inner += `<rect x="${offX}" y="${offY}" width="${shapeW}" height="${shapeH}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
  } else {
    const pts = crossSectionPoints(kind, dims);
    if (pts) {
      const scaled = pts.map(([x, y]) => `${offX + x * shapeScale},${offY + y * shapeScale}`).join(" ");
      inner += `<polygon points="${scaled}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
    }
  }

  if (rotationDeg !== 0) {
    return `<g transform="rotate(${rotationDeg} ${cx} ${cy})">${inner}</g>`;
  }
  return inner;
}

// ---------- Render one view into a given px origin/scale ----------
function renderViewInto(viewKey, layout, originX, originY, scale, useTrueShapes, internalLines1, internalLines2) {
  function px(rect) {
    return { x: originX + rect.x * scale, y: originY + rect.y * scale, w: rect.w * scale, h: rect.h * scale };
  }
  const r1 = px(layout.m1), r2 = px(layout.m2);

  let markup = "";
  if (useTrueShapes) {
    const roles = ROLE_ROTATION[state.jointType];
    markup += trueShapeMarkup(state.members[0], r1, roles.m1);
    markup += trueShapeMarkup(state.members[1], r2, roles.m2);
  } else {
    // Top/Right: plain extruded silhouettes. M2 is drawn after M1 so it
    // visibly sits on top where the two overlap, matching how the
    // upright member would actually occlude the base from above/beside.
    markup += `<rect x="${r1.x}" y="${r1.y}" width="${r1.w}" height="${r1.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;
    markup += `<rect x="${r2.x}" y="${r2.y}" width="${r2.w}" height="${r2.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.95"/>`;

    // Internal edges (bend lines, flange/web lines, wall lines) extruded
    // the full length of this view — otherwise features only Front's
    // true shape shows (like an angle iron's inner bend) would silently
    // disappear from Top/Right, even though they're really there.
    function drawLines(lines, r) {
      let m = "";
      (lines.verticalX || []).forEach(x => {
        m += `<line x1="${x}" y1="${r.y}" x2="${x}" y2="${r.y + r.h}" stroke="${NAVY_STROKE}" stroke-width="1.5" opacity="0.85"/>`;
      });
      (lines.horizontalY || []).forEach(y => {
        m += `<line x1="${r.x}" y1="${y}" x2="${r.x + r.w}" y2="${y}" stroke="${NAVY_STROKE}" stroke-width="1.5" opacity="0.85"/>`;
      });
      return m;
    }
    if (internalLines1) markup += drawLines(internalLines1, r1);
    if (internalLines2) markup += drawLines(internalLines2, r2);
  }

  markup += dimLineH(r1.x, r1.x + r1.w, Math.max(r1.y + r1.h, r2.y + r2.h) + 24, fmtIn(layout.m1.w));
  markup += dimLineV(r1.y, r1.y + r1.h, r1.x - 16, fmtIn(layout.m1.h));

  if (layout.m2.h >= layout.m2.w) {
    markup += dimLineV(r2.y, r2.y + r2.h, r2.x + r2.w + 16, fmtIn(layout.m2.h));
    markup += dimLineH(r2.x, r2.x + r2.w, r2.y - 12, fmtIn(layout.m2.w));
  } else {
    markup += dimLineH(r2.x, r2.x + r2.w, r2.y - 12, fmtIn(layout.m2.w));
    markup += dimLineV(r2.y, r2.y + r2.h, r2.x - 16, fmtIn(layout.m2.h));
  }

  markup += `<text x="${r1.x + r1.w/2}" y="${r1.y + r1.h/2 + 4}" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="600" font-size="11" fill="#0F1D36">M1</text>`;
  markup += `<text x="${r2.x + r2.w/2}" y="${r2.y + r2.h/2 + 4}" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="600" font-size="11" fill="#0F1D36">M2</text>`;

  return markup;
}

// ---------- Glass-box layout: Top above Front, Right Side beside Front ----------
function renderAllViews() {
  const svg = $("elevation-svg");
  const VB_W = 1150, VB_H = 950;
  const outerPad = 60, gutter = 60, labelSpace = 30, dimSpace = 60;

  const frontL = computeFrontLayout();

  if (!state.showPrincipalViews) {
    // Front view only, enlarged to use the full canvas.
    const availW = VB_W - outerPad * 2 - dimSpace;
    const availH = VB_H - outerPad * 2 - labelSpace - dimSpace;
    const scale = Math.min(availW / frontL.totalW, availH / frontL.totalH);
    const x0 = outerPad + dimSpace + (availW - frontL.totalW * scale) / 2;
    const y0 = outerPad + labelSpace + (availH - frontL.totalH * scale) / 2;

    let markup = `<text x="${x0}" y="${y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">FRONT VIEW</text>`;
    markup += renderViewInto("front", frontL, x0, y0, scale, true);
    markup += movementIndicatorMarkup(frontL, x0, y0, scale);
    svg.innerHTML = markup;
    svg.querySelector("title").textContent = "Front view";
    svg.querySelector("desc").textContent =
      `Front view of Member 1 (${MATERIAL_TYPES[state.members[0].material].label}) and Member 2 (${MATERIAL_TYPES[state.members[1].material].label}) in a ${JOINT_ARRANGEMENTS[state.jointType].label}. Top and Right Side views are currently hidden.`;
    return;
  }

  const topL = computeTopLayout();
  const rightL = computeRightLayout();

  const colAIn = Math.max(frontL.totalW, topL.totalW);
  const colBIn = rightL.totalW;
  const row1In = topL.totalH;
  const row2In = Math.max(frontL.totalH, rightL.totalH);

  const availW = VB_W - outerPad * 2 - gutter - dimSpace;
  const availH = VB_H - outerPad * 2 - gutter - labelSpace * 2 - dimSpace;
  const scale = Math.min(availW / (colAIn + colBIn), availH / (row1In + row2In));

  const colA_x0 = outerPad + dimSpace;
  const colB_x0 = colA_x0 + colAIn * scale + gutter;
  const row1_y0 = outerPad + labelSpace;
  const row2_y0 = row1_y0 + row1In * scale + gutter + labelSpace;

  // Front's pixel rects are needed first, since Top/Right's internal
  // detail lines (bend lines, wall lines, etc.) are derived from exactly
  // how Front's true shape ends up rotated and positioned.
  const frontR1 = { x: colA_x0 + frontL.m1.x * scale, y: row2_y0 + frontL.m1.y * scale, w: frontL.m1.w * scale, h: frontL.m1.h * scale };
  const frontR2 = { x: colA_x0 + frontL.m2.x * scale, y: row2_y0 + frontL.m2.y * scale, w: frontL.m2.w * scale, h: frontL.m2.h * scale };
  const roles = ROLE_ROTATION[state.jointType];
  const lines1 = computeInternalLines(state.members[0], roles.m1, frontR1);
  const lines2 = computeInternalLines(state.members[1], roles.m2, frontR2);

  let markup = "";
  markup += `<text x="${colA_x0}" y="${row1_y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">TOP VIEW</text>`;
  markup += renderViewInto("top", topL, colA_x0, row1_y0, scale, false,
    { verticalX: lines1.verticalX }, { verticalX: lines2.verticalX });
  markup += `<text x="${colA_x0}" y="${row2_y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">FRONT VIEW</text>`;
  markup += renderViewInto("front", frontL, colA_x0, row2_y0, scale, true);
  markup += movementIndicatorMarkup(frontL, colA_x0, row2_y0, scale);
  markup += `<text x="${colB_x0}" y="${row2_y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">RIGHT SIDE VIEW</text>`;
  markup += renderViewInto("right", rightL, colB_x0, row2_y0, scale, false,
    { horizontalY: lines1.horizontalY }, { horizontalY: lines2.horizontalY });

  // Thin reference lines showing how the views align, like the classic
  // glass-box unfold — not structural, purely a visual aid.
  markup += `<line x1="${colA_x0}" y1="${row2_y0}" x2="${colA_x0}" y2="${row1_y0 + row1In*scale}" stroke="#3A5578" stroke-width="1" stroke-dasharray="3 4"/>`;
  markup += `<line x1="${colA_x0}" y1="${row2_y0}" x2="${colB_x0}" y2="${row2_y0}" stroke="#3A5578" stroke-width="1" stroke-dasharray="3 4"/>`;

  svg.innerHTML = markup;
  svg.querySelector("title").textContent = "Front, Top, and Right Side views";
  svg.querySelector("desc").textContent =
    `Third-angle orthographic views of Member 1 (${MATERIAL_TYPES[state.members[0].material].label}) and Member 2 (${MATERIAL_TYPES[state.members[1].material].label}) in a ${JOINT_ARRANGEMENTS[state.jointType].label}.`;
}

// Small "moved X in" label near any member that's been manually nudged,
// shown in Front view (the one view where nudging is visually direct).
function movementIndicatorMarkup(frontL, originX, originY, scale) {
  let markup = "";
  [frontL.m1, frontL.m2].forEach((rect, idx) => {
    const member = state.members[idx];
    const ox = member.offsetX || 0, oy = member.offsetY || 0;
    const dist = Math.sqrt(ox * ox + oy * oy);
    if (dist < 0.001) return;
    const px = originX + (rect.x + rect.w) * scale + 6;
    const py = originY + rect.y * scale - 6;
    markup += `<text x="${px}" y="${py}" font-family="IBM Plex Mono, monospace" font-size="11" fill="${RED_ACCENT}">M${idx+1} moved ${fmtIn(dist)}</text>`;
  });
  return markup;
}

// ---------- Description generator ----------
const DESC_MAX_CHARS = 120;

function renderDescription() {
  try {
    const d1 = MATERIAL_TYPES[state.members[0].material].describe(state.members[0].dims);
    const d2 = MATERIAL_TYPES[state.members[1].material].describe(state.members[1].dims);
    let sentence = JOINT_SENTENCE[state.jointType](d1, d2);
    if (sentence.length > DESC_MAX_CHARS) {
      sentence = sentence.slice(0, DESC_MAX_CHARS - 1).replace(/\s+\S*$/, "") + "\u2026";
    }
    $("desc-text").textContent = sentence;
  } catch (err) {
    console.error("Description generation failed:", err);
    $("desc-text").textContent = "Could not generate a description for this combination — check the browser console for details.";
  }
}

$("copy-desc-btn").addEventListener("click", () => {
  const text = $("desc-text").textContent;
  navigator.clipboard.writeText(text).then(() => {
    $("copy-status").textContent = "Copied.";
    setTimeout(() => { $("copy-status").textContent = ""; }, 2500);
  }).catch(() => {
    $("copy-status").textContent = "Could not copy — select and copy the text manually.";
  });
});

$("toggle-principal-views").addEventListener("click", () => {
  state.showPrincipalViews = !state.showPrincipalViews;
  const btn = $("toggle-principal-views");
  btn.setAttribute("aria-pressed", String(state.showPrincipalViews));
  btn.textContent = "Top & Right Side views: " + (state.showPrincipalViews ? "On" : "Off");
  renderAllViews();
});

$("reset-positions-btn").addEventListener("click", () => {
  state.members.forEach(m => { m.offsetX = 0; m.offsetY = 0; });
  renderMemberEditor();
  renderAllViews();
  renderDescription();
});

// ---------- Orchestration ----------
function render() {
  renderJointTypeGrid();
  renderMemberEditor();
  renderAllViews();
  renderDescription();
}

render();
