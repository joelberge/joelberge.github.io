/* KI-kompasset / The AI Compass.
   All text, questions and scores live in _data/compass.yml (rendered into window.COMPASS by the layout).
   This file holds the flow (start, questions, result) and the diagnosis rules.
   Nothing is stored or sent anywhere: the answers only exist in this page. */
(function () {
  "use strict";

  var D = window.COMPASS;
  var L = document.documentElement.lang === "en" ? "en" : "nb";
  var T = D.ui[L];
  var EMAIL = window.COMPASS_EMAIL;
  var app = document.getElementById("app");
  var bar = document.getElementById("progress-bar");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = { decision: "", answers: {}, pos: 0 };

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function tr(obj) { return obj && (obj[L] || obj.nb || ""); }
  function q(id) { return D.questions.filter(function (x) { return x.id === id; })[0]; }
  function opt(question, id) { return question.options.filter(function (o) { return o.id === id; })[0]; }
  function quote(s) { return L === "nb" ? "«" + s + "»" : "“" + s + "”"; }

  function visibleQuestions() {
    return D.questions.filter(function (x) {
      if (!x.show_if) return true;
      return Object.keys(x.show_if).every(function (k) {
        return x.show_if[k].indexOf(state.answers[k]) !== -1;
      });
    });
  }

  function show(html, focusSel) {
    app.innerHTML = html;
    window.scrollTo(0, 0);
    var f = app.querySelector(focusSel || "h1");
    if (f) { f.setAttribute("tabindex", "-1"); f.focus({ preventScroll: true }); }
  }

  function setProgress(frac) {
    bar.style.width = Math.round(frac * 100) + "%";
    bar.parentNode.hidden = frac <= 0;
  }

  // ---------- start ----------
  function renderStart() {
    setProgress(0);
    var chips = T.examples.map(function (e) {
      return '<button type="button" class="chip" data-example="' + esc(e) + '">' + esc(e) + "</button>";
    }).join("");
    show(
      '<section class="start">' +
        '<div class="start-mark" aria-hidden="true">' + compassSvg(null, true) + "</div>" +
        '<h1 class="start-title">' + esc(T.title) + "</h1>" +
        '<p class="start-tag">' + esc(T.tagline) + "</p>" +
        '<form class="search" id="start-form" novalidate>' +
          '<label class="sr" for="decision">' + esc(T.input_label) + "</label>" +
          '<input id="decision" name="decision" type="text" autocomplete="off" maxlength="140" placeholder="' + esc(T.input_placeholder) + '" value="' + esc(state.decision) + '">' +
          '<button class="btn btn-solid" type="submit">' + esc(T.start) + "</button>" +
        "</form>" +
        '<p class="start-error" id="start-error" role="alert" hidden></p>' +
        '<div class="start-broad" id="start-broad" hidden>' +
          "<p>" + esc(T.too_broad) + "</p>" +
          '<div class="row"><button type="button" class="btn" id="broad-edit">' + esc(T.edit) + "</button>" +
          '<button type="button" class="btn btn-solid" id="broad-go">' + esc(T.continue_anyway) + "</button></div>" +
        "</div>" +
        '<div class="chips"><span class="chips-label">' + esc(T.examples_label) + "</span>" + chips + "</div>" +
        '<p class="start-meta">' + esc(T.meta) + "</p>" +
        '<details class="what"><summary>' + esc(T.what_is) + "</summary><p>" + esc(T.what_is_body) + "</p></details>" +
      "</section>",
      ".start-title"
    );
    var input = document.getElementById("decision");
    var form = document.getElementById("start-form");
    var err = document.getElementById("start-error");
    var broad = document.getElementById("start-broad");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim().replace(/\s+/g, " ");
      broad.hidden = true;
      if (v.length < 8) { err.textContent = T.too_short; err.hidden = false; input.focus(); return; }
      err.hidden = true;
      state.decision = v;
      var lower = v.toLowerCase();
      var isBroad = D.too_broad_words.some(function (w) { return lower.indexOf(String(w).toLowerCase()) !== -1; });
      if (isBroad) { broad.hidden = false; document.getElementById("broad-go").focus(); return; }
      begin();
    });
    document.getElementById("broad-edit").addEventListener("click", function () { broad.hidden = true; input.focus(); input.select(); });
    document.getElementById("broad-go").addEventListener("click", begin);
    Array.prototype.forEach.call(app.querySelectorAll("[data-example]"), function (b) {
      b.addEventListener("click", function () { input.value = b.getAttribute("data-example"); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); });
    });
  }

  function begin() {
    state.answers = {};
    state.pos = 0;
    renderQuestion();
  }

  // ---------- questions ----------
  function renderQuestion() {
    var list = visibleQuestions();
    if (state.pos >= list.length) return renderResult();
    var question = list[state.pos];
    setProgress(state.pos / list.length);
    var chosen = state.answers[question.id];
    var buttons = question.options.map(function (o, i) {
      return '<button type="button" class="option' + (chosen === o.id ? " is-chosen" : "") + '" data-opt="' + esc(o.id) + '" aria-pressed="' + (chosen === o.id) + '">' +
        esc(tr(o.text)) + "</button>";
    }).join("");
    show(
      '<section class="ask">' +
        '<p class="ask-context"><span class="ask-step">' + esc(T.steps[question.step]) + '</span><span class="ask-decision">' + esc(quote(state.decision)) + "</span></p>" +
        '<h1 class="ask-q">' + esc(tr(question.text)) + "</h1>" +
        '<div class="options">' + buttons + "</div>" +
        '<button type="button" class="back" id="back"><span aria-hidden="true">←</span> ' + esc(T.back) + "</button>" +
      "</section>",
      ".ask-q"
    );
    Array.prototype.forEach.call(app.querySelectorAll("[data-opt]"), function (b) {
      b.addEventListener("click", function () { answer(question, b.getAttribute("data-opt")); });
    });
    document.getElementById("back").addEventListener("click", function () {
      if (state.pos === 0) return renderStart();
      state.pos -= 1;
      renderQuestion();
    });
  }

  function answer(question, id) {
    state.answers[question.id] = id;
    // Drop answers to follow-up questions that no longer apply.
    var visible = visibleQuestions().map(function (x) { return x.id; });
    Object.keys(state.answers).forEach(function (k) { if (visible.indexOf(k) === -1) delete state.answers[k]; });
    state.pos = visible.indexOf(question.id) + 1;
    renderQuestion();
  }

  // Number keys pick an option on the question screens.
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return;
    if (document.activeElement && document.activeElement.tagName === "INPUT") return;
    var opts = app.querySelectorAll("[data-opt]");
    var b = opts[Number(e.key) - 1];
    if (b) b.click();
  });

  // ---------- diagnosis ----------
  function axisScore(axis) {
    var qs = D.questions.filter(function (x) { return x.axis === axis; });
    var sum = 0, max = 0;
    qs.forEach(function (x) {
      var o = opt(x, state.answers[x.id]);
      var top = Math.max.apply(null, x.options.map(function (y) { return Math.abs(y.score); }));
      if (o) { sum += o.score; max += top; }
    });
    return max ? sum / max : 0;
  }

  function diagnose() {
    var a = state.answers;
    var g = axisScore("goal");
    var t = axisScore("tech");
    var l = axisScore("legit");
    var r = axisScore("law");
    var s = Math.min(t, l, r);
    var quad = g >= 0 ? (s >= 0 ? "II" : "I") : (s >= 0 ? "IV" : "III");
    var nowOpt = opt(q("now"), a.now);
    var level = nowOpt ? nowOpt.level : 0;
    var rubber = a.now === "approve" && a.override === "rarely";
    var effective = rubber ? 3 : level;
    var borderline = Math.abs(g) < 0.2 || Math.abs(s) < 0.2;

    var f = [];
    function add(id, when) { if (when && f.indexOf(id) === -1) f.push(id); }

    // 1. The gap between the role AI should have and the role it has.
    add("efficiency_over_accountability", quad === "I" && effective >= 2);
    add("automating_judgment", quad === "III" && effective >= 2);
    add("human_bottleneck", quad === "II" && level <= 1);
    add("wrong_goal", quad === "IV" && effective >= 2 && a.goals !== "explicit");
    add("define_goals_first", quad === "IV" && level <= 1);
    add("rubber_stamp", rubber && s < 0);
    // 2. Answers that contradict each other: a sign of misdiagnosis.
    add("judgment_not_valued", a.value === "judgment" && a.accountable === "no");
    add("efficiency_trap", a.value === "cheap" && a.accountable === "yes");
    add("accountability_claim", a.why === "legit" && a.accountable === "no");
    add("ai_underrated", a.why === "tech" && t >= 0.25);
    add("narrow_goal", g >= 0 && a.perfect !== "no");
    // 3. Rules and regulation.
    add("check_gdpr", a.people === "yes" && a.law !== "yes" && (s >= 0 || effective >= 2));
    add("clarify_law", (a.law === "unsure" || (a.why === "law" && a.law === "no")) && f.indexOf("check_gdpr") === -1);
    // 4. Stability and strategic fit.
    add("unstable_position", s < 0 && t < 0 && l >= 0 && r >= 0);
    add("core_automation", quad === "II" && a.core === "core" && a.compete === "judgment");
    add("judgment_cost", (quad === "I" || quad === "III") && a.core === "core" && a.compete === "cost");
    add("habit", a.why === "habit");

    return { g: g, s: s, quad: quad, borderline: borderline, findings: f.slice(0, 5) };
  }

  // ---------- result ----------
  function renderResult() {
    setProgress(1);
    var d = diagnose();
    var Q = D.quadrants[d.quad];
    var name = tr(Q.name);

    var items = d.findings.length
      ? d.findings.map(function (id) {
          var x = D.findings[id];
          return "<li><h2>" + esc(tr(x.title)) + "</h2><p>" + esc(tr(x.body)) + "</p></li>";
        }).join("")
      : "<li><h2>" + esc(T.no_findings_title) + "</h2><p>" + esc(T.no_findings_body) + "</p></li>";

    var body = T.book_body.replace("{decision}", state.decision).replace("{num}", d.quad).replace("{name}", name);
    var mailto = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(T.book_subject) + "&body=" + encodeURIComponent(body);

    var answerRows = visibleQuestions().map(function (x) {
      var o = opt(x, state.answers[x.id]);
      return o ? "<li><span>" + esc(tr(x.text)) + "</span><span>" + esc(tr(o.text)) + "</span></li>" : "";
    }).join("");

    show(
      '<section class="result">' +
        '<p class="result-decision">' + esc(quote(state.decision)) + "</p>" +
        '<p class="result-num">' + esc(T.result_label) + " " + d.quad + "</p>" +
        '<h1 class="result-name">' + esc(name) + "</h1>" +
        '<div class="result-grid">' +
          '<div class="result-compass">' + compassSvg(d, false) + "</div>" +
          '<div class="result-role">' +
            '<p class="label">' + esc(T.role_label) + "</p>" +
            '<p class="role-text">' + esc(tr(Q.role)) + "</p>" +
            (d.borderline ? '<p class="borderline">' + esc(T.borderline) + "</p>" : "") +
          "</div>" +
        "</div>" +
        '<p class="label watch-label">' + esc(T.watch_label) + "</p>" +
        '<ul class="findings">' + items + "</ul>" +
        (d.s >= 0 && D.long_term ? longTerm() : "") +
        '<div class="actions noprint">' +
          '<a class="btn btn-solid" href="' + esc(mailto) + '">' + esc(T.book) + "</a>" +
          '<button type="button" class="btn" id="save-pdf">' + esc(T.save_pdf) + "</button>" +
          '<button type="button" class="back" id="again">' + esc(T.again) + "</button>" +
        "</div>" +
        '<p class="result-email noprint">' + esc(EMAIL) + "</p>" +
        '<div class="print-only"><p class="label">' + esc(T.answers_label) + '</p><ul class="answers">' + answerRows + "</ul>" +
          '<p class="print-contact">Joel W. Berge, NHH · ' + esc(EMAIL) + " · joelberge.github.io</p></div>" +
        '<p class="source">' + esc(T.source) + "</p>" +
      "</section>",
      ".result-name"
    );
    document.getElementById("save-pdf").addEventListener("click", function () { window.print(); });
    document.getElementById("again").addEventListener("click", function () { state.decision = ""; renderStart(); });

    // The needle swings to the diagnosis.
    var needle = app.querySelector(".needle");
    if (needle) {
      var angle = needle.getAttribute("data-angle");
      if (reduceMotion) { needle.style.transform = "rotate(" + angle + "deg)"; }
      else { requestAnimationFrame(function () { requestAnimationFrame(function () { needle.style.transform = "rotate(" + angle + "deg)"; }); }); }
    }
  }

  // Long-term challenge when separability is high: who builds the judgment needed to check the AI?
  function longTerm() {
    var x = D.long_term;
    return '<section class="long-term">' +
      '<p class="label watch-label">' + esc(tr(x.label)) + "</p>" +
      "<h2>" + esc(tr(x.title)) + "</h2>" +
      "<p>" + esc(tr(x.body)) + "</p>" +
      "<p>" + esc(tr(x.advice)) + "</p>" +
      '<a class="link-arrow noprint" href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(tr(x.link_label)) + ' <span aria-hidden="true">→</span></a>' +
    "</section>";
  }

  // ---------- the compass drawing ----------
  // Same geometry as the site's compass: up = high goal clarity, right = high separability.
  // I top left, II top right, III bottom left, IV bottom right.
  function compassSvg(d, mini) {
    var Q = D.quadrants;
    var C = 200, R = 150;
    var parts = [];
    var label = mini ? T.title : T.axis_goal + " × " + T.axis_sep + ": " + T.result_label + " " + d.quad + ", " + tr(Q[d.quad].name);
    parts.push('<svg class="compass' + (mini ? " compass-mini" : "") + '" viewBox="' + (mini ? "0 0 400 400" : "-70 -24 540 448") + '" role="img" aria-label="' + esc(label) + '">');
    if (d) {
      // Grey highlighter on the diagnosed quadrant.
      var arc = { I: [C - R, C, C, C - R, 0], II: [C, C - R, C + R, C, 1], III: [C, C + R, C - R, C, 1], IV: [C + R, C, C, C + R, 1] }[d.quad];
      parts.push('<path class="q-fill" d="M' + C + "," + C + " L" + arc[0] + "," + arc[1] + " A" + R + "," + R + " 0 0 1 " + arc[2] + "," + arc[3] + ' Z"/>');
    }
    parts.push('<circle class="ring" cx="200" cy="200" r="150"/>');
    parts.push('<line class="axis" x1="44" y1="200" x2="356" y2="200"/><line class="axis" x1="200" y1="44" x2="200" y2="356"/>');
    if (!mini) {
      // Quadrant names sit outside the ring, in the corners, so the needle and dot never cover them.
      var pos = { I: [30, 4, "middle"], II: [370, 4, "middle"], III: [30, 352, "middle"], IV: [370, 352, "middle"] };
      Object.keys(pos).forEach(function (k) {
        var words = tr(Q[k].name).split(" ");
        var first = words.shift(), rest = words.join(" ");
        var x = pos[k][0], y = pos[k][1];
        parts.push('<text class="q-label' + (d.quad === k ? " is-on" : "") + '" x="' + x + '" y="' + y + '" text-anchor="' + pos[k][2] + '">' +
          '<tspan class="q-num" x="' + x + '">' + k + '</tspan><tspan x="' + x + '" dy="24">' + esc(first) + '</tspan><tspan x="' + x + '" dy="22">' + esc(rest) + "</tspan></text>");
      });
      parts.push('<text class="end" x="200" y="38" text-anchor="middle">' + esc(T.high) + "</text>");
      parts.push('<text class="end" x="200" y="376" text-anchor="middle">' + esc(T.low) + "</text>");
      parts.push('<text class="end" x="42" y="206" text-anchor="end">' + esc(T.low) + "</text>");
      parts.push('<text class="end" x="358" y="206" text-anchor="start">' + esc(T.high) + "</text>");
      parts.push('<text class="axis-name" x="200" y="412" text-anchor="middle">↑ ' + esc(T.axis_goal) + " · " + esc(T.axis_sep) + " →</text>");
      // Short needle from the centre towards the diagnosis; the dot marks the spot.
      var vx = Math.max(-1, Math.min(1, d.s)), vy = Math.max(-1, Math.min(1, d.g));
      var len = Math.sqrt(vx * vx + vy * vy) || 1;
      var k2 = Math.min(1, 1 / len) * 128;
      var x = C + vx * k2, y = C - vy * k2;
      var angle = Math.atan2(x - C, -(y - C)) * 180 / Math.PI;
      parts.push('<g class="needle" data-angle="' + angle.toFixed(1) + '"><polygon points="200,118 209,194 200,204 191,194"/></g>');
      parts.push('<circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="9"/>');
    } else {
      parts.push('<polygon class="needle-static" points="200,58 212,200 200,212 188,200"/>');
    }
    parts.push('<circle class="hub" cx="200" cy="200" r="8"/>');
    parts.push("</svg>");
    return parts.join("");
  }

  renderStart();
})();
