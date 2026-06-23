const SUPABASE_URL = "https://buwqmzdqxcyudkwmxzrd.supabase.co";
const APP_URL = "https://jonnce110.github.io/todo-travel-app/";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1d3FtemRxeGN5dWRrd214enJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjA4ODIsImV4cCI6MjA5Nzc5Njg4Mn0.AWvrQyxp0eH7Wmj2UZwQapz4gCGRGKCFMWlmBiNTqNk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultTodos = [
  { title: "确认下次旅行日期", done: false },
  { title: "整理证件和保险信息", done: false },
];

const defaultTemplates = [
  {
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
];

let state = {
  session: null,
  todos: [],
  templates: [],
  activeTemplateId: null,
};

const authPanel = document.querySelector("#authPanel");
const authForm = document.querySelector("#authForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const signUpBtn = document.querySelector("#signUpBtn");
const signOutBtn = document.querySelector("#signOutBtn");
const authMessage = document.querySelector("#authMessage");
const workspace = document.querySelector(".workspace");

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

function setStatus(message) {
  saveStatus.textContent = message;
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function getActiveTemplate() {
  return state.templates.find((template) => template.id === state.activeTemplateId) || state.templates[0];
}

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  state.session = data.session;
  updateAuthUi();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    updateAuthUi();
    if (session) {
      await loadCloudData();
    } else {
      state.todos = [];
      state.templates = [];
      state.activeTemplateId = null;
      render();
    }
  });

  if (state.session) {
    await loadCloudData();
  } else {
    render();
  }
}

function updateAuthUi() {
  const signedIn = Boolean(state.session);
  authPanel.hidden = signedIn;
  workspace.classList.toggle("locked", !signedIn);
  signOutBtn.hidden = !signedIn;
  if (signedIn) {
    setStatus(`已登录：${state.session.user.email}`);
    setAuthMessage("");
  } else {
    setStatus("请先登录");
  }
}

async function loadCloudData() {
  setStatus("正在同步...");

  const [{ data: todos, error: todosError }, { data: templates, error: templatesError }] =
    await Promise.all([
      supabaseClient.from("todos").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("packing_lists").select("*").order("created_at", { ascending: false }),
    ]);

  if (todosError || templatesError) {
    const message = todosError?.message || templatesError?.message || "同步失败";
    setStatus("同步失败");
    setAuthMessage(`Supabase 同步失败：${message}。请确认已经运行 supabase-schema.sql。`, true);
    render();
    return;
  }

  if (todos.length === 0 && templates.length === 0) {
    await seedDefaultData();
    return loadCloudData();
  }

  state.todos = todos;
  state.templates = templates.map((template) => ({
    ...template,
    items: Array.isArray(template.items) ? template.items : [],
  }));
  state.activeTemplateId = state.activeTemplateId || state.templates[0]?.id || null;
  render();
  setStatus("已云端同步");
}

async function seedDefaultData() {
  const userId = state.session.user.id;
  await Promise.all([
    supabaseClient.from("todos").insert(defaultTodos.map((todo) => ({ ...todo, user_id: userId }))),
    supabaseClient.from("packing_lists").insert(
      defaultTemplates.map((template) => ({
        ...template,
        user_id: userId,
      })),
    ),
  ]);
}

function render() {
  renderTodos();
  renderTemplates();
  renderEditor();
}

