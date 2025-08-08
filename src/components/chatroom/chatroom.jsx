export default function ChatRoom() {
  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full h-[calc(100%-90px)] absolute top-[90px] items-center pt-[25px]"
      style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      <div className="font-small font-light text-[13px] text-gray-400">AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.</div>
    </div>
  );
}