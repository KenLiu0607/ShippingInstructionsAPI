// 主入口：組合各模組，維持職責分離並加上中文註解
import { initThemeToggle } from "./theme.js";
import { initFilters, applyFilters } from "./filters.js";
import { initTree } from "./treeView.js";
import { initTableInteractions } from "./table.js";
import { initTooltipDismiss } from "./tooltip.js";

const bootstrap = async () => {
    initThemeToggle(); // 深淺色切換
    initTableInteractions(); // 表格互動（複製、tooltip）
    initTooltipDismiss(); // 全域 tooltip 關閉行為

    // 初始化篩選與樹狀結構，讓互動邏輯分層
    await initFilters();
    await initTree(applyFilters);
};

bootstrap();
