// DOM 參照集中管理，避免各模組重複查詢
export const refs = {
    body: document.body,
    layout: document.getElementById("layout"),
    treeContainer: document.getElementById("tree-container"),
    treeSidebar: document.getElementById("tree-sidebar"),
    treeToggle: document.getElementById("tree-toggle"),
    resultsBody: document.getElementById("results"),
    matchCount: document.getElementById("match-count"),
    filterSummary: document.getElementById("filter-summary"),
    tooltip: document.getElementById("tooltip"),
    filters: {
        field: document.getElementById("filter-field"),
        type: document.getElementById("filter-type"),
        required: document.getElementById("filter-required"),
        enum: document.getElementById("filter-enum"),
    },
    fieldList: document.getElementById("field-options"),
    searchButton: document.getElementById("search-button"),
    resetButton: document.getElementById("reset-button"),
    themeToggle: document.getElementById("dark-mode-toggle"),
};

// 資料檔名統一集中，方便後續替換
export const dataFileName = "CreateShippingInstructions_flat_tree.json";
