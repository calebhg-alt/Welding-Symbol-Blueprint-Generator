// ============================================================
// JOINT BUILDER — APPLICATION LOGIC
// ============================================================

const state = {
  jointType: "tjoint",
  viewMode: "front",
  activeMember: 0,
  members: [
    { material: "flat", dims: defaultDims("flat"), rotation: 0 },
    { material: "flat", dims: defaultDims("flat"), rotation: 0 }
  ]
};

// Quarter-turn rotation swaps which of a member's two dimensions in
// the CURRENT principal view reads as "up" vs. "across" — lets you
// spin a member to place the weld symbol wherever reads best.
function getEffectiveSize(member) {
  const mat = MATERIAL_TYPES[member.material];
  const raw = PRINCIPAL_VIEWS[state.viewMode].size(mat, member.dims);
  const rot = member.rotation || 0;
  return (rot === 90 || rot === 270) ? { h: raw.w, w: raw.h } : raw;
}

const NAVY = "#8FA3C2";
const NAVY_STROKE = "#E8EEF5";
const RED_ACCENT = "#F2C744";

// ---------- Sentence templates per joint arrangement ----------
const JOINT_SENTENCE = {
  tjoint: (d1, d2) => `T-joint formed by ${d2} welded perpendicular to ${d1}.`,
  butt:   (d1, d2) => `Butt joint formed by ${d1} and ${d2}, joined edge to edge in the same plane.`,
  lap:    (d1, d2) => `Lap joint formed by ${d1} overlapping ${d2}.`,
  corner: (d1, d2) => `Corner joint formed by ${d1} and ${d2}, meeting at a right-angle corner.`,
  edge:   (d1, d2) => `Edge joint formed by ${d1} and ${d2}, stacked with edges aligned.`
};

function $(id) { return document.getElementById(id); }

// ---------- Principal view picker (Front / Top / End) ----------
function renderViewModeGrid() {
  const grid = $("view-mode-grid");
  if (!grid) return;
  grid.innerHTML = "";
  Object.keys(PRINCIPAL_VIEWS).forEach(key => {
    const v = PRINCIPAL_VIEWS[key];
    const b = document.createElement("button");
    b.type = "button";
    b.className = state.viewMode === key ? "active" : "";
    b.textContent = v.label;
    b.setAttribute("aria-pressed", state.viewMode === key ? "true" : "false");
    b.addEventListener("click", () => { state.viewMode = key; renderElevation(); renderViewModeGrid(); });
    grid.appendChild(b);
  });
}

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

  // Orientation — quarter-turn rotation of this member within the elevation view
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
    renderElevation();
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
      renderElevation();
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

// ---------- Layout math (real-world inches, before scaling) ----------
function computeLayout() {
  const s1 = getEffectiveSize(state.members[0]);
  const s2 = getEffectiveSize(state.members[1]);

  if (state.jointType === "tjoint") {
    const totalW = Math.max(s1.w, s2.h);
    const totalH = s1.h + s2.w;
    const m1 = { x: (totalW - s1.w) / 2, y: totalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: (totalW - s2.h) / 2, y: 0, w: s2.h, h: s2.w };
    return { m1, m2, totalW, totalH };
  }
  if (state.jointType === "butt") {
    const gap = Math.max(s1.w, s2.w) * 0.015;
    const totalW = s1.w + s2.w + gap;
    const totalH = Math.max(s1.h, s2.h);
    const m1 = { x: 0, y: totalH - s1.h, w: s1.w, h: s1.h };
    const m2 = { x: s1.w + gap, y: totalH - s2.h, w: s2.w, h: s2.h };
    return { m1, m2, totalW, totalH };
  }
  if (state.jointType === "lap") {
    const overlap = Math.min(s1.w, s2.w) * 0.4;
    const totalW = s1.w + s2.w - overlap;
    const totalH = s1.h + s2.h;
    const m1 = { x: 0, y: s2.h, w: s1.w, h: s1.h };
    const m2 = { x: s1.w - overlap, y: 0, w: s2.w, h: s2.h };
    return { m1, m2, totalW, totalH };
  }
  if (state.jointType === "corner") {
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

// ---------- Elevation view rendering ----------
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
    `<text x="${x-8}" y="${(y1+y2)/2}" text-anchor="end" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#D9E1EC" transform="rotate(0 ${x-8} ${(y1+y2)/2})">${label}</text>`;
}

function renderElevation() {
  const svg = $("elevation-svg");
  const layout = computeLayout();
  const padX = 90, padTop = 60, padBottom = 60;
  const usableW = 900 - padX * 2;
  const usableH = 460 - padTop - padBottom;
  const scale = Math.min(usableW / layout.totalW, usableH / layout.totalH);
  const offX = padX + (usableW - layout.totalW * scale) / 2;
  const offY = padTop + (usableH - layout.totalH * scale) / 2;

  function px(rect) {
    return { x: offX + rect.x * scale, y: offY + rect.y * scale, w: rect.w * scale, h: rect.h * scale };
  }
  const r1 = px(layout.m1), r2 = px(layout.m2);

  let markup = "";
  if (state.viewMode === "end") {
    markup += trueShapeMarkup(state.members[0], r1);
    markup += trueShapeMarkup(state.members[1], r2);
  } else {
    markup += `<rect x="${r1.x}" y="${r1.y}" width="${r1.w}" height="${r1.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;
    markup += `<rect x="${r2.x}" y="${r2.y}" width="${r2.w}" height="${r2.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;
  }

  // Member 1 dimensions: width along the bottom, height along the left
  markup += dimLineH(r1.x, r1.x + r1.w, Math.max(r1.y, r2.y + r2.h) + r1.h + 34, fmtIn(layout.m1.w));
  markup += dimLineV(r1.y, r1.y + r1.h, r1.x - 20, fmtIn(layout.m1.h));

  // Member 2 dimensions: its own length + thickness, placed clear of member 1
  const m2LengthIsVertical = state.jointType === "tjoint" || state.jointType === "corner";
  if (m2LengthIsVertical) {
    markup += dimLineV(r2.y, r2.y + r2.h, r2.x + r2.w + 20, fmtIn(layout.m2.h));
    markup += dimLineH(r2.x, r2.x + r2.w, r2.y - 16, fmtIn(layout.m2.w));
  } else {
    markup += dimLineH(r2.x, r2.x + r2.w, r2.y - 16, fmtIn(layout.m2.w));
    markup += dimLineV(r2.y, r2.y + r2.h, r2.x - 20, fmtIn(layout.m2.h));
  }

  markup += `<text x="${r1.x + r1.w/2}" y="${r1.y + r1.h/2 + 4}" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="600" font-size="12" fill="#0F1D36">M1</text>`;
  markup += `<text x="${r2.x + r2.w/2}" y="${r2.y + r2.h/2 + 4}" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="600" font-size="12" fill="#0F1D36">M2</text>`;

  svg.innerHTML = markup;
  svg.querySelector("title").textContent = PRINCIPAL_VIEWS[state.viewMode].label;
  svg.querySelector("desc").textContent =
    `${PRINCIPAL_VIEWS[state.viewMode].label} of Member 1 (${MATERIAL_TYPES[state.members[0].material].label}) and Member 2 (${MATERIAL_TYPES[state.members[1].material].label}) in a ${JOINT_ARRANGEMENTS[state.jointType].label}.`;
}

// ---------- True cross-section shape rendering (used for End view) ----------
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
  renderViewModeGrid();
  renderJointTypeGrid();
  renderMemberEditor();
  renderElevation();
  renderDescription();
}

render();
