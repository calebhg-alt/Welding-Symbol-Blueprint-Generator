// ============================================================
// JOINT BUILDER — APPLICATION LOGIC
// ============================================================

const state = {
  jointType: "tjoint",
  activeMember: 0,
  members: [
    { material: "flat", dims: defaultDims("flat") },
    { material: "flat", dims: defaultDims("flat") }
  ]
};

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
    render();
  });
  container.appendChild(select);

  const dimsWrap = document.createElement("div");
  dimsWrap.style.marginTop = "14px";
  const mat = MATERIAL_TYPES[member.material];
  mat.params.forEach(paramKey => {
    const def = MATERIAL_PARAM_DEFS[paramKey];
    const group = document.createElement("div");
    group.className = "field-group";

    const label = document.createElement("label");
    label.setAttribute("for", "dim-" + paramKey);
    const valSpan = document.createElement("span");
    valSpan.className = "field-value";
    valSpan.id = "dimval-" + paramKey;
    valSpan.textContent = fmtIn(member.dims[paramKey]);
    label.textContent = def.label + " ";
    label.appendChild(valSpan);
    group.appendChild(label);

    const range = document.createElement("input");
    range.type = "range";
    range.id = "dim-" + paramKey;
    range.min = def.min; range.max = def.max; range.step = def.step;
    range.value = member.dims[paramKey];
    range.addEventListener("input", () => {
      member.dims[paramKey] = parseFloat(range.value);
      valSpan.textContent = fmtIn(member.dims[paramKey]);
      renderElevation();
      renderCrossSections();
      renderDescription();
    });
    group.appendChild(range);
    dimsWrap.appendChild(group);
  });
  container.appendChild(dimsWrap);

  const showCrossToggle = document.createElement("label");
  showCrossToggle.className = "checkbox-row";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = member.showCrossSection !== false;
  cb.disabled = !mat.crossSectionKind;
  cb.addEventListener("change", () => { member.showCrossSection = cb.checked; renderCrossSections(); });
  showCrossToggle.appendChild(cb);
  showCrossToggle.appendChild(document.createTextNode(
    mat.crossSectionKind ? "Show true cross-section view" : "This shape is fully shown by the elevation view alone"
  ));
  container.appendChild(showCrossToggle);
}

// ---------- Layout math (real-world inches, before scaling) ----------
function computeLayout() {
  const s1 = MATERIAL_TYPES[state.members[0].material].elevationSize(state.members[0].dims);
  const s2 = MATERIAL_TYPES[state.members[1].material].elevationSize(state.members[1].dims);

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
  // edge
  const gapY = Math.max(s1.h, s2.h) * 0.25;
  const totalW = Math.max(s1.w, s2.w);
  const totalH = s1.h + gapY + s2.h;
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
  markup += `<rect x="${r1.x}" y="${r1.y}" width="${r1.w}" height="${r1.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;
  markup += `<rect x="${r2.x}" y="${r2.y}" width="${r2.w}" height="${r2.h}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2" opacity="0.9"/>`;

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
  svg.querySelector("title").textContent = "Joint elevation view";
  svg.querySelector("desc").textContent =
    `Side view of Member 1 (${MATERIAL_TYPES[state.members[0].material].label}) and Member 2 (${MATERIAL_TYPES[state.members[1].material].label}) in a ${JOINT_ARRANGEMENTS[state.jointType].label}.`;
}

// ---------- Cross-section view rendering ----------
function crossSectionSvgMarkup(materialKey, dims, size) {
  const mat = MATERIAL_TYPES[materialKey];
  const kind = mat.crossSectionKind;
  const padding = 30;
  const vbW = 260, vbH = 200;
  const scale = Math.min((vbW - padding * 2) / size.w, (vbH - padding * 2) / size.h);
  const offX = (vbW - size.w * scale) / 2;
  const offY = (vbH - size.h * scale) / 2;

  let shapeMarkup = "";
  const circles = crossSectionCircles(kind, dims);
  if (circles) {
    const cx = offX + size.w * scale / 2, cy = offY + size.h * scale / 2;
    shapeMarkup += `<circle cx="${cx}" cy="${cy}" r="${circles.outerR * scale}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
    if (circles.innerR > 0) {
      shapeMarkup += `<circle cx="${cx}" cy="${cy}" r="${circles.innerR * scale}" fill="${vbBg()}" stroke="${NAVY_STROKE}" stroke-width="1.5"/>`;
    }
  } else if (kind === "sqtube") {
    const ow = size.w * scale, oh = size.h * scale;
    shapeMarkup += `<rect x="${offX}" y="${offY}" width="${ow}" height="${oh}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
    const wt = dims.wallThick * scale;
    const iw = Math.max(ow - wt * 2, 0), ih = Math.max(oh - wt * 2, 0);
    if (iw > 0 && ih > 0) {
      shapeMarkup += `<rect x="${offX + wt}" y="${offY + wt}" width="${iw}" height="${ih}" fill="${vbBg()}" stroke="${NAVY_STROKE}" stroke-width="1.5"/>`;
    }
  } else {
    const pts = crossSectionPoints(kind, dims);
    if (pts) {
      const scaled = pts.map(([x, y]) => `${offX + x * scale},${offY + y * scale}`).join(" ");
      shapeMarkup += `<polygon points="${scaled}" fill="${NAVY}" stroke="${NAVY_STROKE}" stroke-width="2"/>`;
    }
  }
  return `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="True cross-section of ${mat.label}">${shapeMarkup}</svg>`;
}
function vbBg() { return "#12324F"; }

function renderCrossSections() {
  const row = $("cross-section-row");
  row.innerHTML = "";
  state.members.forEach((member, idx) => {
    const mat = MATERIAL_TYPES[member.material];
    if (!mat.crossSectionKind || member.showCrossSection === false) return;
    const size = mat.crossSectionSize(member.dims);
    const card = document.createElement("div");
    card.className = "cross-section-card";
    const labelDiv = document.createElement("div");
    labelDiv.className = "cross-section-label";
    labelDiv.textContent = `Member ${idx + 1} cross-section — ${mat.label}`;
    card.appendChild(labelDiv);
    const svgWrap = document.createElement("div");
    svgWrap.innerHTML = crossSectionSvgMarkup(member.material, member.dims, size);
    card.appendChild(svgWrap.firstChild);
    row.appendChild(card);
  });
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
  renderElevation();
  renderCrossSections();
  renderDescription();
}

render();
