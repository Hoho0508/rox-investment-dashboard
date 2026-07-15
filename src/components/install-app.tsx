"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [isIos] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod/i.test(navigator.userAgent),
  );
  const [isStandalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone ===
          true),
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setMessage(
      choice.outcome === "accepted" ? "安裝完成。" : "你可以稍後再安裝。",
    );
    setPromptEvent(null);
  }

  if (isStandalone) {
    return (
      <div className="notice success">這台手機已經使用 App 模式開啟。</div>
    );
  }

  return (
    <div className="install-actions">
      {promptEvent && (
        <button type="button" onClick={install}>
          安裝 Rox 投資 App
        </button>
      )}
      {isIos ? (
        <div className="notice">
          iPhone／iPad：點 Safari 下方的「分享」圖示，再選「加入主畫面」。
        </div>
      ) : (
        <div className="notice">
          Android：使用 Chrome
          選單的「安裝應用程式」；若上方有安裝按鈕，也可直接點擊。
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
