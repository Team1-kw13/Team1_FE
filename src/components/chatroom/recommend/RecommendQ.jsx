export default function RecommendQ({ text }) {
  return (
      <div className="mt-[32px] p-3 flex flex-col justify-center items-center font-bold text-[22px] text-gray500
                      w-[176px] h-[103px] rounded-[10px] gap-[10px] bg-gray200 cursor-pointer"
                      style={{wordBreak:'keep-all'}}> {/* 수정 필요*/}
        {text}
      </div>
  );
}