import { refs } from "./domRefs.js";

// 深淺色切換初始化（含中文註解避免亂碼）
export function initThemeToggle() {
    const body = refs.body;
    const toggle = refs.themeToggle;
    if (!body || !toggle) return;

    const getInitialTheme = () => {
        // 優先讀取使用者偏好，其次依系統設定
        const stored = localStorage.getItem("theme");
        if (stored) return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };

    const applyTheme = (theme) => {
        // 將選擇寫回 DOM 與 localStorage
        body.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    };

    toggle.addEventListener("click", () => {
        const current = body.getAttribute("data-theme");
        const next = current === "light" ? "dark" : "light";
        applyTheme(next);
    });

    applyTheme(getInitialTheme());
}
