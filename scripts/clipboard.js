// 複製功能集中處理：優先使用 Clipboard API，失敗則改用 textarea fallback
export const copyToClipboard = async (text, onSuccess) => {
    if (!text) return;
    let success = false;
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            success = true;
        } catch (err) {
            console.warn("Clipboard write failed", err);
        }
    }
    if (!success) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
        } catch (err) {
            console.warn("Fallback copy failed", err);
        }
        document.body.removeChild(textarea);
    }
    if (success && typeof onSuccess === "function") {
        onSuccess();
    }
};
