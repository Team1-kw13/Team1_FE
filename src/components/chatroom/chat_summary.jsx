export default function ChatSummary() {
  return (
    <div className="flex flex-col items-center gap-[27px]">
      <div className="font-bold text-[20px] text-[#000000]">지금까지 주고받은 민원 내용을 정리해드릴까요?</div>
      <button className="w-[176px] h-[66px] bg-gray200 font-bold text-[22px] px-[46px] py-[16.5px] rounded-[10px] gap-[10px]">민원 요약</button>
    </div>
  );
}
