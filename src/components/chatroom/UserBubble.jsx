export default function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="bg-black font-bold text-white text-[24px] 
                      rounded-tl-[25px] rounded-bl-[25px] rounded-br-[25px]
                      py-[10px] px-[12px] gap-[10px] mb-[24px] mx-[23px] max-w-[280px]">
        {text}
      </div>
    </div>
  );
}