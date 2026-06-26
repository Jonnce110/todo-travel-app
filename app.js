const SUPABASE_URL = "https://buwqmzdqxcyudkwmxzrd.supabase.co";
const APP_URL = "https://jonnce110.github.io/todo-travel-app/";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1d3FtemRxeGN5dWRrd214enJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjA4ODIsImV4cCI6MjA5Nzc5Njg4Mn0.AWvrQyxp0eH7Wmj2UZwQapz4gCGRGKCFMWlmBiNTqNk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  activeTemplateId: null,
  openTemplateMenuId: null,
  addingChildForItemId: null,
  editingTodoId: null,
  editingPackingItemId: null,
  renamingTemplateId: null,
  confirmingDeleteTemplateId: null,
  confirmingDeleteTodoId: null,
  confirmingDeletePackingItemId: null,
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
const saveStatus = document.querySelector("#saveStatus");

const newListBtn = document.querySelector("#newListBtn");
const templateList = document.querySelector("#templateList");
const activeTemplateName = document.querySelector("#activeTemplateName");
const packingItemForm = document.querySelector("#packingItemForm");
const packingItemInput = document.querySelector("#packingItemInput");
const packingItems = document.querySelector("#packingItems");
const packingEmpty = document.querySelector("#packingEmpty");
const packingCounter = document.querySelector("#packingCounter");

const modalOverlay = document.querySelector("#modalOverlay");
const modalBody = document.querySelector("#modalBody");
const modalClose = document.querySelector("#modalClose");
let onModalClose = null;

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

function setActiveView(view) {
  if (!state.session && view !== "packing") return;

  viewTabs.forEach((tab) => {
    const active = tab.dataset.viewTab === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  viewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== view;
  });
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
      if (state.pendingShare && state.pendingShareAutoSave) {
        const snapshot = state.pendingShare;
        state.pendingShare = null;
        state.pendingShareAutoSave = false;
        await saveSharedList(snapshot);
        clearShareParam();
      }
    } else {
      loadGuestData();
    }
  });

  const shareParam = getShareParam();
  if (shareParam) {
    const snapshot = ShareCodec.decodeSharedList(shareParam);
    if (snapshot) state.pendingShare = snapshot;
    else state.shareError = true;
  }

  if (state.session) {
    setActiveView("todo");
    await loadCloudData();
  } else {
    loadGuestData();
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
  workspace.classList.toggle("locked", false);
  workspace.classList.toggle("readonly", !signedIn);
  viewTabsNav.classList.toggle("single-tab", !signedIn);
  signOutBtn.hidden = !signedIn;
  newListBtn.hidden = !signedIn;
  packingItemForm.hidden = !signedIn;
  viewTabs.forEach((tab) => {
    tab.hidden = !signedIn && tab.dataset.viewTab !== "packing";
  });
  if (signedIn) {
    setStatus(`已登录：${state.session.user.email}`);
    setAuthMessage("");
  } else {
    setStatus("访客预览：基础GO");
  }
}

