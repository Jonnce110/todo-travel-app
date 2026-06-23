const STORAGE_KEY = "todo-travel-app-state";

const defaultState = {
  todos: [
    { id: crypto.randomUUID(), title: "确认下次旅行日期", done: false },
    { id: crypto.randomUUID(), title: "整理证件和保险信息", done: false },
  ],
  templates: [
    {
      id: crypto.randomUUID(),
      name: "潜水出行",
      category: "潜水",
      notes: "适合 3-5 天船宿或海岛潜水。",
      priority: "完整",
      items: [
        { id: crypto.randomUUID(), title: "潜水电脑", packed: false },
        { id: crypto.randomUUID(), title: "面镜和呼吸管", packed: false },
        { id: crypto.randomUUID(), title: "潜水证和日志", packed: false },
        { id: crypto.randomUUID(), title: "防晒衣", packed: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "冲浪出行",
      category: "冲浪",
      notes: "适合周末海边行程。",
      priority: "标准",
      items: [
        { id: crypto.randomUUID(), title: "冲浪蜡", packed: false },
        { id: crypto.randomUUID(), title: "防磨衣", packed: false },
        { id: crypto.randomUUID(), title: "快干浴巾", packed: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "滑雪出行",
      category: "滑雪",
      notes: "适合雪场短途或跨国滑雪。",
      priority: "完整",
      items: [
        { id: crypto.randomUUID(), title: "雪镜", packed: false },
        { id: crypto.randomUUID(), title: "保暖内层", packed: false },
        { id: crypto.randomUUID(), title: "手套和护具", packed: false },
        { id: crypto.randomUUID(), title: "雪票或预约凭证", packed: false },
      ],
    },
  ],
  activeTemplateId: null,
};

let state = loadState();
state.activeTemplateId = state.activeTemplateId || state.templates[0]?.id || null;

const todoForm = document.querySelector("#todoForm");
const todoInput = document.querySelector("#todoInput");
const todoList = document.querySelector("#todoList");
const todoEmpty = document.querySelector("#todoEmpty");
const todoCounter = document.querySelector("#todoCounter");
const saveStatus = document.querySelector("#saveStatus");

const newListBtn = document.querySelector("#newListBtn");
const cloneSource = document.querySelector("#cloneSource");
const cloneBtn = document.querySelector("#cloneBtn");
const templateList = document.querySelector("#templateList");
const templateForm = document.querySelector("#templateForm");
const templateName = document.querySelector("#templateName");
const templateCategory = document.querySelector("#templateCategory");
const templateNotes = document.querySelector("#templateNotes");
const templatePriority = document.querySelector("#templatePriority");
const categoryHints = document.querySelector("#categoryHints");
const deleteTemplateBtn = document.querySelector("#deleteTemplateBtn");
const packingItemForm = document.querySelector("#packingItemForm");
const packingItemInput = document.querySelector("#packingItemInput");
const packingItems = document.querySelector("#packingItems");
const packingEmpty = document.querySelector("#packingEmpty");
const packingCounter = document.querySelector("#packingCounter");

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveStatus.textContent = "已自动保存";
  saveStatus.dataset.savedAt = new Date().toISOString();
}

function touchSaveStatus() {
  saveStatus.textContent = "正在保存...";
  window.setTimeout(persist, 120);
}

function getActiveTemplate() {
  return state.templates.find((template) => template.id === state.activeTemplateId) || state.templates[0];
}

function render() {
  renderTodos();
  renderTemplates();
  renderEditor();
  persist();
}

function renderTodos() {
  todoList.innerHTML = "";
  state.todos.forEach((todo) => {
    const node = document.querySelector("#todoItemTemplate").content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", todo.done);
    node.querySelector("input").checked = todo.done;
    node.querySelector(".item-title").textContent = todo.title;
    node.querySelector("input").addEventListener("change", (event) => {
      todo.done = event.target.checked;
      touchSaveStatus();
      renderTodos();
    });
    node.querySelector(".edit-action").addEventListener("click", () => editText(todo.title, (value) => {
      todo.title = value;
      render();
    }));
    node.querySelector(".delete-action").addEventListener("click", () => {
      state.todos = state.todos.filter((item) => item.id !== todo.id);
      render();
    });
    todoList.append(node);
  });
  const activeCount = state.todos.filter((todo) => !todo.done).length;
  todoCounter.textContent = `${activeCount}/${state.todos.length} 项`;
  todoEmpty.classList.toggle("visible", state.todos.length === 0);
}

function renderTemplates() {
  templateList.innerHTML = "";
  cloneSource.innerHTML = "";

  state.templates.forEach((template) => {
    const tab = document.createElement("button");
    tab.className = "template-tab";
    tab.type = "button";
    tab.classList.toggle("active", template.id === state.activeTemplateId);
    tab.innerHTML = `<strong></strong><span></span>`;
    tab.querySelector("strong").textContent = template.name;
    tab.querySelector("span").textContent = `${template.category} · ${template.items.length} 件`;
    tab.addEventListener("click", () => {
      state.activeTemplateId = template.id;
      render();
    });
    templateList.append(tab);

    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    cloneSource.append(option);
  });

  const categories = [...new Set(state.templates.map((template) => template.category).filter(Boolean))];
  categoryHints.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
}

function renderEditor() {
  const template = getActiveTemplate();
  if (!template) {
    createTemplate();
    return;
  }

  templateName.value = template.name;
  templateCategory.value = template.category;
  templateNotes.value = template.notes;
  templatePriority.value = template.priority;

  packingItems.innerHTML = "";
  template.items.forEach((item) => {
    const node = document.querySelector("#packingItemTemplate").content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", item.packed);
    node.querySelector("input").checked = item.packed;
    node.querySelector(".item-title").textContent = item.title;
    node.querySelector("input").addEventListener("change", (event) => {
      item.packed = event.target.checked;
      touchSaveStatus();
      renderEditor();
      renderTemplates();
    });
    node.querySelector(".edit-action").addEventListener("click", () => editText(item.title, (value) => {
      item.title = value;
      render();
    }));
    node.querySelector(".delete-action").addEventListener("click", () => {
      template.items = template.items.filter((entry) => entry.id !== item.id);
      render();
    });
    packingItems.append(node);
  });

  const packedCount = template.items.filter((item) => item.packed).length;
  packingCounter.textContent = `${packedCount}/${template.items.length} 件`;
  packingEmpty.classList.toggle("visible", template.items.length === 0);
  deleteTemplateBtn.disabled = state.templates.length <= 1;
}

function editText(currentValue, onSave) {
  const nextValue = window.prompt("修改内容", currentValue);
  if (!nextValue) return;
  const trimmed = nextValue.trim();
  if (trimmed) onSave(trimmed);
}

function createTemplate(source) {
  const base = source || {
    name: "新的出行清单",
    category: "自定义",
    notes: "",
    priority: "标准",
    items: [],
  };

  const template = {
    id: crypto.randomUUID(),
    name: source ? `${base.name} 副本` : base.name,
    category: base.category,
    notes: base.notes,
    priority: base.priority,
    items: base.items.map((item) => ({
      id: crypto.randomUUID(),
      title: item.title,
      packed: false,
    })),
  };

  state.templates.unshift(template);
  state.activeTemplateId = template.id;
  render();
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;
  state.todos.unshift({ id: crypto.randomUUID(), title, done: false });
  todoInput.value = "";
  render();
});

newListBtn.addEventListener("click", () => createTemplate());

cloneBtn.addEventListener("click", () => {
  const source = state.templates.find((template) => template.id === cloneSource.value);
  if (source) createTemplate(source);
});

templateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const template = getActiveTemplate();
  template.name = templateName.value.trim() || "未命名清单";
  template.category = templateCategory.value.trim() || "自定义";
  template.notes = templateNotes.value.trim();
  template.priority = templatePriority.value;
  render();
});

deleteTemplateBtn.addEventListener("click", () => {
  const template = getActiveTemplate();
  if (!template || state.templates.length <= 1) return;
  const confirmed = window.confirm(`删除「${template.name}」？`);
  if (!confirmed) return;
  state.templates = state.templates.filter((entry) => entry.id !== template.id);
  state.activeTemplateId = state.templates[0]?.id || null;
  render();
});

packingItemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const template = getActiveTemplate();
  const title = packingItemInput.value.trim();
  if (!template || !title) return;
  template.items.unshift({ id: crypto.randomUUID(), title, packed: false });
  packingItemInput.value = "";
  render();
});

render();
