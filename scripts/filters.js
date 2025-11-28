import { refs } from "./domRefs.js";
import { ensureData, getFieldData, collectFilterOptions } from "./dataService.js";
import { renderRows, renderPlaceholder } from "./table.js";
import { getTreeSelection, clearTreeSelectionAndUI } from "./treeView.js";

// 篩選邏輯集中：含模糊比對與必填標籤文字
const fuzzyIncludes = (value, term) => (value ?? "").toString().toLowerCase().includes(term.toLowerCase());
const requiredLabel = (val) => (val ? "true required yes 必填 需要" : "false optional no 不必 選填");

const collectTerms = () => {
    const tree = getTreeSelection();
    return {
        field: refs.filters.field.value.trim(),
        type: refs.filters.type.value,
        required: refs.filters.required.value,
        enum: refs.filters.enum.value.trim(),
        treeModel: tree?.model || "",
        treeFieldExact: tree?.field || "",
    };
};

const filterRows = (terms, data) =>
    data.filter((item) => {
        const itemEnum = (item.enum || []).join(", ");
        return (
            (!terms.treeFieldExact || item.field === terms.treeFieldExact) &&
            (!terms.treeModel || item.model === terms.treeModel) &&
            (!terms.field || fuzzyIncludes(item.field, terms.field)) &&
            (!terms.type || fuzzyIncludes(item.type, terms.type)) &&
            (!terms.required || fuzzyIncludes(requiredLabel(item.required), terms.required)) &&
            (!terms.enum || fuzzyIncludes(itemEnum, terms.enum))
        );
    });

const formatSummary = (terms) => {
    const labels = { field: "Field", type: "Type", required: "Required", enum: "Enum" };
    const chips = [];
    if (terms.treeModel) chips.push(`<span class="summary-chip"><strong>Model:</strong> ${terms.treeModel}</span>`);
    Object.entries(labels).forEach(([key, label]) => {
        const val = terms[key];
        if (val) chips.push(`<span class="summary-chip"><strong>${label}:</strong> ${val}</span>`);
    });
    return chips.length ? `Current filters: ${chips.join(" ")}` : "Current filters: none.";
};

const populateFilterOptions = () => {
    const { types, fields } = collectFilterOptions();
    if (refs.filters.type) {
        refs.filters.type.innerHTML = ['<option value="">不限類型</option>', ...types.map((t) => `<option value="${t}">${t}</option>`)].join("");
    }
    if (refs.fieldList) refs.fieldList.innerHTML = fields.map((f) => `<option value="${f}"></option>`).join("");
};

const setStatus = (message, count = "No query yet", summary = "Current filters: none.") => {
    renderPlaceholder(message);
    refs.matchCount && (refs.matchCount.textContent = count);
    refs.filterSummary && (refs.filterSummary.innerHTML = summary);
};

export const applyFilters = async () => {
    await ensureData();
    const data = getFieldData();
    if (!data.length) return;

    const terms = collectTerms();
    if (!Object.values(terms).some((v) => v)) {
        setStatus("Enter filters to search (no results shown).");
        return;
    }

    const rows = filterRows(terms, data);
    const summary = formatSummary(terms);
    refs.filterSummary && (refs.filterSummary.innerHTML = summary);
    if (!rows.length) {
        setStatus("No data found. Try adjusting keywords.", "0 matches", summary);
        return;
    }
    renderRows(rows);
};

const resetFilters = () => {
    Object.values(refs.filters).forEach((input) => (input.value = ""));
    clearTreeSelectionAndUI();
    setStatus("Cleared. Please enter keywords to search.");
};

const wireInputs = () => {
    Object.values(refs.filters).forEach((input) =>
        input?.addEventListener("input", () => {
            if (input === refs.filters.field) clearTreeSelectionAndUI(); // 直接輸入 field 時清掉樹狀選取
            applyFilters();
        })
    );
    refs.searchButton?.addEventListener("click", applyFilters);
    refs.resetButton?.addEventListener("click", resetFilters);
};

export const initFilters = async () => {
    setStatus("Enter keywords to search (data loads on first search).");
    wireInputs();

    // 預先載入資料以填充下拉/樹狀選單
    try {
        await ensureData();
        populateFilterOptions();
    } catch (err) {
        console.error("資料載入失敗", err);
        renderPlaceholder("無法載入資料，請檢查檔案與網路。");
    }
};
