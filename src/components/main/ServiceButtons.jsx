import {Link} from 'react-router-dom';
import Mike from "../../assets/images/mic_fill.svg";

export default function ServiceButtons() {
  return (
    <div className="bg-gray100">
      <div className="flex gap-[4px] mb-[19px] ml-[20px]">
        <img src={Mike} alt="mike" ></img>
        <header className="font-big font-bold text-[28px]">
          무엇을 도와드릴까요?
        </header>
      </div>

      <div className="flex gap-[29px] mx-[30px]">
        {["무더위 쉼터", "동사무소", "등본 발급"].map((content,i)=>(
          <Link 
            to='./chatroompage' 
            key={i} 
            className="w-fit h-[40px] text-[22px] font-big font-bold text-gray500 
                      bg-gray200 p-[5px] rounded-lg cursor-pointer">
            {content}
          </Link>
        ))}
      </div>

      <header className='text-[24px] font-small text-gray400 font-light mt-[83px] text-center'>
        말하기를 누르고 말씀해주세요!
      </header>
    </div>
  )
}/*카드일까 버튼일까*/