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
        '<details class="what"><summary>' + esc(T.what_is) + "</summary><p>" + esc(T.what_is_body) + '</p><p class="privacy">' + esc(T.privacy) + "</p></details>" +
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
        (question.hint ? '<details class="ask-hint"><summary>' + esc(question.hint_label ? tr(question.hint_label) : T.hint_label) + "</summary><p>" + esc(tr(question.hint)) + "</p></details>" : "") +
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

  function quadOf(g, s) { return g >= 0 ? (s >= 0 ? "II" : "I") : (s >= 0 ? "IV" : "III"); }

  function diagnose() {
    var a = state.answers;
    var g = axisScore("goal");
    var t = axisScore("tech");
    var l = axisScore("legit");
    var r = axisScore("law");
    var s = Math.min(t, l, r);
    var quad = quadOf(g, s);
    var nowOpt = opt(q("now"), a.now);
    var level = nowOpt ? nowOpt.level : 0;
    var rubber = a.now === "approve" && a.override === "rarely";
    var effective = rubber ? 3 : level;
    var borderline = Math.abs(g) < 0.2 || Math.abs(s) < 0.2;
    // What keeps a person in the decision (only when separability is low), most robust first.
    var low = [];
    if (s < 0) {
      if (l < 0) low.push("legit");
      if (r < 0) low.push("law");
      if (t < 0) low.push("tech");
    }

    var f = [];
    function add(id, when) { if (when && f.indexOf(id) === -1) f.push(id); }
    // Dangers triggered by the answers (shown under "what to be careful about").
    add("efficiency_over_accountability", quad === "I" && effective >= 2);
    add("automating_judgment", quad === "III" && effective >= 2);
    add("human_bottleneck", quad === "II" && level <= 1);
    add("wrong_goal", quad === "IV" && effective >= 2 && a.goals !== "explicit");
    add("rubber_stamp", rubber && s < 0);
    add("check_gdpr", a.people === "yes" && a.law !== "yes" && (s >= 0 || effective >= 2));
    add("core_automation", quad === "II" && a.core === "core" && a.compete === "judgment");
    add("judgment_cost", (quad === "I" || quad === "III") && a.core === "core" && a.compete === "cost");
    add("habit", a.why === "habit");
    // Answers that contradict each other (shown under "risk of misdiagnosis").
    var m = [];
    function addM(id, when) { if (when && m.indexOf(id) === -1) m.push(id); }
    addM("judgment_not_valued", a.value === "judgment" && a.accountable === "no");
    addM("efficiency_trap", a.value === "cheap" && a.accountable === "yes");
    addM("accountability_claim", a.why === "legit" && a.accountable === "no");
    addM("ai_underrated", a.why === "tech" && t >= 0.25);
    addM("narrow_goal", g >= 0 && a.perfect !== "no");
    addM("clarify_law", a.law === "unsure" || (a.why === "law" && a.law === "no"));

    return { g: g, s: s, t: t, l: l, r: r, quad: quad, level: level, effective: effective, rubber: rubber,
             borderline: borderline, low: low, careful: f, contradictions: m };
  }

  // ---------- the report ----------
  var R = D.report;
  // Fill {placeholders} in an escaped template with ready-made HTML.
  function fill(tpl, map) {
    return esc(tpl).replace(/\{(\w+)\}/g, function (all, k) { return map[k] !== undefined ? map[k] : all; });
  }
  function listJoin(items) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + " " + tr(R.and) + " " + items[items.length - 1];
  }
  // «answer» to the question of …
  function answered(qid) {
    var question = q(qid), o = question && opt(question, state.answers[qid]);
    if (!o) return null;
    return fill(tr(R.answered), { a: "<mark>" + esc(quote(tr(o.text))) + "</mark>", q: esc(tr(R.short[qid])) });
  }
  // Answers on an axis that point up (dir > 0) or down (dir < 0).
  function answersOn(axes, dir) {
    return D.questions.filter(function (x) { return axes.indexOf(x.axis) !== -1; }).filter(function (x) {
      var o = opt(x, state.answers[x.id]);
      return o && (dir > 0 ? o.score > 0 : o.score < 0);
    }).map(function (x) { return x.id; });
  }
  function para(html, cls) { return "<p" + (cls ? ' class="' + cls + '"' : "") + ">" + html + "</p>"; }
  function section(key, intro, body) {
    return '<section class="rep"><h2 class="rep-h">' + esc(tr(R.sections[key])) + "</h2>" +
      (intro ? para(esc(intro), "rep-intro") : "") + body + "</section>";
  }
  function item(title, body, mine) {
    return "<li><h3>" + (mine ? "<mark>" + esc(title) + "</mark>" : esc(title)) + "</h3><p>" + body + "</p></li>";
  }

  function mainSection(d) {
    var M = R.main, hi = tr(R.high_word), lo = tr(R.low_word);
    var because = d.s < 0 ? fill(tr(M.because), { sources: listJoin(d.low.map(function (k) { return esc(tr(M["source_" + k])); })) }) : "";
    var out = para(fill(tr(M.line), { num: d.quad, name: esc(tr(D.quadrants[d.quad].name)), g: d.g >= 0 ? hi : lo, s: d.s >= 0 ? hi : lo, because: because }));
    out += para(esc(tr(M.implication[d.quad])), "rep-mine");
    return section("main", null, out);
  }

  function doSection(d) {
    var a = state.answers, G = R.gap;
    var rec = { I: 1, II: 3, III: 1, IV: 3 }[d.quad];
    var mine = [];
    if (a.now) {
      var now = esc(tr(R.now_phrase[d.rubber ? "rubber" : a.now]));
      var tpl = d.effective > rec ? G.too_much
        : (d.level <= 1 && (d.quad === "II" || d.quad === "IV")) ? (d.quad === "IV" ? G.too_little_iv : G.too_little)
        : G.match;
      mine.push(fill(tr(tpl), { now: now }));
    }
    if (d.level >= 1 && a.goals && a.goals !== "explicit" && d.quad === "II") {
      mine.push(fill(tr(G.write_goals), { goals: esc(tr(a.goals === "none" ? G.goals_none : G.goals_implicit)) }));
    }
    if (a.core === "support" && (d.quad === "II" || d.quad === "IV")) mine.push(esc(tr(G.support)));
    if (a.core === "core" && a.compete === "judgment" && (d.quad === "I" || d.quad === "III")) mine.push(esc(tr(G.defend)));
    var out = mine.map(function (h) { return para(h, "rep-mine"); }).join("");
    out += '<ul class="rep-bullets">' + R.quadrants[d.quad].do.slice(0, 3).map(function (x) { return "<li>" + esc(tr(x)) + "</li>"; }).join("") + "</ul>";
    return section("do", tr(R.given), out);
  }

  // At most three points: the ones triggered by the answers first, then the quadrant's general dangers.
  function carefulSection(d) {
    var mine = d.careful.map(function (id) { var f = D.findings[id]; return item(tr(f.title), esc(tr(f.body)), true); });
    var general = R.quadrants[d.quad].careful.filter(function (x) { return !x.same_as || d.careful.indexOf(x.same_as) === -1; })
      .map(function (x) { return item(tr(x.title), esc(tr(x.body)), false); });
    return section("careful", tr(R.careful_intro), '<ul class="rep-list">' + mine.concat(general).slice(0, 3).join("") + "</ul>");
  }

  function stabilitySection(d) {
    var S = R.stability, a = state.answers, out = "";
    if (d.s >= 0) {
      out += para(esc(tr(S.verdict.high)), "rep-mine");
      out += para(esc(tr(S.high)) + (a.people === "yes" ? " " + esc(tr(S.high_people)) : ""));
      var LT = D.long_term;
      out += '<ul class="rep-list">' + item(tr(S.long_term.title), esc(tr(S.long_term.body)) +
        (LT ? ' <a class="noprint" href="' + esc(LT.link) + '" target="_blank" rel="noopener">' + esc(tr(LT.link_label)) + "</a>" : ""), false) + "</ul>";
    } else {
      out += para(esc(tr(S.verdict[d.low.length === 1 ? d.low[0] : (d.low[0] === "tech" ? "tech" : d.low[0])])), "rep-mine");
      out += '<ul class="rep-list">' + d.low.map(function (k) {
        var body = esc(tr(S[k].body));
        if (k === "legit" && a.value !== "judgment") body += " " + esc(tr(S.legit.weak));
        if (d.low.length === 1 && k === "law") {
          var alt = quadOf(d.g, Math.min(d.t, d.l));
          body += " " + fill(tr(S.law.only), { num: alt, name: esc(tr(D.quadrants[alt].name)) });
        }
        return item(tr(S[k].title), body, true);
      }).join("") + "</ul>";
    }
    if (a.outcome === "composite") out += para(esc(tr(S.goal_changes)));
    return section("stability", null, out);
  }

  function misdiagnosisSection(d) {
    var M = R.misdiagnosis, a = state.answers, out = "", lines = [];
    if (d.borderline) out += para(esc(T.borderline), "borderline");
    answersOn(["goal"], d.g >= 0 ? -1 : 1).forEach(function (id) {
      lines.push(fill(tr(d.g >= 0 ? M.against_goal_high : M.against_goal_low), { answer: answered(id) }));
    });
    // High separability: any answer pointing low counts against it. Low: only answers on the sources that hold the person in.
    answersOn(d.s >= 0 ? ["tech", "legit", "law"] : d.low, d.s >= 0 ? -1 : 1).forEach(function (id) {
      lines.push(fill(tr(d.s >= 0 ? M.against_sep_high : M.against_sep_low), { answer: answered(id) }));
    });
    var auto = d.quad === "II" || d.quad === "IV";
    if (auto && a.value === "judgment" && d.contradictions.indexOf("judgment_not_valued") === -1) lines.push(esc(tr(M.value_auto)));
    if (!auto && a.value === "cheap" && d.contradictions.indexOf("efficiency_trap") === -1) lines.push(esc(tr(M.value_human)));
    var items = lines.slice(0, 3).map(function (h) { return "<li><p>" + h + "</p></li>"; })
      .concat(d.contradictions.slice(0, 2).map(function (id) { var f = D.findings[id]; return item(tr(f.title), esc(tr(f.body)), true); }));
    out += items.length ? para(esc(tr(M.intro))) + '<ul class="rep-list">' + items.join("") + "</ul>" : para(esc(tr(M.none)));
    // The nearest alternative: flip the axis closest to the line.
    var flipGoal = Math.abs(d.g) <= Math.abs(d.s);
    var alt = flipGoal ? quadOf(-d.g || -0.01, d.s) : quadOf(d.g, d.s >= 0 ? -1 : 1);
    var danger = R.quadrants[alt].careful[0].title;
    out += para(fill(tr(M.alt), { axis: esc(tr(flipGoal ? M.axis_goal : M.axis_sep)), num: alt,
      name: esc(tr(D.quadrants[alt].name)), danger: esc(tr(danger).toLowerCase()) }) +
      (d.quad === "II" && alt === "IV" ? " " + esc(tr(M.uber)) : ""));
    out += para(esc(tr(M.question)), "rep-question");
    return section("misdiagnosis", null, out);
  }

  // ---------- result ----------
  function renderResult() {
    setProgress(1);
    var d = diagnose();
    var Q = D.quadrants[d.quad];
    var name = tr(Q.name);

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
          "</div>" +
        "</div>" +
        mainSection(d) + doSection(d) + carefulSection(d) + stabilitySection(d) + misdiagnosisSection(d) +
        '<div class="actions noprint">' +
          '<a class="btn btn-solid" href="' + esc(mailto) + '">' + esc(T.book) + "</a>" +
          '<button type="button" class="btn" id="save-pdf">' + esc(T.save_pdf) + "</button>" +
          '<button type="button" class="back" id="again">' + esc(T.again) + "</button>" +
        "</div>" +
        '<p class="result-email noprint">' + esc(EMAIL) + "</p>" +
        '<div class="print-only"><p class="label">' + esc(T.answers_label) + '</p><ul class="answers">' + answerRows + "</ul>" +
          '<p class="print-contact">Joel W. Berge, NHH · ' + esc(EMAIL) + " · joelberge.github.io</p></div>" +
        '<p class="source">' + esc(T.source) + "</p>" +
        '<p class="source privacy noprint">' + esc(T.privacy) + "</p>" +
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
