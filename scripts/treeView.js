import { refs } from "./domRefs.js";
import { ensureData, getFieldData } from "./dataService.js";

// 樹狀導覽模組：集中處理樹資料、選取、側欄開闢（中文註解避免亂碼）
let treeSelection = null;

const setSidebarState = (open) => {
    if (!refs.layout) return;
    refs.layout.classList.toggle("collapsed", !open);
    refs.treeToggle?.setAttribute("aria-expanded", open ? "true" : "false");
};

const clearTreeSelection = () => {
    refs.treeContainer?.querySelectorAll(".tree-row.selected, .tree-row.selected-ancestor").forEach((el) => el.classList.remove("selected", "selected-ancestor"));
    treeSelection = null;
};

const highlightAncestors = (row) => {
    // 往上標記祖先，方便使用者辨識路徑
    let li = row?.parentElement;
    while (li && li !== refs.treeContainer) {
        const parentLi = li.parentElement?.closest("li");
        if (parentLi) parentLi.querySelector(":scope > .tree-row")?.classList.add("selected-ancestor");
        li = parentLi;
    }
};

const buildTreeData = (data = []) => {
    // 依 model/parent 組樹狀資料
    const defaultRoot = data[0]?.model?.split(".")[0] || "root";
    const map = new Map();
    const root = { name: defaultRoot, key: defaultRoot, children: [], sort: "1" };
    map.set(defaultRoot, root);

    const ensureNode = (key, name, sort) => {
        if (!key) return root;
        if (!map.has(key)) map.set(key, { name: name || key, key, children: [], sort: sort || "" });
        else if (sort && !map.get(key).sort) map.get(key).sort = sort;
        return map.get(key);
    };

    const relations = new Map();
    data.forEach((item) => {
        const key = item.model || "";
        if (!key) return;
        const parentKey = item.parent || defaultRoot;
        const name = item.field || key.split(".").pop() || key;
        relations.set(key, { name, parentKey, required: !!item.required, sort: item.sort || "" });

        if (!relations.has(parentKey)) {
            const parentName = parentKey.split(".").pop() || defaultRoot;
            relations.set(parentKey, {
                name: parentName,
                parentKey: parentKey === defaultRoot ? "" : parentKey.split(".").slice(0, -1).join(".") || defaultRoot,
                required: false,
                sort: "",
            });
        }
    });

    relations.forEach(({ name, required, sort }, key) => {
        const node = ensureNode(key, name, sort);
        if (required) node.required = true;
    });
    relations.forEach(({ parentKey }, key) => {
        const node = map.get(key);
        const parent = ensureNode(parentKey || defaultRoot, parentKey || defaultRoot);
        if (parent && node && parent !== node) parent.children.push(node);
    });

    const sortChildren = (node) => {
        node.children?.sort((a, b) => {
            const sa = a.sort || "";
            const sb = b.sort || "";
            if (sa && sb && sa !== sb) return sa.localeCompare(sb, undefined, { numeric: true });
            if (sa && !sb) return -1;
            if (!sa && sb) return 1;
            return a.name.localeCompare(b.name);
        });
        node.children?.forEach(sortChildren);
    };
    sortChildren(root);
    return root;
};

const createTreeNode = (node, depth = 0, parentKey = "root") => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const li = document.createElement("li");
    li.className = hasChildren ? `tree-item collapsible ${depth === 0 ? "expanded" : "collapsed"}` : "tree-item leaf";

    const row = document.createElement("div");
    row.className = "tree-row";
    row.style.setProperty("--depth", depth);
    row.dataset.key = node.key || "";
    row.dataset.parentKey = parentKey || "root";
    row.dataset.hasChildren = hasChildren ? "1" : "";
    row.dataset.required = node.required ? "1" : "";
    row.innerHTML = `
        <span class="tree-caret" aria-hidden="true"></span>
        <span class="tree-label">${node.name}${node.required ? '<span class="tree-required" aria-hidden="true">*</span>' : ""}</span>
    `;
    li.appendChild(row);

    if (hasChildren) {
        const ul = document.createElement("ul");
        ul.className = "tree-children";
        node.children.forEach((child) => ul.appendChild(createTreeNode(child, depth + 1, node.key)));
        li.appendChild(ul);
    }

    return li;
};

export const renderTreeSidebar = () => {
    if (!refs.treeContainer) return;
    const data = getFieldData();
    if (!Array.isArray(data) || !data.length) return;
    const tree = buildTreeData(data);
    refs.treeContainer.innerHTML = "";
    tree.children.forEach((child) => refs.treeContainer.appendChild(createTreeNode(child, 0)));
};

export const getTreeSelection = () => treeSelection;
export const clearTreeSelectionAndUI = () => clearTreeSelection();

const handleSelection = (row, onSelectionChange) => {
    clearTreeSelection();
    row.classList.add("selected");
    treeSelection = { field: "", model: row.dataset.key || "" };
    highlightAncestors(row);
    onSelectionChange?.();
};

export const initTree = async (onSelectionChange) => {
    setSidebarState(true);
    await ensureData();
    renderTreeSidebar();

    refs.treeContainer?.addEventListener("click", (event) => {
        const row = event.target.closest(".tree-row");
        if (!row) return;

        const item = row.parentElement;
        const caretClicked = !!event.target.closest(".tree-caret");
        if (item?.classList.contains("collapsible")) {
            item.classList.toggle("expanded");
            item.classList.toggle("collapsed");
            if (caretClicked) return;
        }

        handleSelection(row, onSelectionChange);
    });

    refs.treeToggle?.addEventListener("click", () => {
        const shouldOpen = refs.layout?.classList.contains("collapsed");
        setSidebarState(!!shouldOpen);
        if (shouldOpen) renderTreeSidebar();
    });
};
