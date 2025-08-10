export default function RecommendQ({ text }) {
  return (
    <div className="mt-[12px] ml-[24px] mr-[24px]">
      <div className="flex justify-center items-center font-bold text-[22px] w-[176px] h-[103px] rounded-[10px] gap-[10px] bg-gray-200 p-[10px]"> {/* 수정 필요*/}
        {text}
      </div>
    </div>
  );
}