"use client";
import { useState, type FormEvent } from "react";

export function JournalForm() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: form.get("symbol"),
        action: form.get("action"),
        reason: form.get("reason"),
        biggestRisk: form.get("biggestRisk"),
        invalidation: form.get("invalidation"),
        fomo: form.get("fomo") === "on",
        singleDayMove: form.get("singleDayMove") === "on",
        questionsCompleted: form.get("questionsCompleted") === "on",
      }),
    });
    setMessage(
      response.ok
        ? "已儲存。未完成關鍵問題時會自動標記為觀察筆記。"
        : "欄位不完整，請檢查內容。",
    );
  }
  return (
    <form className="card" onSubmit={submit}>
      <div className="grid grid-2">
        <label>
          股票代號
          <br />
          <input name="symbol" required maxLength={12} />
        </label>
        <label>
          行動
          <br />
          <select name="action">
            <option>觀察</option>
            <option>買進</option>
            <option>賣出</option>
          </select>
        </label>
      </div>
      <label>
        交易或觀察理由
        <br />
        <textarea name="reason" required minLength={10} />
      </label>
      <label>
        最大風險
        <br />
        <textarea name="biggestRisk" required minLength={5} />
      </label>
      <label>
        判斷失效條件
        <br />
        <textarea name="invalidation" required minLength={5} />
      </label>
      <p>
        <label>
          <input type="checkbox" name="fomo" /> 是否因 FOMO
        </label>
        　
        <label>
          <input type="checkbox" name="singleDayMove" /> 是否因單日漲跌
        </label>
      </p>
      <p>
        <label>
          <input type="checkbox" name="questionsCompleted" />{" "}
          已完成八項交易計畫問題
        </label>
      </p>
      <button type="submit">儲存紀錄</button>
      {message && <p>{message}</p>}
    </form>
  );
}