function renderTodos() {
  todoList.innerHTML = "";
  state.todos.forEach((todo) => {
    const node = document.querySelector("#todoItemTemplate").content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", todo.done);
    node.querySelector("input").checked = todo.done;
    node.querySelector(".item-title").textContent = todo.title;
    node.querySelector("input").addEventListener("change", async (event) => {
      await updateTodo(todo.id, { done: event.target.checked });
    });
    node.querySelector(".edit-action").addEventListener("click", () => editText(todo.title, async (value) => {
      await updateTodo(todo.id, { title: value });
    }));
    node.querySelector(".delete-action").addEventListener("click", async () => {
      await deleteTodo(todo.id);
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
    templateName.value = "";
    templateCategory.value = "";
    templateNotes.value = "";
    templatePriority.value = "标准";
    packingItems.innerHTML = "";
    packingCounter.textContent = "0 件";
    packingEmpty.classList.add("visible");
    deleteTemplateBtn.disabled = true;
    return;
  }

  templateName.value = template.name;
  templateCategory.value = template.category;
  templateNotes.value = template.notes || "";
  templatePriority.value = template.priority || "标准";

  packingItems.innerHTML = "";
  template.items.forEach((item) => {
    const node = document.querySelector("#packingItemTemplate").content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", item.packed);
    node.querySelector("input").checked = item.packed;
    node.querySelector(".item-title").textContent = item.title;
    node.querySelector("input").addEventListener("change", async (event) => {
      item.packed = event.target.checked;
      await updateTemplate(template.id, { items: template.items });
    });
    node.querySelector(".edit-action").addEventListener("click", () => editText(item.title, async (value) => {
      item.title = value;
      await updateTemplate(template.id, { items: template.items });
    }));
    node.querySelector(".delete-action").addEventListener("click", async () => {
      template.items = template.items.filter((entry) => entry.id !== item.id);
      await updateTemplate(template.id, { items: template.items });
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

async function addTodo(title) {
  setStatus("正在保存...");
  const { data, error } = await supabaseClient
    .from("todos")
    .insert({ title, user_id: state.session.user.id })
    .select()
    .single();
  if (error) return showCloudError(error);
  state.todos.unshift(data);
  render();
  setStatus("已云端同步");
}

async function updateTodo(id, patch) {
  setStatus("正在保存...");
  const { data, error } = await supabaseClient
    .from("todos")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return showCloudError(error);
  state.todos = state.todos.map((todo) => (todo.id === id ? data : todo));
  render();
  setStatus("已云端同步");
}

async function deleteTodo(id) {
  setStatus("正在删除...");
  const { error } = await supabaseClient.from("todos").delete().eq("id", id);
  if (error) return showCloudError(error);
  state.todos = state.todos.filter((todo) => todo.id !== id);
  render();
  setStatus("已云端同步");
}

async function createTemplate(source) {
  const base = source || {
    name: "新的出行清单",
    category: "自定义",
    notes: "",
    priority: "标准",
    items: [],
  };

  setStatus("正在保存...");
  const { data, error } = await supabaseClient
    .from("packing_lists")
    .insert({
      user_id: state.session.user.id,
      name: source ? `${base.name} 副本` : base.name,
      category: base.category,
      notes: base.notes || "",
      priority: base.priority || "标准",
      items: base.items.map((item) => ({
        id: crypto.randomUUID(),
        title: item.title,
        packed: false,
      })),
    })
    .select()
    .single();

  if (error) return showCloudError(error);
  state.templates.unshift({ ...data, items: data.items || [] });
  state.activeTemplateId = data.id;
  render();
  setStatus("已云端同步");
}

async function updateTemplate(id, patch) {
  setStatus("正在保存...");
  const { data, error } = await supabaseClient
    .from("packing_lists")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return showCloudError(error);
  state.templates = state.templates.map((template) =>
    template.id === id ? { ...data, items: data.items || [] } : template,
  );
  render();
  setStatus("已云端同步");
}

async function deleteTemplate(id) {
  setStatus("正在删除...");
  const { error } = await supabaseClient.from("packing_lists").delete().eq("id", id);
  if (error) return showCloudError(error);
  state.templates = state.templates.filter((template) => template.id !== id);
  state.activeTemplateId = state.templates[0]?.id || null;
  render();
  setStatus("已云端同步");
}

function showCloudError(error) {
  setStatus("同步失败");
  setAuthMessage(`Supabase 同步失败：${error.message}`, true);
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthMessage(`登录失败：${error.message}`, true);
  }
});

signUpBtn.addEventListener("click", async () => {
  setAuthMessage("");
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setAuthMessage("请输入邮箱和密码。", true);
    return;
  }
  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: APP_URL,
    },
  });
  if (error) {
    setAuthMessage(`注册失败：${error.message}。如果刚更新过 SQL，请重新运行 supabase-schema.sql 后再试。`, true);
    return;
  }

  setAuthMessage("注册成功，正在登录...");
  await new Promise((resolve) => window.setTimeout(resolve, 800));

  const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    setAuthMessage(`注册成功，但自动登录失败：${signInError.message}。请稍等几秒后手动登录。`, true);
    return;
  }
});

signOutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title || !state.session) return;
  todoInput.value = "";
  await addTodo(title);
});

newListBtn.addEventListener("click", () => {
  if (state.session) createTemplate();
});

cloneBtn.addEventListener("click", () => {
  const source = state.templates.find((template) => template.id === cloneSource.value);
  if (source && state.session) createTemplate(source);
});

templateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const template = getActiveTemplate();
  if (!template) return;
  await updateTemplate(template.id, {
    name: templateName.value.trim() || "未命名清单",
    category: templateCategory.value.trim() || "自定义",
    notes: templateNotes.value.trim(),
    priority: templatePriority.value,
  });
});

deleteTemplateBtn.addEventListener("click", async () => {
  const template = getActiveTemplate();
  if (!template || state.templates.length <= 1) return;
  const confirmed = window.confirm(`删除「${template.name}」？`);
  if (confirmed) await deleteTemplate(template.id);
});

packingItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const template = getActiveTemplate();
  const title = packingItemInput.value.trim();
  if (!template || !title) return;
  template.items.unshift({ id: crypto.randomUUID(), title, packed: false });
  packingItemInput.value = "";
  await updateTemplate(template.id, { items: template.items });
});

init();
