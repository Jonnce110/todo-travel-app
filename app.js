const SUPABASE_URL = "https://buwqmzdqxcyudkwmxzrd.supabase.co";
const APP_URL = "https://jonnce110.github.io/todo-travel-app/";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1d3FtemRxeGN5dWRrd214enJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjA4ODIsImV4cCI6MjA5Nzc5Njg4Mn0.AWvrQyxp0eH7Wmj2UZwQapz4gCGRGKCFMWlmBiNTqNk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const VALID_VIEWS = new Set(["todo", "packing", "bucket"]);

const defaultTodos = [];

const defaultTemplates = [
  {
    name: "基础GO",
    category: "通用",
    notes: "适合大多数短途和长途出行的基础清单。",
    priority: "基础",
    items: [
      {
        id: crypto.randomUUID(),
        title: "证件",
        packed: false,
        children: [
          { id: crypto.randomUUID(), title: "身份证/护照", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "签证/通行证", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "机票/酒店确认单", packed: false, children: [] },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: "支付",
        packed: false,
        children: [
          { id: crypto.randomUUID(), title: "银行卡", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "少量现金", packed: false, children: [] },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: "电子设备",
        packed: false,
        children: [
          { id: crypto.randomUUID(), title: "手机充电器", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "充电宝", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "转换插头", packed: false, children: [] },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: "随身物品",
        packed: false,
        children: [
          { id: crypto.randomUUID(), title: "纸巾/湿巾", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "常用药", packed: false, children: [] },
          { id: crypto.randomUUID(), title: "水杯", packed: false, children: [] },
        ],
      },
    ],
  },
];

let state = {
  session: null,
  todos: [],
  templates: [],
  bucketItems: [],
  activePackingView: "working",
  activeBucketCategory: null,
  activeTemplateId: null,
  openTemplateMenuId: null,
  addingChildForItemId: null,
  addingPackingRoot: false,
  showCompletedTodos: false,
  editingTodoId: null,
  editingBucketItemId: null,
  editingPackingItemId: null,
  renamingTemplateId: null,
  confirmingDeleteTemplateId: null,
  confirmingDeleteTodoId: null,
  confirmingDeleteBucketItemId: null,
  confirmingDeletePackingItemId: null,
  draggingTodoId: null,
  draggingTemplateId: null,
  collapsedPackingItemIds: new Set(),
  draggingPackingItemId: null,
  pendingShare: null,
  pendingShareAutoSave: false,
  shareError: false,
};

const authPanel = document.querySelector("#authPanel");
const authForm = document.querySelector("#authForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const signUpBtn = document.querySelector("#signUpBtn");
const signOutBtn = document.querySelector("#signOutBtn");
const authMessage = document.querySelector("#authMessage");
const workspace = document.querySelector(".workspace");
const viewTabsNav = document.querySelector(".view-tabs");
const viewTabs = document.querySelectorAll("[data-view-tab]");
const viewPanels = document.querySelectorAll("[data-view-panel]");

const todoForm = document.querySelector("#todoForm");
const todoInput = document.querySelector("#todoInput");
const todoList = document.querySelector("#todoList");
const todoEmpty = document.querySelector("#todoEmpty");
const todoCounter = document.querySelector("#todoCounter");
const completedTodosToggle = document.querySelector("#completedTodosToggle");
const saveStatus = document.querySelector("#saveStatus");

const newListBtn = document.querySelector("#newListBtn");
const templateList = document.querySelector("#templateList");
const packingViewTabs = document.querySelectorAll("[data-packing-view]");
const packingItemForm = document.querySelector("#packingItemForm");
const packingItemInput = document.querySelector("#packingItemInput");
const packingCancelRootBtn = document.querySelector("#packingCancelRootBtn");
const packingItems = document.querySelector("#packingItems");
const packingEmpty = document.querySelector("#packingEmpty");

const bucketForm = document.querySelector("#bucketForm");
const bucketAddBtn = document.querySelector("#bucketAddBtn");
const bucketCancelAddBtn = document.querySelector("#bucketCancelAddBtn");
const bucketInput = document.querySelector("#bucketInput");
const bucketCategoryInput = document.querySelector("#bucketCategoryInput");
const bucketCategorySuggestions = document.querySelector("#bucketCategorySuggestions");
const bucketTargetDateInput = document.querySelector("#bucketTargetDateInput");
const bucketCategoryTabs = document.querySelector("#bucketCategoryTabs");
const bucketList = document.querySelector("#bucketList");
const bucketEmpty = document.querySelector("#bucketEmpty");
const bucketCounter = document.querySelector("#bucketCounter");

const modalOverlay = document.querySelector("#modalOverlay");
const modalBody = document.querySelector("#modalBody");
const modalClose = document.querySelector("#modalClose");
let onModalClose = null;
let packingTitlePopover = null;

function openModal(buildBody, handleClose) {
  modalBody.innerHTML = "";
  buildBody(modalBody);
  onModalClose = handleClose || null;
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
  modalBody.innerHTML = "";
  const callback = onModalClose;
  onModalClose = null;
  if (callback) callback();
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) closeModal();
});

function closePackingTitlePopover() {
  packingTitlePopover?.remove();
  packingTitlePopover = null;
}

function showPackingTitlePopover(anchor, text) {
  closePackingTitlePopover();
  const popover = document.createElement("div");
  popover.className = "packing-title-popover";
  popover.textContent = text;
  popover.setAttribute("role", "tooltip");
  document.body.append(popover);

  const anchorRect = anchor.getBoundingClientRect();
  const width = Math.min(300, window.innerWidth - 24);
  const left = Math.min(
    window.innerWidth - width - 12,
    Math.max(12, anchorRect.left + anchorRect.width / 2 - width / 2),
  );
  popover.style.width = `${width}px`;
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.min(window.innerHeight - popover.offsetHeight - 12, anchorRect.bottom + 8)}px`;
  packingTitlePopover = popover;
}

document.addEventListener("click", (event) => {
  if (!packingTitlePopover) return;
  event.preventDefault();
  event.stopPropagation();
  closePackingTitlePopover();
}, true);
window.addEventListener("scroll", closePackingTitlePopover, true);

function setStatus(message) {
  saveStatus.textContent = message;
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function getActiveTemplate() {
  const visibleTemplates = getVisibleTemplates();
  return visibleTemplates.find((template) => template.id === state.activeTemplateId) || visibleTemplates[0];
}

function getVisibleTemplates() {
  return state.templates.filter((template) => (template.list_type || "working") === state.activePackingView);
}

function setActiveTemplateId(templateId) {
  state.activeTemplateId = templateId || null;
  if (templateId) setUiPreference(`active-${state.activePackingView}-list-id`, templateId);
}

function setPackingView(view) {
  if (!new Set(["working", "template"]).has(view)) return;
  state.activePackingView = view;
  state.addingPackingRoot = false;
  setUiPreference("packing-view", view);
  packingViewTabs.forEach((tab) => {
    const active = tab.dataset.packingView === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  const rememberedId = getUiPreference(`active-${view}-list-id`);
  const visibleTemplates = getVisibleTemplates();
  setActiveTemplateId(
    visibleTemplates.some((template) => template.id === rememberedId)
      ? rememberedId
      : visibleTemplates[0]?.id || null,
  );
  const newListLabel = view === "working" ? "新建清单" : "新建模板";
  newListBtn.textContent = "+";
  newListBtn.setAttribute("aria-label", newListLabel);
  newListBtn.title = newListLabel;
  const categoryLabel = view === "working" ? "新增分类" : "新增模板分类";
  const categorySubmitButton = packingItemForm.querySelector('[type="submit"]');
  packingItemInput.placeholder = categoryLabel;
  packingItemInput.setAttribute("aria-label", categoryLabel);
  categorySubmitButton.setAttribute("aria-label", categoryLabel);
  categorySubmitButton.title = categoryLabel;
  renderTemplates();
  renderEditor();
}

function getUiPreference(key) {
  if (!state.session?.user?.id) return null;
  try {
    return localStorage.getItem(`todo-travel:${state.session.user.id}:${key}`);
  } catch {
    return null;
  }
}

function setUiPreference(key, value) {
  if (!state.session?.user?.id) return;
  try {
    localStorage.setItem(`todo-travel:${state.session.user.id}:${key}`, value);
  } catch {
    // The app remains usable when browser storage is unavailable.
  }
}

function getRememberedView() {
  const view = getUiPreference("active-view");
  return VALID_VIEWS.has(view) ? view : "todo";
}

function setActiveView(view) {
  if (!state.session || !VALID_VIEWS.has(view)) return;

  viewTabs.forEach((tab) => {
    const active = tab.dataset.viewTab === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  viewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== view;
  });
  setUiPreference("active-view", view);
}

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  state.session = data.session;
  updateAuthUi();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    updateAuthUi();
    if (session) {
      setActiveView(getRememberedView());
      await loadCloudData();
      if (state.pendingShare && state.pendingShareAutoSave) {
        const snapshot = state.pendingShare;
        state.pendingShare = null;
        state.pendingShareAutoSave = false;
        await saveSharedList(snapshot);
        clearShareParam();
      }
    } else {
      loadSignedOutData();
    }
  });

  const shareParam = getShareParam();
  if (shareParam) {
    const snapshot = ShareCodec.decodeSharedList(shareParam);
    if (snapshot) state.pendingShare = snapshot;
    else state.shareError = true;
  }

  if (state.session) {
    setActiveView(getRememberedView());
    await loadCloudData();
  } else {
    loadSignedOutData();
  }

  if (state.pendingShare) {
    openImportModal(state.pendingShare);
  } else if (state.shareError) {
    openShareErrorModal();
  }
}

function updateAuthUi() {
  const signedIn = Boolean(state.session);
  authPanel.hidden = signedIn;
  viewTabsNav.hidden = !signedIn;
  workspace.hidden = !signedIn;
  workspace.classList.toggle("locked", false);
  workspace.classList.toggle("readonly", false);
  viewTabsNav.classList.toggle("single-tab", false);
  signOutBtn.hidden = !signedIn;
  newListBtn.hidden = !signedIn;
  packingItemForm.hidden = !signedIn || !state.addingPackingRoot;
  viewTabs.forEach((tab) => {
    tab.hidden = !signedIn;
  });
  if (signedIn) {
    setStatus(`已登录：${state.session.user.email}`);
    setAuthMessage("");
  } else {
    setStatus("请先登录");
  }
}

function loadSignedOutData() {
  state.todos = [];
  state.templates = [];
  state.bucketItems = [];
  state.activeBucketCategory = null;
  state.activeTemplateId = null;
  state.openTemplateMenuId = null;
  state.addingChildForItemId = null;
  state.addingPackingRoot = false;
  state.showCompletedTodos = false;
  state.editingTodoId = null;
  state.editingBucketItemId = null;
  state.editingPackingItemId = null;
  state.renamingTemplateId = null;
  state.confirmingDeleteTemplateId = null;
  state.confirmingDeleteTodoId = null;
  state.confirmingDeleteBucketItemId = null;
  state.confirmingDeletePackingItemId = null;
  state.draggingTodoId = null;
  state.draggingTemplateId = null;
  state.collapsedPackingItemIds = new Set();
  state.draggingPackingItemId = null;
  setBucketFormExpanded(false);
  viewPanels.forEach((panel) => {
    panel.hidden = true;
  });
  render();
}

async function loadCloudData() {
  setStatus("正在同步...");

  let [todosResult, templatesResult, bucketItemsResult] = await Promise.all([
    supabaseClient.from("todos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabaseClient.from("packing_lists").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabaseClient.from("bucket_items").select("*").order("created_at", { ascending: false }),
  ]);

  if (todosResult.error?.message?.includes("sort_order")) {
    todosResult = await supabaseClient.from("todos").select("*").order("created_at", { ascending: false });
  }
  if (templatesResult.error?.message?.includes("sort_order")) {
    templatesResult = await supabaseClient.from("packing_lists").select("*").order("created_at", { ascending: false });
  }

  const { data: todos, error: todosError } = todosResult;
  const { data: templates, error: templatesError } = templatesResult;
  const { data: bucketItems, error: bucketItemsError } = bucketItemsResult;

  if (todosError || templatesError || bucketItemsError) {
    const message = todosError?.message || templatesError?.message || bucketItemsError?.message || "同步失败";
    setStatus("同步失败");
    setAuthMessage(`Supabase 同步失败：${message}。请确认已经运行 supabase-schema.sql。`, true);
    render();
    return;
  }

  if (todos.length === 0 && templates.length === 0 && bucketItems.length === 0) {
    await seedDefaultData();
    return loadCloudData();
  }

  state.todos = todos;
  state.templates = templates.map((template) => ({
    ...template,
    list_type: template.list_type || "working",
    items: normalizeItems(template.items),
  }));
  state.bucketItems = bucketItems;
  const rememberedPackingView = getUiPreference("packing-view");
  setPackingView(rememberedPackingView === "template" ? "template" : "working");
  render();
  setStatus("已云端同步");
}

async function seedDefaultData() {
  const userId = state.session.user.id;
  const inserts = [];
  if (defaultTodos.length > 0) {
    inserts.push(supabaseClient.from("todos").insert(defaultTodos.map((todo) => ({ ...todo, user_id: userId }))));
  }
  inserts.push(
    supabaseClient.from("packing_lists").insert(
      defaultTemplates.map((template, index) => ({
        ...template,
        list_type: "working",
        sort_order: index,
        user_id: userId,
      })),
    ),
  );
  await Promise.all(inserts);
}

function render() {
  renderTodos();
  renderTemplates();
  renderEditor();
  renderBucketItems();
}

function renderTodos() {
  todoList.innerHTML = "";
  const activeTodos = state.todos.filter((todo) => !todo.done);
  const completedTodos = state.todos.filter((todo) => todo.done);
  const visibleTodos = state.showCompletedTodos
    ? [...activeTodos, ...completedTodos]
    : activeTodos;

  visibleTodos.forEach((todo) => {
    const node = document.querySelector("#todoItemTemplate").content.firstElementChild.cloneNode(true);
    node.dataset.todoId = todo.id;
    node.classList.toggle("done", todo.done);
    node.querySelector("input").checked = todo.done;
    const titleSlot = node.querySelector(".item-title");
    const editButton = node.querySelector(".edit-action");
    const deleteButton = node.querySelector(".delete-action");
    if (state.editingTodoId === todo.id) {
      const editForm = createTodoEditForm(todo.title, async (value) => {
        state.editingTodoId = null;
        await updateTodo(todo.id, { title: value });
      });
      titleSlot.replaceChildren(editForm);

      editButton.textContent = "✓";
      editButton.title = "保存";
      editButton.setAttribute("aria-label", "保存");
      editButton.addEventListener("click", () => editForm.requestSubmit());

      deleteButton.title = "取消";
      deleteButton.setAttribute("aria-label", "取消");
      deleteButton.addEventListener("click", () => {
        state.editingTodoId = null;
        render();
      });
    } else {
      titleSlot.textContent = todo.title;
      setupTodoDrag(node, todo, todo.done ? completedTodos : activeTodos);
      editButton.addEventListener("click", () => {
        state.editingTodoId = todo.id;
        state.confirmingDeleteTodoId = null;
        render();
      });
      deleteButton.addEventListener("click", () => {
        state.confirmingDeleteTodoId = todo.id;
        render();
      });
    }
    node.querySelector("input").addEventListener("change", async (event) => {
      await updateTodo(todo.id, { done: event.target.checked });
    });
    if (state.confirmingDeleteTodoId === todo.id) {
      node.append(createDeleteConfirmRow(async () => {
        state.confirmingDeleteTodoId = null;
        await deleteTodo(todo.id);
      }, () => {
        state.confirmingDeleteTodoId = null;
        render();
      }));
    }
    todoList.append(node);
  });
  todoCounter.textContent = `${activeTodos.length} to GO`;
  todoEmpty.textContent = state.todos.length === 0
    ? "还没有待办，先加一件小事吧。"
    : "当前待办都完成了，做得不错。";
  todoEmpty.classList.toggle("visible", activeTodos.length === 0 && !state.showCompletedTodos);

  completedTodosToggle.hidden = completedTodos.length === 0;
  completedTodosToggle.textContent = state.showCompletedTodos
    ? "收起已完成"
    : "查看已完成";
  completedTodosToggle.setAttribute("aria-expanded", String(state.showCompletedTodos));
}

function setupTodoDrag(row, todo, siblingTodos) {
  row.draggable = true;
  row.title = "拖动调整待办顺序";

  row.addEventListener("dragstart", (event) => {
    state.draggingTodoId = todo.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", todo.id);
    row.classList.add("dragging");
  });

  row.addEventListener("dragover", (event) => {
    if (!state.draggingTodoId || state.draggingTodoId === todo.id) return;
    if (!siblingTodos.some((item) => item.id === state.draggingTodoId)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = row.getBoundingClientRect();
    const dropPosition = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    row.dataset.dropPosition = dropPosition;
    row.classList.toggle("drag-over-before", dropPosition === "before");
    row.classList.toggle("drag-over-after", dropPosition === "after");
  });

  row.addEventListener("dragleave", () => {
    row.classList.remove("drag-over-before", "drag-over-after");
    delete row.dataset.dropPosition;
  });

  row.addEventListener("drop", async (event) => {
    event.preventDefault();
    const dropPosition = row.dataset.dropPosition || "before";
    row.classList.remove("drag-over-before", "drag-over-after");
    delete row.dataset.dropPosition;
    const draggedTodoId = event.dataTransfer.getData("text/plain") || state.draggingTodoId;
    state.draggingTodoId = null;
    if (!draggedTodoId || draggedTodoId === todo.id) return;
    const reordered = moveSiblingItem(siblingTodos, draggedTodoId, todo.id, dropPosition);
    if (reordered === siblingTodos) return;

    const activeTodos = state.todos.filter((item) => !item.done);
    const completedTodos = state.todos.filter((item) => item.done);
    state.todos = todo.done ? [...activeTodos, ...reordered] : [...reordered, ...completedTodos];
    state.todos.forEach((item, index) => {
      item.sort_order = index;
    });
    renderTodos();
    await persistTodoOrder();
  });

  row.addEventListener("dragend", () => {
    state.draggingTodoId = null;
    row.classList.remove("dragging", "drag-over-before", "drag-over-after");
    delete row.dataset.dropPosition;
  });
}

function renderBucketItems() {
  const categories = getBucketCategories();
  if (state.activeBucketCategory && !categories.includes(state.activeBucketCategory)) {
    state.activeBucketCategory = null;
  }
  renderBucketCategoryTabs(categories);

  const visibleItems = state.activeBucketCategory
    ? state.bucketItems.filter((item) => normalizeBucketCategory(item.category) === state.activeBucketCategory)
    : state.bucketItems;
  bucketList.innerHTML = "";
  visibleItems.forEach((item) => {
    const node = document.querySelector("#bucketItemTemplate").content.firstElementChild.cloneNode(true);
    const contentSlot = node.querySelector(".bucket-content");
    const titleSlot = node.querySelector(".item-title");
    const editButton = node.querySelector(".edit-action");
    const deleteButton = node.querySelector(".delete-action");
    if (state.editingBucketItemId === item.id) {
      const editForm = createBucketEditForm(item, async (title, category, targetDate) => {
        state.editingBucketItemId = null;
        await updateBucketItem(item.id, {
          title,
          category: category || null,
          target_date: targetDate || null,
        });
      });
      contentSlot.replaceChildren(editForm);

      editButton.textContent = "✓";
      editButton.title = "保存";
      editButton.setAttribute("aria-label", "保存");
      editButton.addEventListener("click", () => editForm.requestSubmit());

      deleteButton.title = "取消";
      deleteButton.setAttribute("aria-label", "取消");
      deleteButton.addEventListener("click", () => {
        state.editingBucketItemId = null;
        render();
      });
    } else {
      titleSlot.textContent = item.title;
      const category = normalizeBucketCategory(item.category);
      const markerColor = getBucketCategoryColor(category);
      node.querySelector(".bucket-marker").style.setProperty("--bucket-color", markerColor);
      const meta = node.querySelector(".bucket-meta");
      const categoryLabel = node.querySelector(".bucket-category-label");
      if (category) {
        categoryLabel.textContent = category;
        categoryLabel.hidden = false;
        meta.hidden = false;
      }
      const targetDate = node.querySelector(".bucket-target-date");
      if (item.target_date) {
        targetDate.dateTime = item.target_date;
        targetDate.textContent = `目标 ${formatTargetDate(item.target_date)}`;
        targetDate.hidden = false;
        meta.hidden = false;
      }
      editButton.addEventListener("click", () => {
        state.editingBucketItemId = item.id;
        state.confirmingDeleteBucketItemId = null;
        render();
      });
      deleteButton.addEventListener("click", () => {
        state.confirmingDeleteBucketItemId = item.id;
        render();
      });
    }
    if (state.confirmingDeleteBucketItemId === item.id) {
      node.append(createDeleteConfirmRow(async () => {
        state.confirmingDeleteBucketItemId = null;
        await deleteBucketItem(item.id);
      }, () => {
        state.confirmingDeleteBucketItemId = null;
        render();
      }));
    }
    bucketList.append(node);
  });
  bucketCounter.textContent = state.activeBucketCategory
    ? `${visibleItems.length}/${state.bucketItems.length} 项`
    : `${state.bucketItems.length} 项`;
  bucketEmpty.textContent = state.activeBucketCategory
    ? `“${state.activeBucketCategory}”分类下还没有愿望。`
    : "还没有人生清单，先写下一件想实现的事吧。";
  bucketEmpty.classList.toggle("visible", visibleItems.length === 0);
}

function setBucketFormExpanded(expanded) {
  bucketForm.hidden = !expanded;
  bucketAddBtn.hidden = expanded;
  bucketAddBtn.setAttribute("aria-expanded", String(expanded));
  if (expanded) {
    requestAnimationFrame(() => bucketInput.focus());
  } else {
    bucketInput.value = "";
    bucketCategoryInput.value = "";
    bucketTargetDateInput.value = "";
  }
}

function normalizeBucketCategory(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getBucketCategories() {
  return [...new Set(state.bucketItems.map((item) => normalizeBucketCategory(item.category)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderBucketCategoryTabs(categories) {
  bucketCategoryTabs.innerHTML = "";
  const tabs = [{ label: "全部", category: null }, ...categories.map((category) => ({ label: category, category }))];
  tabs.forEach(({ label, category }) => {
    const button = document.createElement("button");
    button.className = "bucket-category-tab";
    button.type = "button";
    button.classList.toggle("active", state.activeBucketCategory === category);
    button.setAttribute("aria-pressed", String(state.activeBucketCategory === category));
    if (category) {
      const dot = document.createElement("span");
      dot.className = "bucket-tab-dot";
      dot.style.setProperty("--bucket-color", getBucketCategoryColor(category));
      button.append(dot);
    }
    button.append(document.createTextNode(label));
    button.addEventListener("click", () => {
      state.activeBucketCategory = category;
      state.editingBucketItemId = null;
      state.confirmingDeleteBucketItemId = null;
      render();
    });
    bucketCategoryTabs.append(button);
  });
}

function getBucketCategoryColor(category) {
  if (!category) return "#9aa59f";
  const colors = ["#ff6b6b", "#ff9f1c", "#ffd43b", "#51cf66", "#22b8cf", "#4dabf7", "#845ef7", "#f06595"];
  let hash = 0;
  for (const character of category) hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function formatTargetDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

function createBucketEditForm(item, onSave) {
  const form = document.createElement("form");
  form.className = "bucket-edit-form";
  form.addEventListener("click", (event) => event.stopPropagation());

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.autocomplete = "off";
  titleInput.value = item.title;
  titleInput.setAttribute("aria-label", "修改愿望");

  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.autocomplete = "off";
  categoryInput.value = normalizeBucketCategory(item.category);
  categoryInput.setAttribute("placeholder", "分类（可选）");
  categoryInput.setAttribute("aria-label", "修改愿望分类（可选）");
  categoryInput.setAttribute("aria-autocomplete", "list");
  categoryInput.setAttribute("aria-expanded", "false");

  const categoryField = document.createElement("div");
  categoryField.className = "category-combobox";
  const categorySuggestions = document.createElement("div");
  categorySuggestions.className = "category-suggestions";
  categorySuggestions.role = "listbox";
  categorySuggestions.hidden = true;
  categoryField.append(categoryInput, categorySuggestions);
  setupCategoryCombobox(categoryInput, categorySuggestions);

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = item.target_date || "";
  dateInput.setAttribute("aria-label", "修改目标日期（可选）");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    await onSave(title, normalizeBucketCategory(categoryInput.value), dateInput.value);
  });

  form.append(titleInput, categoryField, dateInput);
  requestAnimationFrame(() => {
    titleInput.focus();
    titleInput.select();
  });
  return form;
}

function setupCategoryCombobox(input, suggestions) {
  function showSuggestions(filter = "") {
    const normalizedFilter = normalizeBucketCategory(filter).toLocaleLowerCase("zh-CN");
    const categories = getBucketCategories().filter((category) => (
      !normalizedFilter || category.toLocaleLowerCase("zh-CN").includes(normalizedFilter)
    ));
    suggestions.replaceChildren(...categories.map((category) => {
      const option = document.createElement("button");
      option.type = "button";
      option.role = "option";
      option.textContent = category;
      option.addEventListener("click", () => {
        input.value = category;
        suggestions.hidden = true;
        input.setAttribute("aria-expanded", "false");
        input.focus();
      });
      return option;
    }));
    suggestions.hidden = categories.length === 0;
    input.setAttribute("aria-expanded", String(categories.length > 0));
  }

  input.addEventListener("focus", () => showSuggestions());
  input.addEventListener("click", () => showSuggestions());
  input.addEventListener("input", () => showSuggestions(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      suggestions.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      suggestions.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }, 120);
  });
}

function renderTemplates() {
  templateList.innerHTML = "";
  templateList.append(newListBtn);
  const visibleTemplates = getVisibleTemplates();

  visibleTemplates.forEach((template) => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.dataset.templateId = template.id;
    card.classList.toggle("active", template.id === state.activeTemplateId);
    card.classList.toggle("menu-open", template.id === state.openTemplateMenuId);
    if (state.session && state.renamingTemplateId !== template.id) {
      setupTemplateDrag(card, template);
    }

    const tab = document.createElement("button");
    tab.className = "template-tab";
    tab.type = "button";
    tab.innerHTML = `<strong></strong><span></span>`;
    tab.querySelector("strong").textContent = template.name;
    const totalCount = countItems(template.items);
    const countLabel = state.activePackingView === "working"
      ? `${countPackedItems(template.items)}/${totalCount}`
      : `${totalCount}`;
    tab.querySelector("span").textContent = `· ${countLabel}`;
    tab.addEventListener("click", () => {
      setActiveTemplateId(template.id);
      state.openTemplateMenuId = null;
      state.addingPackingRoot = false;
      render();
    });

    const menuButton = document.createElement("button");
    menuButton.className = "template-menu-button";
    menuButton.type = "button";
    menuButton.title = "清单操作";
    menuButton.textContent = "⋯";
    menuButton.hidden = !state.session;
    menuButton.addEventListener("click", () => {
      setActiveTemplateId(template.id);
      state.addingPackingRoot = false;
      state.openTemplateMenuId = state.openTemplateMenuId === template.id ? null : template.id;
      render();
    });

    const menu = document.createElement("div");
    menu.className = "template-menu";

    const addRootButton = document.createElement("button");
    addRootButton.type = "button";
    addRootButton.textContent = state.activePackingView === "working" ? "新增分类" : "新增模板分类";
    addRootButton.addEventListener("click", () => {
      setActiveTemplateId(template.id);
      state.openTemplateMenuId = null;
      state.addingPackingRoot = true;
      render();
      requestAnimationFrame(() => packingItemInput.focus());
    });

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "重命名";
    renameButton.addEventListener("click", () => {
      state.renamingTemplateId = template.id;
      state.confirmingDeleteTemplateId = null;
      render();
    });

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.textContent = state.activePackingView === "working" ? "复制为新清单" : "用这个模板出发";
    useButton.addEventListener("click", async () => {
      state.openTemplateMenuId = null;
      if (!state.session) return;
      if (state.activePackingView === "working") {
        await createPackingList(template, { listType: "working", name: `${template.name} 副本` });
      } else {
        await createPackingList(template, { listType: "working", name: `${template.name} 新行程`, switchView: true });
      }
    });

    const saveAsTemplateButton = document.createElement("button");
    saveAsTemplateButton.type = "button";
    saveAsTemplateButton.textContent = "存到参考一下";
    saveAsTemplateButton.addEventListener("click", async () => {
      state.openTemplateMenuId = null;
      await createPackingList(template, { listType: "template", name: template.name, activate: false });
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-menu-action";
    deleteButton.textContent = "删除";
    deleteButton.disabled = state.activePackingView === "working" && visibleTemplates.length <= 1;
    deleteButton.addEventListener("click", () => {
      if (state.activePackingView === "working" && visibleTemplates.length <= 1) return;
      state.confirmingDeleteTemplateId = template.id;
      state.renamingTemplateId = null;
      render();
    });

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.textContent = "分享";
    shareButton.addEventListener("click", () => {
      state.openTemplateMenuId = null;
      render();
      shareTemplate(template);
    });
    menu.append(addRootButton);
    if (state.activePackingView === "working") menu.append(saveAsTemplateButton);
    menu.append(useButton, renameButton, shareButton, deleteButton);
    if (state.renamingTemplateId === template.id) {
      menu.append(createInlineEditForm(template.name, async (value) => {
        state.renamingTemplateId = null;
        state.openTemplateMenuId = null;
        await updateTemplate(template.id, { name: value || "未命名清单" });
      }, () => {
        state.renamingTemplateId = null;
        render();
      }));
    }
    if (state.confirmingDeleteTemplateId === template.id) {
      menu.append(createDeleteConfirmRow(async () => {
        state.confirmingDeleteTemplateId = null;
        state.openTemplateMenuId = null;
        await deleteTemplate(template.id);
      }, () => {
        state.confirmingDeleteTemplateId = null;
        render();
      }, true));
    }
    card.append(tab, menuButton, menu);
    templateList.append(card);
  });

}

document.addEventListener("click", (event) => {
  if (!state.openTemplateMenuId) return;
  const target = event.target;
  if (target instanceof Element && target.closest(".template-menu, .template-menu-button")) return;

  event.preventDefault();
  event.stopPropagation();
  state.openTemplateMenuId = null;
  state.renamingTemplateId = null;
  state.confirmingDeleteTemplateId = null;
  renderTemplates();
}, true);

function setupTemplateDrag(card, template) {
  card.draggable = true;
  card.title = "拖动调整清单顺序";

  card.addEventListener("dragstart", (event) => {
    if (event.target.closest(".template-menu")) {
      event.preventDefault();
      return;
    }
    state.draggingTemplateId = template.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", template.id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragover", (event) => {
    if (!state.draggingTemplateId || state.draggingTemplateId === template.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = card.getBoundingClientRect();
    const horizontal = window.matchMedia("(max-width: 680px)").matches;
    const dropPosition = horizontal
      ? (event.clientX < rect.left + rect.width / 2 ? "before" : "after")
      : (event.clientY < rect.top + rect.height / 2 ? "before" : "after");
    card.dataset.dropPosition = dropPosition;
    card.classList.toggle("drag-over-before", dropPosition === "before");
    card.classList.toggle("drag-over-after", dropPosition === "after");
  });

  card.addEventListener("dragleave", () => {
    card.classList.remove("drag-over-before", "drag-over-after");
    delete card.dataset.dropPosition;
  });

  card.addEventListener("drop", async (event) => {
    event.preventDefault();
    const dropPosition = card.dataset.dropPosition || "before";
    card.classList.remove("drag-over-before", "drag-over-after");
    delete card.dataset.dropPosition;
    const draggedTemplateId = event.dataTransfer.getData("text/plain") || state.draggingTemplateId;
    state.draggingTemplateId = null;
    if (!draggedTemplateId || draggedTemplateId === template.id) return;
    const visibleTemplates = getVisibleTemplates();
    const reordered = moveSiblingItem(visibleTemplates, draggedTemplateId, template.id, dropPosition);
    if (reordered === visibleTemplates) return;
    const otherTemplates = state.templates.filter((item) => (item.list_type || "working") !== state.activePackingView);
    state.templates = state.activePackingView === "working"
      ? [...reordered, ...otherTemplates]
      : [...otherTemplates, ...reordered];
    reordered.forEach((item, index) => {
      item.sort_order = index;
    });
    renderTemplates();
    await persistTemplateOrder();
  });

  card.addEventListener("dragend", () => {
    state.draggingTemplateId = null;
    card.classList.remove("dragging", "drag-over-before", "drag-over-after");
    delete card.dataset.dropPosition;
  });
}

function renderEditor() {
  const template = getActiveTemplate();
  packingItemForm.hidden = !template || !state.addingPackingRoot;
  if (!template) {
    packingItems.innerHTML = "";
    packingEmpty.textContent = state.activePackingView === "working"
      ? "还没有正在准备的清单。"
      : "还没有模板，可以从“带点啥呢”存一份过来。";
    packingEmpty.classList.add("visible");
    return;
  }

  packingItems.innerHTML = "";
  template.items.forEach((item) => {
    packingItems.append(renderPackingItem(template, item, 0, template.items));
  });

  const totalCount = countItems(template.items);
  packingEmpty.textContent = state.activePackingView === "working"
    ? "这个清单还没有物品。"
    : "这个模板还没有物品。";
  packingEmpty.classList.toggle("visible", totalCount === 0);
}

function renderPackingItem(template, item, depth, siblingItems) {
  const isReferenceTemplate = (template.list_type || "working") === "template";
  const wrapper = document.createElement("li");
  wrapper.className = "tree-item";
  wrapper.classList.toggle("packing-group", depth === 0);
  wrapper.classList.toggle("packing-card", depth > 0);
  wrapper.style.setProperty("--depth", depth);

  const row = document.querySelector("#packingItemTemplate").content.firstElementChild.cloneNode(true);
  row.classList.toggle("packing-group-row", depth === 0);
  row.classList.toggle("packing-card-item", depth > 0);
  row.classList.toggle("done", item.packed && !isReferenceTemplate);
  row.querySelector("input").checked = item.packed;
  row.querySelector("input").disabled = !state.session || isReferenceTemplate;
  row.querySelector("input").hidden = isReferenceTemplate;
  const itemTitle = row.querySelector(".item-title");
  itemTitle.textContent = item.title;
  if (depth > 0) {
    const showFullTitle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (itemTitle.scrollWidth > itemTitle.clientWidth) {
        showPackingTitlePopover(itemTitle, item.title);
      }
    };
    itemTitle.addEventListener("click", showFullTitle);
    requestAnimationFrame(() => {
      if (!itemTitle.isConnected || itemTitle.scrollWidth <= itemTitle.clientWidth) return;
      itemTitle.classList.add("truncated-packing-title");
      itemTitle.tabIndex = 0;
      itemTitle.setAttribute("role", "button");
      itemTitle.setAttribute("aria-label", `查看完整名称：${item.title}`);
      itemTitle.title = "点击查看完整名称";
      itemTitle.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") showFullTitle(event);
      });
    });
  }

  const childCount = countItems(item.children);
  const packedChildCount = countPackedItems(item.children);
  if (state.session) {
    row.draggable = true;
    row.title = depth === 0 ? "拖动调整一级目录顺序" : "拖动调整本组子项顺序";
    row.addEventListener("dragstart", (event) => {
      state.draggingPackingItemId = item.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      row.classList.add("dragging");
    });
    row.addEventListener("dragover", (event) => {
      if (!state.draggingPackingItemId || state.draggingPackingItemId === item.id) return;
      if (!siblingItems.some((entry) => entry.id === state.draggingPackingItemId)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const rect = row.getBoundingClientRect();
      const dropPosition = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      row.dataset.dropPosition = dropPosition;
      row.classList.toggle("drag-over-before", dropPosition === "before");
      row.classList.toggle("drag-over-after", dropPosition === "after");
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over-before", "drag-over-after");
      delete row.dataset.dropPosition;
    });
    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      const dropPosition = row.dataset.dropPosition || "before";
      row.classList.remove("drag-over-before", "drag-over-after");
      delete row.dataset.dropPosition;
      const draggedItemId = event.dataTransfer.getData("text/plain") || state.draggingPackingItemId;
      state.draggingPackingItemId = null;
      if (!draggedItemId || draggedItemId === item.id) return;
      const nextItems = moveSiblingItem(siblingItems, draggedItemId, item.id, dropPosition);
      siblingItems.splice(0, siblingItems.length, ...nextItems);
      await updateTemplate(template.id, { items: template.items });
    });
    row.addEventListener("dragend", () => {
      state.draggingPackingItemId = null;
      row.classList.remove("dragging", "drag-over-before", "drag-over-after");
      delete row.dataset.dropPosition;
    });
  }

  if (depth === 0) {
    const collapseButton = document.createElement("button");
    collapseButton.className = "icon-btn collapse-action";
    collapseButton.type = "button";
    collapseButton.title = state.collapsedPackingItemIds.has(item.id) ? "展开分项" : "折叠分项";
    collapseButton.textContent = state.collapsedPackingItemIds.has(item.id) ? "▸" : "▾";
    collapseButton.disabled = childCount === 0;
    collapseButton.addEventListener("click", () => {
      if (state.collapsedPackingItemIds.has(item.id)) {
        state.collapsedPackingItemIds.delete(item.id);
      } else {
        state.collapsedPackingItemIds.add(item.id);
      }
      render();
    });
    row.querySelector(".check-row").prepend(collapseButton);

    const meta = document.createElement("span");
    meta.className = "group-count";
    meta.textContent = isReferenceTemplate ? `${childCount}` : `${packedChildCount}/${childCount}`;
    row.querySelector(".check-row").append(meta);
    if (!state.session) {
      row.querySelector(".add-child-action").remove();
      row.querySelector(".edit-action").remove();
      row.querySelector(".delete-action").remove();
    }
  } else {
    row.querySelector(".add-child-action").remove();
    row.querySelector(".edit-action").remove();
    if (!state.session) {
      row.querySelector(".delete-action").remove();
    }
  }

  row.querySelector("input").addEventListener("change", async (event) => {
    if (!state.session || isReferenceTemplate) return;
    updateItemById(template.items, item.id, (entry) => {
      entry.packed = event.target.checked;
    });
    await updateTemplate(template.id, { items: template.items });
  });
  const editButton = row.querySelector(".edit-action");
  const addChildButton = row.querySelector(".add-child-action");
  if (editButton) {
    editButton.addEventListener("click", () => {
      state.editingPackingItemId = item.id;
      render();
    });
  }
  if (addChildButton) {
    addChildButton.addEventListener("click", () => {
      state.addingChildForItemId = state.addingChildForItemId === item.id ? null : item.id;
      render();
    });
  }
  const deleteButton = row.querySelector(".delete-action");
  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      state.confirmingDeletePackingItemId = item.id;
      render();
    });
  }

  wrapper.append(row);
  if (state.confirmingDeletePackingItemId === item.id) {
    const confirmRow = createDeleteConfirmRow(async () => {
      state.confirmingDeletePackingItemId = null;
      template.items = removeItemById(template.items, item.id);
      await updateTemplate(template.id, { items: template.items });
    }, () => {
      state.confirmingDeletePackingItemId = null;
      render();
    });
    confirmRow.classList.add("tree-inline-form");
    confirmRow.style.setProperty("--depth", depth);
    wrapper.append(confirmRow);
  }
  if (state.editingPackingItemId === item.id) {
    wrapper.append(renderPackingEditInput(template, item, depth));
  }
  if (state.addingChildForItemId === item.id) {
    wrapper.append(renderChildInput(template, item, depth + 1));
  }
  if (item.children.length > 0 && !(depth === 0 && state.collapsedPackingItemIds.has(item.id))) {
    const children = document.createElement("ul");
    children.className = depth === 0 ? "packing-children child-card-grid" : "packing-children";
    item.children.forEach((child) => {
      children.append(renderPackingItem(template, child, depth + 1, item.children));
    });
    wrapper.append(children);
  }
  return wrapper;
}

function renderPackingEditInput(template, item, depth) {
  const form = createInlineEditForm(item.title, async (value) => {
    updateItemById(template.items, item.id, (entry) => {
      entry.title = value;
    });
    state.editingPackingItemId = null;
    await updateTemplate(template.id, { items: template.items });
  }, () => {
    state.editingPackingItemId = null;
    render();
  });

  form.classList.add("tree-inline-form");
  form.style.setProperty("--depth", depth);
  return form;
}

function renderChildInput(template, parentItem, depth) {
  const form = document.createElement("form");
  form.className = "inline-child-form";
  form.style.setProperty("--depth", depth);

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.placeholder = "新增分项";
  input.setAttribute("aria-label", "新增分项");

  const submitButton = document.createElement("button");
  submitButton.className = "secondary-btn";
  submitButton.type = "submit";
  submitButton.textContent = "添加";

  const cancelButton = document.createElement("button");
  cancelButton.className = "icon-btn";
  cancelButton.type = "button";
  cancelButton.title = "取消";
  cancelButton.textContent = "×";
  cancelButton.addEventListener("click", () => {
    state.addingChildForItemId = null;
    render();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    updateItemById(template.items, parentItem.id, (entry) => {
      entry.children = entry.children || [];
      entry.children.unshift({
        id: crypto.randomUUID(),
        title,
        packed: false,
        children: [],
      });
    });
    state.addingChildForItemId = null;
    await updateTemplate(template.id, { items: template.items });
  });

  form.append(input, submitButton, cancelButton);
  requestAnimationFrame(() => input.focus());
  return form;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    title: item.title || "未命名物品",
    packed: Boolean(item.packed),
    children: normalizeItems(item.children),
  }));
}

function cloneItems(items) {
  return normalizeItems(items).map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    packed: false,
    children: cloneItems(item.children),
  }));
}

function countItems(items) {
  return normalizeItems(items).reduce((total, item) => total + 1 + countItems(item.children), 0);
}

function countPackedItems(items) {
  return normalizeItems(items).reduce(
    (total, item) => total + (item.packed ? 1 : 0) + countPackedItems(item.children),
    0,
  );
}

function updateItemById(items, id, updater) {
  for (const item of items) {
    if (item.id === id) {
      updater(item);
      return true;
    }
    if (updateItemById(item.children || [], id, updater)) return true;
  }
  return false;
}

function removeItemById(items, id) {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeItemById(item.children || [], id),
    }));
}

function moveSiblingItem(items, draggedItemId, targetItemId, dropPosition) {
  const nextItems = [...items];
  const fromIndex = nextItems.findIndex((item) => item.id === draggedItemId);
  const toIndex = nextItems.findIndex((item) => item.id === targetItemId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;

  const [draggedItem] = nextItems.splice(fromIndex, 1);
  const targetIndex = nextItems.findIndex((item) => item.id === targetItemId);
  const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex;
  nextItems.splice(insertIndex, 0, draggedItem);
  return nextItems;
}

function createInlineEditForm(currentValue, onSave, onCancel) {
  const form = document.createElement("form");
  form.className = "inline-edit-form";
  form.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.value = currentValue;
  input.setAttribute("aria-label", "修改内容");

  const saveButton = document.createElement("button");
  saveButton.className = "secondary-btn";
  saveButton.type = "submit";
  saveButton.textContent = "保存";

  const cancelButton = document.createElement("button");
  cancelButton.className = "icon-btn";
  cancelButton.type = "button";
  cancelButton.title = "取消";
  cancelButton.textContent = "×";
  cancelButton.addEventListener("click", onCancel);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    await onSave(value);
  });

  form.append(input, saveButton, cancelButton);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  return form;
}

function createTodoEditForm(currentValue, onSave) {
  const form = document.createElement("form");
  form.className = "todo-edit-form";
  form.addEventListener("click", (event) => event.stopPropagation());

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.value = currentValue;
  input.setAttribute("aria-label", "修改待办");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    await onSave(value);
  });

  form.append(input);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  return form;
}

function createDeleteConfirmRow(onConfirm, onCancel, iconOnly = false) {
  const row = document.createElement("div");
  row.className = "delete-confirm-row";

  const confirmButton = document.createElement("button");
  confirmButton.className = "danger-menu-action";
  confirmButton.type = "button";
  confirmButton.textContent = iconOnly ? "✓" : "删除";
  if (iconOnly) {
    confirmButton.title = "确认删除";
    confirmButton.setAttribute("aria-label", "确认删除");
  }
  confirmButton.addEventListener("click", onConfirm);

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = iconOnly ? "×" : "取消";
  if (iconOnly) {
    cancelButton.title = "取消";
    cancelButton.setAttribute("aria-label", "取消");
  }
  cancelButton.addEventListener("click", onCancel);

  row.append(confirmButton, cancelButton);
  return row;
}

async function addTodo(title) {
  setStatus("正在保存...");
  const firstSortOrder = state.todos.reduce(
    (minimum, todo) => Math.min(minimum, Number(todo.sort_order) || 0),
    0,
  ) - 1;
  const { data, error } = await supabaseClient
    .from("todos")
    .insert({ title, sort_order: firstSortOrder, user_id: state.session.user.id })
    .select()
    .single();
  if (error) return showCloudError(error);
  state.todos.unshift(data);
  render();
  setStatus("已云端同步");
}

async function persistTodoOrder() {
  setStatus("正在保存顺序...");
  const rows = state.todos.map((todo) => ({
    id: todo.id,
    user_id: state.session.user.id,
    title: todo.title,
    done: todo.done,
    sort_order: todo.sort_order,
    created_at: todo.created_at,
  }));
  const { error } = await supabaseClient.from("todos").upsert(rows, { onConflict: "id" });
  if (error) return showCloudError(error);
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

async function addBucketItem(title, category, targetDate) {
  setStatus("正在保存...");
  const { data, error } = await supabaseClient
    .from("bucket_items")
    .insert({
      title,
      category: category || null,
      target_date: targetDate || null,
      user_id: state.session.user.id,
    })
    .select()
    .single();
  if (error) {
    showCloudError(error);
    return false;
  }
  state.bucketItems.unshift(data);
  render();
  setStatus("已云端同步");
  return true;
}

async function updateBucketItem(id, patch) {
  setStatus("正在保存...");
  const { data, error } = await supabaseClient
    .from("bucket_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return showCloudError(error);
  state.bucketItems = state.bucketItems.map((item) => (item.id === id ? data : item));
  render();
  setStatus("已云端同步");
}

async function deleteBucketItem(id) {
  setStatus("正在删除...");
  const { error } = await supabaseClient.from("bucket_items").delete().eq("id", id);
  if (error) return showCloudError(error);
  state.bucketItems = state.bucketItems.filter((item) => item.id !== id);
  render();
  setStatus("已云端同步");
}

const SHARE_LINK_WARN_LENGTH = 8000;

function buildShareLink(template) {
  const payload = ShareCodec.encodeSharedList({
    name: template.name,
    category: template.category,
    notes: template.notes,
    priority: template.priority,
    items: template.items,
  });
  return `${location.origin}${location.pathname}?s=${payload}`;
}

async function shareTemplate(template) {
  const link = buildShareLink(template);
  let copied = false;
  try {
    await navigator.clipboard.writeText(link);
    copied = true;
  } catch (err) {
    copied = false;
  }
  openShareResultModal(link, copied);
}

function openShareResultModal(link, copied) {
  openModal((body) => {
    const title = document.createElement("h3");
    title.textContent = "分享链接已生成";
    body.append(title);

    const note = document.createElement("p");
    note.className = "modal-note";
    note.textContent = copied
      ? "链接已复制到剪贴板，直接粘贴给朋友即可。"
      : "请手动复制下面的链接发给朋友。";
    body.append(note);

    const input = document.createElement("input");
    input.className = "share-link-input";
    input.type = "text";
    input.readOnly = true;
    input.value = link;
    input.addEventListener("focus", () => input.select());
    body.append(input);

    if (link.length > SHARE_LINK_WARN_LENGTH) {
      const warn = document.createElement("p");
      warn.className = "modal-note error";
      warn.textContent = "清单较大，链接很长，部分聊天软件可能会截断，建议精简后再分享。";
      body.append(warn);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "primary-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "复制链接";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link);
        copyBtn.textContent = "已复制";
      } catch (err) {
        input.focus();
        input.select();
        copyBtn.textContent = "请手动复制";
      }
    });

    const doneBtn = document.createElement("button");
    doneBtn.className = "secondary-btn";
    doneBtn.type = "button";
    doneBtn.textContent = "完成";
    doneBtn.addEventListener("click", closeModal);

    actions.append(copyBtn, doneBtn);
    body.append(actions);
  });
}

function getShareParam() {
  return new URLSearchParams(location.search).get("s");
}

function clearShareParam() {
  const url = new URL(location.href);
  url.searchParams.delete("s");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

function renderSharePreviewTree(items) {
  const ul = document.createElement("ul");
  ul.className = "share-preview-tree";
  items.forEach((item) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = item.title;
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) label.className = "share-preview-group";
    li.append(label);
    if (hasChildren) li.append(renderSharePreviewTree(item.children));
    ul.append(li);
  });
  return ul;
}

function openImportModal(snapshot) {
  // Pass clearShareParam as the close handler so dismissing via the × or the
  // backdrop also strips ?s= from the URL (a manual reload then won't re-prompt).
  // pendingShare stays in memory, so the login-and-save path is unaffected.
  openModal((body) => {
    const title = document.createElement("h3");
    title.textContent = "有人给你分享了一份清单";
    body.append(title);

    const meta = document.createElement("p");
    meta.className = "modal-note";
    meta.textContent = `「${snapshot.name}」· 共 ${countItems(snapshot.items)} 件`;
    body.append(meta);

    body.append(renderSharePreviewTree(snapshot.items));

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const saveBtn = document.createElement("button");
    saveBtn.className = "primary-btn";
    saveBtn.type = "button";
    saveBtn.textContent = state.session ? "保存到我的清单" : "登录并保存";
    saveBtn.addEventListener("click", async () => {
      if (state.session) {
        closeModal();
        state.pendingShare = null;
        await saveSharedList(snapshot);
        clearShareParam();
      } else {
        state.pendingShareAutoSave = true;
        closeModal();
        setAuthMessage("登录后会自动把这份分享清单保存到你的账号。");
        emailInput.focus();
      }
    });

    const dismissBtn = document.createElement("button");
    dismissBtn.className = "secondary-btn";
    dismissBtn.type = "button";
    dismissBtn.textContent = "暂不保存";
    dismissBtn.addEventListener("click", () => {
      state.pendingShare = null;
      state.pendingShareAutoSave = false;
      closeModal();
      clearShareParam();
    });

    actions.append(saveBtn, dismissBtn);
    body.append(actions);
  }, clearShareParam);
}

function openShareErrorModal() {
  openModal(
    (body) => {
      const title = document.createElement("h3");
      title.textContent = "链接无效";
      body.append(title);
      const note = document.createElement("p");
      note.className = "modal-note error";
      note.textContent = "这个分享链接已损坏或格式不对，无法打开。";
      body.append(note);
      const actions = document.createElement("div");
      actions.className = "modal-actions";
      const okBtn = document.createElement("button");
      okBtn.className = "primary-btn";
      okBtn.type = "button";
      okBtn.textContent = "知道了";
      okBtn.addEventListener("click", closeModal);
      actions.append(okBtn);
      body.append(actions);
    },
    clearShareParam
  );
}

async function saveSharedList(snapshot) {
  if (!state.session) return;
  setStatus("正在保存...");
  const firstSortOrder = state.templates.filter((template) => (template.list_type || "working") === "working").reduce(
    (minimum, template) => Math.min(minimum, Number(template.sort_order) || 0),
    0,
  ) - 1;
  const { data, error } = await supabaseClient
    .from("packing_lists")
    .insert({
      user_id: state.session.user.id,
      name: snapshot.name || "未命名清单",
      category: snapshot.category || "",
      notes: snapshot.notes || "",
      priority: snapshot.priority || "标准",
      items: cloneItems(snapshot.items),
      list_type: "working",
      sort_order: firstSortOrder,
    })
    .select()
    .single();
  if (error) return showCloudError(error);
  state.templates.unshift({ ...data, list_type: "working", items: normalizeItems(data.items) });
  setPackingView("working");
  setActiveTemplateId(data.id);
  setActiveView("packing");
  render();
  setStatus("已从分享保存");
}

async function createPackingList(source, options = {}) {
  const listType = options.listType || state.activePackingView;
  const base = source || {
    name: listType === "working" ? "新的出行清单" : "新的参考模板",
    category: "自定义",
    notes: "",
    priority: "标准",
    items: [],
  };

  setStatus("正在保存...");
  const firstSortOrder = state.templates.filter((template) => (template.list_type || "working") === listType).reduce(
    (minimum, template) => Math.min(minimum, Number(template.sort_order) || 0),
    0,
  ) - 1;
  const { data, error } = await supabaseClient
    .from("packing_lists")
    .insert({
      user_id: state.session.user.id,
      name: options.name || base.name,
      category: base.category,
      notes: base.notes || "",
      priority: base.priority || "标准",
      items: cloneItems(base.items),
      list_type: listType,
      sort_order: firstSortOrder,
    })
    .select()
    .single();

  if (error) return showCloudError(error);
  state.templates.unshift({ ...data, list_type: listType, items: normalizeItems(data.items) });
  if (options.switchView) setPackingView(listType);
  if (options.activate !== false) setActiveTemplateId(data.id);
  render();
  setStatus(listType === "template" ? "已存到参考一下" : "已云端同步");
}

async function persistTemplateOrder() {
  setStatus("正在保存顺序...");
  const rows = state.templates.map((template) => ({
    id: template.id,
    user_id: state.session.user.id,
    name: template.name,
    category: template.category,
    notes: template.notes || "",
    priority: template.priority || "标准",
    items: template.items,
    list_type: template.list_type || "working",
    sort_order: template.sort_order,
    created_at: template.created_at,
  }));
  const { error } = await supabaseClient.from("packing_lists").upsert(rows, { onConflict: "id" });
  if (error) return showCloudError(error);
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
    template.id === id ? { ...data, items: normalizeItems(data.items) } : template,
  );
  render();
  setStatus("已云端同步");
}

async function deleteTemplate(id) {
  setStatus("正在删除...");
  const { error } = await supabaseClient.from("packing_lists").delete().eq("id", id);
  if (error) return showCloudError(error);
  state.templates = state.templates.filter((template) => template.id !== id);
  setActiveTemplateId(getVisibleTemplates()[0]?.id || null);
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
  if (!email || !password) {
    setAuthMessage("请输入邮箱和密码。", true);
    return;
  }

  setAuthMessage("正在登录...");
  setStatus("正在登录...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus("登录失败");
    setAuthMessage(`登录失败：${error.message}`, true);
    return;
  }

  if (!data.session) {
    setStatus("登录失败");
    setAuthMessage("登录失败：Supabase 没有返回登录会话，请稍后再试。", true);
    return;
  }

  state.session = data.session;
  updateAuthUi();
  await loadCloudData();
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
  setAuthMessage("已退出，请重新登录。");
});

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.viewTab);
  });
});

packingViewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.openTemplateMenuId = null;
    state.renamingTemplateId = null;
    state.confirmingDeleteTemplateId = null;
    setPackingView(tab.dataset.packingView);
  });
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title || !state.session) return;
  todoInput.value = "";
  await addTodo(title);
});

// On iOS, the tap used to dismiss the keyboard can be replayed after the
// viewport grows again, accidentally toggling the todo now under that tap.
// Consume the first touch on the list while the add field is still focused.
todoList.addEventListener("touchstart", (event) => {
  if (document.activeElement !== todoInput) return;
  event.preventDefault();
  event.stopPropagation();
  todoInput.blur();
}, { capture: true, passive: false });

completedTodosToggle.addEventListener("click", () => {
  state.showCompletedTodos = !state.showCompletedTodos;
  state.editingTodoId = null;
  state.confirmingDeleteTodoId = null;
  renderTodos();
});

bucketForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = bucketInput.value.trim();
  if (!title || !state.session) return;
  const category = normalizeBucketCategory(bucketCategoryInput.value);
  const targetDate = bucketTargetDateInput.value;
  const saved = await addBucketItem(title, category, targetDate);
  if (saved) setBucketFormExpanded(false);
});

bucketAddBtn.addEventListener("click", () => setBucketFormExpanded(true));
bucketCancelAddBtn.addEventListener("click", () => setBucketFormExpanded(false));
setupCategoryCombobox(bucketCategoryInput, bucketCategorySuggestions);

newListBtn.addEventListener("click", () => {
  if (state.session) createPackingList(null, { listType: state.activePackingView });
});

packingItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const template = getActiveTemplate();
  const title = packingItemInput.value.trim();
  if (!template || !title) return;
  template.items.unshift({ id: crypto.randomUUID(), title, packed: false, children: [] });
  packingItemInput.value = "";
  state.addingPackingRoot = false;
  await updateTemplate(template.id, { items: template.items });
});

packingCancelRootBtn.addEventListener("click", () => {
  state.addingPackingRoot = false;
  packingItemInput.value = "";
  renderEditor();
});

init();