function loadGuestData() {
  state.todos = [];
  state.templates = defaultTemplates.map((template, index) => ({
    ...template,
    id: `guest-template-${index}`,
    items: cloneItems(template.items),
  }));
  state.activeTemplateId = state.templates[0]?.id || null;
  state.openTemplateMenuId = null;
  state.addingChildForItemId = null;
  state.editingPackingItemId = null;
  state.renamingTemplateId = null;
  state.confirmingDeleteTemplateId = null;
  state.confirmingDeletePackingItemId = null;
  setActiveView("packing");
  render();
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
    items: normalizeItems(template.items),
  }));
  state.activeTemplateId = state.activeTemplateId || state.templates[0]?.id || null;
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
      defaultTemplates.map((template) => ({
        ...template,
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
}

function renderTodos() {
  todoList.innerHTML = "";
  state.todos.forEach((todo) => {
    const node = document.querySelector("#todoItemTemplate").content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", todo.done);
    node.querySelector("input").checked = todo.done;
    const titleSlot = node.querySelector(".item-title");
    if (state.editingTodoId === todo.id) {
      titleSlot.replaceChildren(createInlineEditForm(todo.title, async (value) => {
        state.editingTodoId = null;
        await updateTodo(todo.id, { title: value });
      }, () => {
        state.editingTodoId = null;
        render();
      }));
    } else {
      titleSlot.textContent = todo.title;
    }
    node.querySelector("input").addEventListener("change", async (event) => {
      await updateTodo(todo.id, { done: event.target.checked });
    });
    node.querySelector(".edit-action").addEventListener("click", () => {
      state.editingTodoId = todo.id;
      render();
    });
    node.querySelector(".delete-action").addEventListener("click", () => {
      state.confirmingDeleteTodoId = todo.id;
      render();
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
  const activeCount = state.todos.filter((todo) => !todo.done).length;
  todoCounter.textContent = `${activeCount}/${state.todos.length} 项`;
  todoEmpty.classList.toggle("visible", state.todos.length === 0);
}

function renderTemplates() {
  templateList.innerHTML = "";

  state.templates.forEach((template) => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.classList.toggle("active", template.id === state.activeTemplateId);
    card.classList.toggle("menu-open", template.id === state.openTemplateMenuId);

    const tab = document.createElement("button");
    tab.className = "template-tab";
    tab.type = "button";
    tab.innerHTML = `<strong></strong><span></span>`;
    tab.querySelector("strong").textContent = template.name;
    tab.querySelector("span").textContent = `${countItems(template.items)} 件`;
    tab.addEventListener("click", () => {
      state.activeTemplateId = template.id;
      state.openTemplateMenuId = null;
      render();
    });

    const menuButton = document.createElement("button");
    menuButton.className = "template-menu-button";
    menuButton.type = "button";
    menuButton.title = "清单操作";
    menuButton.textContent = "⋯";
    menuButton.hidden = !state.session;
    menuButton.addEventListener("click", () => {
      state.activeTemplateId = template.id;
      state.openTemplateMenuId = state.openTemplateMenuId === template.id ? null : template.id;
      render();
    });

    const menu = document.createElement("div");
    menu.className = "template-menu";

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "重命名";
    renameButton.addEventListener("click", () => {
      state.renamingTemplateId = template.id;
      state.confirmingDeleteTemplateId = null;
      render();
    });

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "复制为新清单";
    copyButton.addEventListener("click", () => {
      state.openTemplateMenuId = null;
      if (state.session) createTemplate(template);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-menu-action";
    deleteButton.textContent = "删除";
    deleteButton.disabled = state.templates.length <= 1;
    deleteButton.addEventListener("click", () => {
      if (state.templates.length <= 1) return;
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
    menu.append(renameButton, copyButton, shareButton, deleteButton);
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
      }));
    }
    card.append(tab, menuButton, menu);
    templateList.append(card);
  });

}

function renderEditor() {
  const template = getActiveTemplate();
  if (!template) {
    activeTemplateName.textContent = "未选择清单";
    packingItems.innerHTML = "";
    packingCounter.textContent = "0 件";
    packingEmpty.classList.add("visible");
    return;
  }

  activeTemplateName.textContent = template.name;

  packingItems.innerHTML = "";
  template.items.forEach((item) => {
    packingItems.append(renderPackingItem(template, item, 0, template.items));
  });

  const packedCount = countPackedItems(template.items);
  const totalCount = countItems(template.items);
  packingCounter.textContent = `${packedCount}/${totalCount} 件`;
  packingEmpty.classList.toggle("visible", totalCount === 0);
}

function renderPackingItem(template, item, depth, siblingItems) {
  const wrapper = document.createElement("li");
  wrapper.className = "tree-item";
  wrapper.classList.toggle("packing-group", depth === 0);
  wrapper.classList.toggle("packing-card", depth > 0);
  wrapper.style.setProperty("--depth", depth);

  const row = document.querySelector("#packingItemTemplate").content.firstElementChild.cloneNode(true);
  row.classList.toggle("packing-group-row", depth === 0);
  row.classList.toggle("packing-card-item", depth > 0);
  row.classList.toggle("done", item.packed);
  row.querySelector("input").checked = item.packed;
  row.querySelector("input").disabled = !state.session;
  row.querySelector(".item-title").textContent = item.title;

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
    meta.textContent = `${packedChildCount}/${childCount}`;
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
    if (!state.session) return;
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

function createDeleteConfirmRow(onConfirm, onCancel) {
  const row = document.createElement("div");
  row.className = "delete-confirm-row";

  const confirmButton = document.createElement("button");
  confirmButton.className = "danger-menu-action";
  confirmButton.type = "button";
  confirmButton.textContent = "删除";
  confirmButton.addEventListener("click", onConfirm);

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "取消";
  cancelButton.addEventListener("click", onCancel);

  row.append(confirmButton, cancelButton);
  return row;
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
  const { data, error } = await supabaseClient
    .from("packing_lists")
    .insert({
      user_id: state.session.user.id,
      name: snapshot.name || "未命名清单",
      category: snapshot.category || "",
      notes: snapshot.notes || "",
      priority: snapshot.priority || "标准",
      items: cloneItems(snapshot.items),
    })
    .select()
    .single();
  if (error) return showCloudError(error);
  state.templates.unshift({ ...data, items: normalizeItems(data.items) });
  state.activeTemplateId = data.id;
  setActiveView("packing");
  render();
  setStatus("已从分享保存");
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
      items: cloneItems(base.items),
    })
    .select()
    .single();

  if (error) return showCloudError(error);
  state.templates.unshift({ ...data, items: normalizeItems(data.items) });
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

packingItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const template = getActiveTemplate();
  const title = packingItemInput.value.trim();
  if (!template || !title) return;
  template.items.unshift({ id: crypto.randomUUID(), title, packed: false, children: [] });
  packingItemInput.value = "";
  await updateTemplate(template.id, { items: template.items });
});

init();