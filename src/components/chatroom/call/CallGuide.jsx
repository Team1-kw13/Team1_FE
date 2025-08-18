export default function Call({ communityCenter, number = "02-1234-5678" }) {
    /*기본 전화 연결 팝업*/
    const handleCall=()=>{
        window.location.href=`tel:${number}`;
    }

    return (
        <div className="w-full h-full flex flex-col px-6">
            <div className="text-[24px] text-[#222222] font-bold">{communityCenter} 전화번호는<br/>{number} 입니다.<br/>전화 연결을 원하시면 아래 버튼을 눌러<br/>주세요.</div>
            <div className="flex flex-col items-center">
                <button
                    onClick={handleCall}
                    className="font-bold text-[22px] w-[176px] h-[66px] bg-gray200 rounded-[10px] gap-[10px] mt-[22px] cursor-pointer">
                    전화하기
                </button>
            </div>
        </div>
    );
}
