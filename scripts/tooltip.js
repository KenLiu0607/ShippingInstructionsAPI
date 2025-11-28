import { refs } from "./domRefs.js";

// Tooltip 顯示/隱藏控制，集中處理避免分散邏輯
export const hideTooltip = () => {
    refs.tooltip?.classList.add("hidden");
};

export const showTooltip = (html, x, y) => {
    if (!refs.tooltip) return;
    refs.tooltip.innerHTML = html;
    refs.tooltip.classList.remove("hidden");

    const padding = 12;
    const { offsetWidth, offsetHeight } = refs.tooltip;
    let left = x + 12;
    let top = y + 12;
    const maxLeft = window.innerWidth - offsetWidth - padding;
    const maxTop = window.innerHeight - offsetHeight - padding;
    if (left > maxLeft) left = maxLeft;
    if (top > maxTop) top = maxTop;
    refs.tooltip.style.left = `${Math.max(padding, left)}px`;
    refs.tooltip.style.top = `${Math.max(padding, top)}px`;
};

export const initTooltipDismiss = () => {
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".field-tooltip") && !event.target.closest(".props-button") && !event.target.closest("#tooltip")) {
            hideTooltip();
        }
    });
    window.addEventListener("scroll", hideTooltip);
};
