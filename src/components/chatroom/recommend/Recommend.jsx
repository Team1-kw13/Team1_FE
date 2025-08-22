import RecommendQ from "./RecommendQ";

export default function Recommend({ text, onClick, type = "default" }) {
  const handleClick = () => {
    if (onClick) {
      onClick(text);
    }
  };

  // type이 "question"이면 RecommendQ 컴포넌트 사용
  if (type === "question") {
    return <RecommendQ text={text} onClick={handleClick} />;
  }

  // 기본 Recommend 스타일
  return (
    <div className="mt-[8px] px-6 first:mt-[16px]">
      <button
        onClick={handleClick}
        className="p-3 text-left font-bold text-[20px] text-gray600 bg-gray200 rounded-[10px] cursor-pointer hover:bg-gray300 w-full transition-colors duration-200"
      >
        {text}
      </button>
    </div>
  );
}