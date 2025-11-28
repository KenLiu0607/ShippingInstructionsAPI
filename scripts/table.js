import { refs } from "./domRefs.js";
import { deriveProps, getFieldData } from "./dataService.js";
import { copyToClipboard } from "./clipboard.js";
import { showTooltip, hideTooltip } from "./tooltip.js";

// 共用字串處理
const escapeHtml = (str = "") => (str ?? "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const formatEnum = (values) => {
    if (!Array.isArray(values) || values.length === 0) return '<span class="muted">-</span>';
    return `<span class="enum-list">${values.map((v) => `<span class="enum-item">${escapeHtml(String(v))}</span>`).join("")}</span>`;
};

// Tooltip 內容組製
export const buildDescriptionTooltip = (model = "", field = "", desc = "", example = "") => {
    const modelLine = model || field ? `<p class="tooltip-model">${escapeHtml(model || field)}</p>` : "";
    const safeDesc = desc && desc.trim() ? escapeHtml(desc).replace(/\n/g, "<br>") : "(no description)";
    const hasExample = example !== null && example !== undefined && String(example).trim() !== "";
    const safeExample = hasExample ? escapeHtml(String(example)).replace(/\n/g, "<br>") : "(no example)";
    return `
        <div>
            ${modelLine}
            <strong>Description</strong>
            <p>${safeDesc}</p>
            <strong>Example</strong>
            <p>${safeExample}</p>
        </div>
    `;
};

export const buildPropsTooltip = (propsStr = "") => {
    let props = [];
    try {
        props = JSON.parse(propsStr) || [];
    } catch {
        props = [];
    }
    if (!Array.isArray(props) || !props.length) return "";
    const items = props
        .map((p) => {
            const name = typeof p === "string" ? p : p?.name || "";
            const required = typeof p === "object" && !!p?.required;
            const star = required ? '<span style="color:#d32f2f;font-weight:700;margin-left:4px;">*</span>' : "";
            return `<li>${escapeHtml(String(name))}${star}</li>`;
        })
        .join("");
    return `
        <div>
            <strong>Props</strong>
            <ul>${items}</ul>
        </div>
    `;
};

// 演繹結果表格
export const renderRows = (rows) => {
    if (!refs.resultsBody || !refs.matchCount) return;
    const data = getFieldData();
    refs.resultsBody.innerHTML = rows
        .map((item) => {
            const requiredBadge = item.required ? '<span class="badge required">必填</span>' : '<span class="badge optional">選填</span>';
            const typeClass = item.type ? `field-type-${String(item.type).toLowerCase()}` : "muted";
            const derivedProps = deriveProps(item);
            const hasProps = Array.isArray(derivedProps) && derivedProps.length > 0;
            const propsWithRequired = hasProps
                ? derivedProps.map((propName) => ({
                      name: propName,
                      required: !!data.find((child) => child.field === propName && [item.model, item.field].filter(Boolean).includes(child.parent))?.required,
                  }))
                : [];
            const propsButton = hasProps
                ? `<button class="props-button" type="button" data-props='${escapeHtml(JSON.stringify(propsWithRequired))}'>${derivedProps.length}</button>`
                : '<span class="muted">-</span>';
            const fieldCell = `
                <div class="inline-copy">
                    <button class="field-tooltip" type="button" data-model="${escapeHtml(item.model || "")}" data-field="${escapeHtml(item.field || "")}" data-desc="${escapeHtml(
                item.description || ""
            )}" data-example="${escapeHtml(item.example || "")}">${escapeHtml(item.field || "")}</button>
                    <button class="copy-btn" type="button" data-copy="${escapeHtml(item.field || "")}" aria-label="Copy field" title="Copy field"><span aria-hidden="true">&#128203;</span></button>
                </div>`;
            return `
            <tr>
                <td class="nowrap">${fieldCell}</td>
                <td class="nowrap"><span class="field-value ${typeClass}">${escapeHtml(item.type || "")}</span></td>
                <td class="nowrap">${propsButton}</td>
                <td class="nowrap field-required">${requiredBadge}</td>
                <td>${formatEnum(item.enum)}</td>
            </tr>
        `;
        })
        .join("");
    refs.matchCount.textContent = `${rows.length} matches`;
};

export const renderPlaceholder = (message) => {
    if (!refs.resultsBody) return;
    refs.resultsBody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align: center; padding: 30px;">${escapeHtml(message)}</td></tr>`;
};

// 表格互動註冊（複製、tooltip 開關）
export const initTableInteractions = () => {
    refs.resultsBody?.addEventListener("click", async (event) => {
        const copyBtn = event.target.closest(".copy-btn");
        const fieldBtn = event.target.closest(".field-tooltip");
        const propsBtn = event.target.closest(".props-button");

        if (copyBtn) {
            const value = copyBtn.dataset.copy || "";
            await copyToClipboard(value, () => {
                const rect = copyBtn.getBoundingClientRect();
                showTooltip(`<strong>已複製</strong><p>${escapeHtml(value)}</p>`, rect.right, rect.top);
                setTimeout(hideTooltip, 1000);
            });
            event.stopPropagation();
            return;
        }

        if (fieldBtn) {
            const html = buildDescriptionTooltip(fieldBtn.dataset.model || "", fieldBtn.dataset.field || "", fieldBtn.dataset.desc || "", fieldBtn.dataset.example || "");
            showTooltip(html, event.clientX, event.clientY);
            event.stopPropagation();
            return;
        }

        if (propsBtn) {
            const html = buildPropsTooltip(propsBtn.dataset.props || "");
            if (html) showTooltip(html, event.clientX, event.clientY);
            else hideTooltip();
            event.stopPropagation();
        }
    });
};
