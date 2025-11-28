import { dataFileName } from "./domRefs.js";

// 資料存取與共用工具（集中管理 JSON 載入）
let fieldData = [];
let dataLoaded = false;
let loadingPromise = null;

const getDirectChildren = (item) => {
    // 以 parent 判斷直接子層，方便推導 props
    if (!item) return [];
    const key = item.model || "";
    const altKey = item.field || "";
    return fieldData.filter((child) => child.parent === key || (altKey && child.parent === altKey));
};

export const deriveProps = (item) => {
    // 先看是否有子層，若無則回傳既有 props
    const children = getDirectChildren(item);
    if (children.length) {
        return children.map((child) => child.field).filter(Boolean);
    }
    return Array.isArray(item?.props) ? item.props : [];
};

// 載入 JSON 並快取，避免重複 fetch
export async function ensureData() {
    if (dataLoaded) return fieldData;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const url = new URL(dataFileName, window.location.href);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fieldData = await res.json();
        dataLoaded = true;
        loadingPromise = null;
        return fieldData;
    })();

    return loadingPromise;
}

export const getFieldData = () => fieldData;

// 產生 Type 與 Field 選項（供下拉與 datalist 使用）
export const collectFilterOptions = () => {
    const typeSet = new Set();
    const fieldSet = new Set();

    fieldData.forEach((item) => {
        if (item.type && item.type !== "anyOf" && item.type !== "oneOf") typeSet.add(String(item.type));
        if (item.field) fieldSet.add(String(item.field));
    });

    return {
        types: Array.from(typeSet).sort(),
        fields: Array.from(fieldSet).sort(),
    };
};
