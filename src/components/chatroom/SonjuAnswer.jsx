import { useState, useEffect } from "react";
export default function SonjuAnswer({ text }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!text) return;

    let index = 0;
    setDisplayText("");

    const interval = setInterval(() => {
        setDisplayText((prev) => prev + text[index]);
        index++;
        if (index >= text.length-1) clearInterval(interval)
        }, 20);

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