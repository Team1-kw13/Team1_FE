import RecommendQ from "./RecommendQ";

export default function Recommend({text}) {
  return (
    <div className="mt-[40px] ml-[24px] mr-[24px]">
      <div className="font-bold text-[22px]">다음 대화는 어떠세요? </div>
      <div className="flex flex-row justify-between">
        <RecommendQ text={text} />
        <RecommendQ text={text} />
      </div>
    </div>
  );
}
