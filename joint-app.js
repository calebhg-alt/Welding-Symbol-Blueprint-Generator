// ============================================================
// JOINT BUILDER — APPLICATION LOGIC
// ============================================================

const state = {
  jointType: "tjoint",
  activeMember: 0,
  members: [
    { material: "flat", dims: defaultDims("flat"), rotation: 0 },
    { material: "flat", dims: defaultDims("flat"), rotation: 0 }
  ]
};

const NAVY = "#8FA3C2";
const NAVY_STROKE = "#E8EEF5";
const RED_ACCENT = "#F2C744";

// A member's LENGTH is only visible in a view when its length axis
// isn't the axis that view is looking straight down. When it IS
// (e.g. a T-joint's upright, viewed from Top, looking down its own
// length) the member shows only its true cross-section instead of
// being stretched into a rectangle it doesn't actually look like.
function getMemberViewGeometry(member, lengthAxis, viewKey) {
  const mat = MATERIAL_TYPES[member.material];
  const cs = mat.crossSectionSize(member.dims);
  const rot = member.rotation || 0;
  const rotSwap = (rot === 90 || rot === 270);
  const length = member.dims.length;
  const hidden = VIEW_HIDDEN_AXIS[viewKey];

  if (lengthAxis === hidden) {
    let horiz, vert;
    if (viewKey === "top") { horiz = cs.h; vert = cs.w; } else { horiz = cs.w; vert = cs.h; }
    if (rotSwap) { const t = horiz; horiz = vert; vert = t; }
    return { size: { h: vert, w: horiz }, mode: "crosssection" };
  }
  if (lengthAxis === "X") {
    const extent = (viewKey === "front") ? (rotSwap ? cs.w : cs.h) : (rotSwap ? cs.h : cs.w);
    return { size: { h: extent, w: length }, mode: "elevation" };
  }
  const extent = (viewKey === "front") ? (rotSwap ? cs.w : cs.h) : (rotSwap ? cs.h : cs.w);
  return { size: { h: length, w: extent }, mode: "elevation" };
}

// ---------- Joint-type-specific positional arrangement (pure geometry) ----------
function arrangeMembers(jointType, s1, s2) {
  if (jointType === "tjoint") {
    const totalW = Math.max(s1.w, s2.h);
    const totalH = s1.h + s2.w;
    const m1 = { x: (totalW - s1.w) / 2, y: totalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: (totalW - s2.h) / 2, y: 0, w: s2.h, h: s2.w };
    return { m1, m2, totalW, totalH };
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
    const totalW = s1.w;
    const totalH = s1.h + s2.w;
    const m1 = { x: 0, y: totalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: Math.max(0, s1.w - s2.h), y: 0, w: Math.min(s2.h, s1.w), h: s2.w };
    return { m1, m2, totalW, totalH };
  }
  // edge — edges sit directly against one another, no gap
  const totalW = Math.max(s1.w, s2.w);
  const totalH = s1.h + s2.h;
  const m1 = { x: (totalW - s1.w) / 2, y: totalH - s1.h, w: s1.w, h: s1.h };
  const m2 = { x: (totalW - s2.w) / 2, y: 0, w: s2.w, h: s2.h };
  return { m1, m2, totalW, totalH };
}

function computeViewLayout(viewKey) {
  const axes = JOINT_MEMBER_AXES[state.jointType];
  const g1 = getMemberViewGeometry(state.members[0], axes.m1, viewKey);
  const g2 = getMemberViewGeometry(state.members[1], axes.m2, viewKey);
  const layout = arrangeMembers(state.jointType, g1.size, g2.size);
  return { layout, mode1: g1.mode, mode2: g2.mode };
}

// ---------- Sentence templates per joint arrangement ----------
const JOINT_SENTENCE = {
  tjoint: (d1, d2) => `T-joint formed by ${d2} welded perpendicular to ${d1}.`,
  butt:   (d1, d2) => `Butt joint formed by ${d1} and ${d2}, joined edge to edge in the same plane.`,
  lap:    (d1, d2) => `Lap joint formed by ${d1} overlapping ${d2}.`,
  corner: (d1, d2) => `Corner joint formed by ${d1} and ${d2}, meeting at a right-angle corner.`,
  edge:   (d1, d2) => `Edge joint formed by ${d1} and ${d2}, stacked with edges aligned.`
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
    b.addEventListener("click", () => { state.jointType = key; render(); });
    grid.appendChild(b);
  });
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

// ---------- Dimension callout drawing helpers ----------
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

