export default function UserBubble({ text, isTemp = false }) {
  return (
    <div className="flex justify-end">
      <div className="bg-black font-bold text-white text-[24px] 
                      rounded-tl-[25px] rounded-bl-[25px] rounded-br-[25px]
                      py-[10px] px-[12px] gap-[10px] mb-[27px] mx-[23px] max-w-[280px]">
        {isTemp ? '...' : text}
      </div>
    </div>
  );
}