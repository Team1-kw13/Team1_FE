import { useEffect, useMemo, useState } from "react";

// URL 끝 인지 (닫는 괄호·따옴표·공백·문장부호·문자열 끝에서 멈춤)
const URL_REGEX =
  /https?:\/\/[^\s<>"'`’”\])}]+(?=[\s<>"'`’”\])}]|$)/gu;

function splitToLinkParts(str) {
  if (!str) return [];
  const parts = [];
  let last = 0;

  for (const m of str.matchAll(URL_REGEX)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (start > last) parts.push({ type: "text", value: str.slice(last, start) });
    parts.push({ type: "link", value: m[0] });
    last = end;
  }
  if (last < str.length) parts.push({ type: "text", value: str.slice(last) });
  return parts;
}

export default function SonjuAnswer({ text, onTypingComplete, isTyping = false }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (typeof text !== "string" || !text) {
      setDisplayText("");
      return;
    }

    // 백엔드에서 붙는 stray 'undefined' 토큰 방지
    const safe = text
    .replace(/(undefined)+$/u, "")
    .replace(/\*\*(.*?)\*\*/g, "$1");

    //만약 isTyping이 false라면 전체 텍스트 표시
    if (!isTyping) {
      setDisplayText(safe);
      onTypingComplete?.();
      return;
    }

    let index = 0;
    setDisplayText("");

    const interval = setInterval(() => {
      index ++;
      // slice 방식이라 글자 누락/undefined 누적 없음
      setDisplayText(safe.slice(0, index));
      if (index >= safe.length) {
        clearInterval(interval);
        onTypingComplete?.();
      }
    }, 20);

      return () => clearInterval(interval);
    }, [text, isTyping, onTypingComplete]);

  const parts = useMemo(() => splitToLinkParts(displayText), [displayText]);

  return (
    <div className="flex justify-center items-center mt-[12px] mx-[24px]">
      <div className="font-bold text-[24px] w-full break-words whitespace-pre-wrap overflow-x-hidden">
        {parts.map((p, idx) =>
          p.type === "link" ? (
            <a
              key={idx}
              href={p.value}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ wordBreak: "break-words" }} // 링크 자체도 강제 줄바꿈 허용
            >
              {p.value}
            </a>
          ) : (
            <span key={idx}>{p.value}</span>
          )
        )}
      </div>
    </div>
  );
}
