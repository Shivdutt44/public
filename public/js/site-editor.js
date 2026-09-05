(function () {
  const CURRENT_SCRIPT_SRC = document.currentScript && document.currentScript.src;
  const API_BASE = window.SITE_API_BASE || "http://localhost:5000";
  const EDITABLE_TAGS = [
    "H1", "H2", "H3", "H4", "H5", "H6",
    "P", "SPAN", "A", "LI", "BUTTON", "BLOCKQUOTE", "FIGCAPTION", "LABEL",
  ];
  const ICONISH_TAGS = ["ION-ICON", "I", "SVG", "IMG"];

  const pageKey = (function () {
    const file = location.pathname.split("/").pop() || "index.html";
    return file.replace(/\.html$/, "") || "index";
  })();

  let editMode = false;
  let isAdmin = false;
  let activeEl = null;

  function fetchJSON(url, options) {
    return fetch(API_BASE + url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    }).then((res) => {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function computePath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      const parent = node.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === node.tagName
      );
      parts.unshift(node.tagName.toLowerCase() + siblings.indexOf(node));
      node = parent;
    }
    return parts.join(">");
  }

  function isEditableTextElement(el) {
    if (!EDITABLE_TAGS.includes(el.tagName)) return false;
    if (el.closest("#se-root")) return false;
    const childEls = Array.from(el.children);
    if (childEls.length > 0) {
      const allIconLike = childEls.every((c) => ICONISH_TAGS.includes(c.tagName));
      if (!allIconLike) return false;
    }
    return el.textContent.trim().length > 0;
  }

  // ---------- Apply saved overrides (runs for every visitor) ----------

  function applyTheme(theme) {
    const root = document.documentElement.style;
    for (const [key, value] of Object.entries(theme)) {
      if (value) root.setProperty(key, value);
    }
  }

  function applyContent(content) {
    document.querySelectorAll("body *").forEach((el) => {
      if (el.closest("#se-root")) return;
      const isText = isEditableTextElement(el);
      const isImg = el.tagName === "IMG";
      const isSection = el.tagName === "SECTION";
      if (!isText && !isImg && !isSection) return;
      const key = computePath(el);
      const entry = content[key];
      if (!entry) return;
      if (entry.type === "text" && isText) el.innerHTML = entry.value;
      else if (entry.type === "image" && isImg) el.src = entry.value;
      else if (entry.type === "hidden" && isSection) {
        el.style.display = entry.value === "hidden" ? "none" : "";
      }
    });
  }

  // ---------- Edit mode UI ----------

  function toast(message) {
    const el = document.createElement("div");
    el.className = "se-toast";
    el.textContent = message;
    document.getElementById("se-root").appendChild(el);
    requestAnimationFrame(() => el.classList.add("se-toast-show"));
    setTimeout(() => {
      el.classList.remove("se-toast-show");
      setTimeout(() => el.remove(), 300);
    }, 1800);
  }

  function saveContent(elementKey, type, value) {
    return fetchJSON("/api/content/" + pageKey, {
      method: "PUT",
      body: JSON.stringify({ updates: [{ elementKey, type, value }] }),
    })
      .then(() => toast("Saved"))
      .catch(() => toast("Save failed"));
  }

  function saveTheme(updates) {
    return fetchJSON("/api/theme", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    })
      .then(() => toast("Theme saved"))
      .catch(() => toast("Save failed"));
  }

  function onDocumentClick(e) {
    if (!editMode) return;
    const el = e.target;
    if (el.closest("#se-root")) return;

    if (el.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();
      const current = el.getAttribute("src");
      const next = window.prompt("Image URL:", current);
      if (next && next !== current) {
        el.src = next;
        saveContent(computePath(el), "image", next);
      }
      return;
    }

    if (isEditableTextElement(el)) {
      e.preventDefault();
      e.stopPropagation();
      if (activeEl && activeEl !== el) activeEl.blur();
      el.setAttribute("contenteditable", "true");
      el.classList.add("se-editing");
      el.focus();
      activeEl = el;
    }
  }

  function onDocumentFocusOut(e) {
    const el = e.target;
    if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return;
    if (!editMode) return;
    el.removeAttribute("contenteditable");
    el.classList.remove("se-editing");
    saveContent(computePath(el), "text", el.innerHTML);
    if (activeEl === el) activeEl = null;
  }

  function injectSectionToggles() {
    document.querySelectorAll("body section").forEach((section) => {
      if (section.querySelector(":scope > .se-section-toggle")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "se-section-toggle";
      btn.title = "Hide/show this section";
      btn.textContent = section.style.display === "none" ? "Show section" : "Hide section";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const hidden = section.style.display !== "none";
        section.style.display = hidden ? "none" : "";
        btn.textContent = hidden ? "Show section" : "Hide section";
        saveContent(computePath(section), "hidden", hidden ? "hidden" : "visible");
      });
      if (getComputedStyle(section).position === "static") {
        section.style.position = "relative";
      }
      section.appendChild(btn);
    });
  }

  function removeSectionToggles() {
    document.querySelectorAll(".se-section-toggle").forEach((b) => b.remove());
  }

  function enableEditMode() {
    editMode = true;
    document.body.classList.add("se-edit-mode");
    injectSectionToggles();
    toast("Edit mode on — click any text or image");
  }

  function disableEditMode() {
    editMode = false;
    if (activeEl) activeEl.blur();
    document.body.classList.remove("se-edit-mode");
    removeSectionToggles();
  }

  // ---------- Theme panel ----------

  const THEME_COLOR_FIELDS = [
    { key: "--heading", label: "Heading text" },
    { key: "--para", label: "Body text" },
    { key: "--helper", label: "Accent" },
    { key: "--helper-tint", label: "Accent tint" },
    { key: "--bg", label: "Section background" },
    { key: "--third", label: "Surface / white" },
  ];
  const THEME_FONT_OPTIONS = ["Work Sans", "Poppins", "Rufina", "Libre Franklin"];

  function buildThemePanel() {
    const panel = document.createElement("div");
    panel.className = "se-panel";
    panel.id = "se-theme-panel";

    const title = document.createElement("h3");
    title.textContent = "Customize";
    panel.appendChild(title);

    const computed = getComputedStyle(document.documentElement);
    const pendingUpdates = {};

    THEME_COLOR_FIELDS.forEach(({ key, label }) => {
      const row = document.createElement("label");
      row.className = "se-panel-row";
      const span = document.createElement("span");
      span.textContent = label;
      const input = document.createElement("input");
      input.type = "color";
      const current = computed.getPropertyValue(key).trim();
      input.value = /^#/.test(current) ? current : "#000000";
      input.addEventListener("input", () => {
        document.documentElement.style.setProperty(key, input.value);
        pendingUpdates[key] = input.value;
      });
      row.appendChild(span);
      row.appendChild(input);
      panel.appendChild(row);
    });

    [
      { key: "--font-heading", label: "Heading font" },
      { key: "--font-body", label: "Body font" },
    ].forEach(({ key, label }) => {
      const row = document.createElement("label");
      row.className = "se-panel-row";
      const span = document.createElement("span");
      span.textContent = label;
      const select = document.createElement("select");
      THEME_FONT_OPTIONS.forEach((font) => {
        const opt = document.createElement("option");
        opt.value = `"${font}", sans-serif`;
        opt.textContent = font;
        select.appendChild(opt);
      });
      const current = computed.getPropertyValue(key).trim();
      if (current) select.value = current;
      select.addEventListener("change", () => {
        document.documentElement.style.setProperty(key, select.value);
        pendingUpdates[key] = select.value;
      });
      row.appendChild(span);
      row.appendChild(select);
      panel.appendChild(row);
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "se-btn se-btn-primary";
    saveBtn.textContent = "Save theme";
    saveBtn.addEventListener("click", () => {
      const updates = Object.entries(pendingUpdates).map(([settingKey, value]) => ({
        settingKey,
        value,
      }));
      if (updates.length === 0) {
        toast("No changes to save");
        return;
      }
      saveTheme(updates);
    });
    panel.appendChild(saveBtn);

    return panel;
  }

  // ---------- Toolbar ----------

  function buildToolbar() {
    const bar = document.createElement("div");
    bar.className = "se-toolbar";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "se-btn";
    editBtn.textContent = "Edit page";
    editBtn.addEventListener("click", () => {
      if (editMode) {
        disableEditMode();
        editBtn.textContent = "Edit page";
        editBtn.classList.remove("se-btn-active");
      } else {
        enableEditMode();
        editBtn.textContent = "Done editing";
        editBtn.classList.add("se-btn-active");
      }
    });

    const themeBtn = document.createElement("button");
    themeBtn.type = "button";
    themeBtn.className = "se-btn";
    themeBtn.textContent = "Theme";
    themeBtn.addEventListener("click", () => {
      document.getElementById("se-theme-panel").classList.toggle("se-panel-open");
    });

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "se-btn se-btn-ghost";
    logoutBtn.textContent = "Log out";
    logoutBtn.addEventListener("click", () => {
      fetchJSON("/api/admin/logout", { method: "POST" }).then(() => location.reload());
    });

    bar.appendChild(editBtn);
    bar.appendChild(themeBtn);
    bar.appendChild(logoutBtn);
    return bar;
  }

  function buildAdminUI() {
    const root = document.createElement("div");
    root.id = "se-root";
    root.appendChild(buildToolbar());
    root.appendChild(buildThemePanel());
    document.body.appendChild(root);

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("focusout", onDocumentFocusOut, true);
  }

  function loadStylesheet() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = (CURRENT_SCRIPT_SRC && CURRENT_SCRIPT_SRC.replace("js/site-editor.js", "css/site-editor.css")) ||
      "css/site-editor.css";
    document.head.appendChild(link);
  }

  // ---------- Init ----------

  function init() {
    loadStylesheet();

    Promise.all([
      fetchJSON("/api/theme").catch(() => ({})),
      fetchJSON("/api/content/" + pageKey).catch(() => ({})),
    ]).then(([theme, content]) => {
      applyTheme(theme);
      applyContent(content);
    });

    fetchJSON("/api/admin/me")
      .then((data) => {
        isAdmin = Boolean(data.loggedIn);
        if (isAdmin) buildAdminUI();
      })
      .catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