// ---------- True cross-section shape rendering ----------
// naturalSize/scale are computed in the shape's own unrotated orientation,
// then the whole shape is rotated around the target rect's center — this
// keeps asymmetric shapes (angle iron, C-channel) genuinely correct under
// quarter-turn rotation rather than just stretching to fit.
function trueShapeMarkup(member, rectPx) {
  const mat = MATERIAL_TYPES[member.material];
  const kind = mat.crossSectionKind;
  const dims = member.dims;
  const rotationDeg = member.rotation || 0;
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
function vbBg() { return "#12324F"; }

// ---------- Render one view's members + dimensions into a given px origin/scale ----------
function renderViewInto(viewKey, originX, originY, scale) {
  const { layout, mode1, mode2 } = computeViewLayout(viewKey);
  function px(rect) {
    return { x: originX + rect.x * scale, y: originY + rect.y * scale, w: rect.w * scale, h: rect.h * scale };
  }
  const r1 = px(layout.m1), r2 = px(layout.m2);

  let markup = "";
  markup += (mode1 === "crosssection")
    ? trueShapeMarkup(state.members[0], r1)
    : `<rect x="${r1.x}" y="${r1.y}" width="${r1.w}" height="${r1.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;
  markup += (mode2 === "crosssection")
    ? trueShapeMarkup(state.members[1], r2)
    : `<rect x="${r2.x}" y="${r2.y}" width="${r2.w}" height="${r2.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;

  // Dimension callouts: M1 gets width-below / height-left. M2's callout
  // side is chosen from its own proportions (tall vs. wide) so it reads
  // sensibly whether it's a full elevation or a small cross-section box.
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

  const bounds = { x: originX, y: originY, w: layout.totalW * scale, h: layout.totalH * scale };
  return { markup, bounds, layout };
}

// ---------- Glass-box layout: Top above Front, Right Side beside Front ----------
function renderAllViews() {
  const svg = $("elevation-svg");
  const VB_W = 1150, VB_H = 950;
  const outerPad = 60, gutter = 60, labelSpace = 30, dimSpace = 60;

  const frontRaw = computeViewLayout("front").layout;
  const topRaw = computeViewLayout("top").layout;
  const rightRaw = computeViewLayout("right").layout;

  // Shared column (Front & Top, both measured along the length axis)
  const colAIn = Math.max(frontRaw.totalW, topRaw.totalW);
  const colBIn = rightRaw.totalW;
  // Shared row (Front & Right, both measured along the height axis)
  const row1In = topRaw.totalH;
  const row2In = Math.max(frontRaw.totalH, rightRaw.totalH);

  const availW = VB_W - outerPad * 2 - gutter - dimSpace;
  const availH = VB_H - outerPad * 2 - gutter - labelSpace * 2 - dimSpace;
  const scale = Math.min(availW / (colAIn + colBIn), availH / (row1In + row2In));

  const colA_x0 = outerPad + dimSpace;
  const colB_x0 = colA_x0 + colAIn * scale + gutter;
  const row1_y0 = outerPad + labelSpace;
  const row2_y0 = row1_y0 + row1In * scale + gutter + labelSpace;

  const front = renderViewInto("front", colA_x0, row2_y0, scale);
  const top = renderViewInto("top", colA_x0, row1_y0, scale);
  const right = renderViewInto("right", colB_x0, row2_y0, scale);

  let markup = "";
  markup += `<text x="${colA_x0}" y="${row1_y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">TOP VIEW</text>`;
  markup += top.markup;
  markup += `<text x="${colA_x0}" y="${row2_y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">FRONT VIEW</text>`;
  markup += front.markup;
  markup += `<text x="${colB_x0}" y="${row2_y0 - 12}" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="700" font-size="14" letter-spacing="0.06em" fill="#D9E1EC">RIGHT SIDE VIEW</text>`;
  markup += right.markup;

  // Thin reference lines showing how the views align, like the classic
  // glass-box unfold — not structural, purely a visual aid.
  markup += `<line x1="${colA_x0}" y1="${row2_y0}" x2="${colA_x0}" y2="${row1_y0 + row1In*scale}" stroke="#3A5578" stroke-width="1" stroke-dasharray="3 4"/>`;
  markup += `<line x1="${colA_x0}" y1="${row2_y0}" x2="${colB_x0}" y2="${row2_y0}" stroke="#3A5578" stroke-width="1" stroke-dasharray="3 4"/>`;

  svg.innerHTML = markup;
  svg.querySelector("title").textContent = "Front, Top, and Right Side views";
  svg.querySelector("desc").textContent =
    `Third-angle orthographic views of Member 1 (${MATERIAL_TYPES[state.members[0].material].label}) and Member 2 (${MATERIAL_TYPES[state.members[1].material].label}) in a ${JOINT_ARRANGEMENTS[state.jointType].label}.`;
}

// ---------- Description generator ----------
function renderDescription() {
  const d1 = MATERIAL_TYPES[state.members[0].material].describe(state.members[0].dims);
  const d2 = MATERIAL_TYPES[state.members[1].material].describe(state.members[1].dims);
  const sentence = JOINT_SENTENCE[state.jointType](d1, d2);
  $("desc-text").textContent = sentence;
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

// ---------- Orchestration ----------
function render() {
  renderJointTypeGrid();
  renderMemberEditor();
  renderAllViews();
  renderDescription();
}

render();
