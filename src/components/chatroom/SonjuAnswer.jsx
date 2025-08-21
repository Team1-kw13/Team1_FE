import { useState, useEffect } from "react";
export default function SonjuAnswer({ text }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!text) return;

    let index = 0;
    setDisplayText("");

    const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText((prev) => prev + text[index]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 20); // 두 번째 글자 안 잘리는지 확인 필요

      return () => clearInterval(interval);
    }, [text]);

  return (
    <div className="flex justify-center items-center mt-[12px] mx-[24px]">
      <div className="font-bold text-[24px]">
        {displayText}
      </div>
    </div>
  );
}