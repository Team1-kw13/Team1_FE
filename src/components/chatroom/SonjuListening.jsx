import SunImg from "../../assets/images/sun.svg"

export default function SonjuListening() {
  return (
    <div className="flex flex-col items-center justify-center w-[430px]
                    bg-[linear-gradient(to_bottom,#FFF9D6CC,_#FAFAF7)]
                    rounded-tl-[30px] rounded-tr-[30px]
                    fixed bottom-[135px]">
      <img src={SunImg} alt="손주가 듣고 있어요" className="w-[91px] h-[91px]" />
      <div className="font-bold text-[20px]">손주가 잘 듣고 있어요!</div>
      <div className="font-small font-light text-[24px] text-gray400">다시 말하기는 한번 더 눌러주세요!</div>
    </div>
  );
}