import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Page from './main/page'
import ChatRoomPage from './chatroom/page'
import SummaryPage from './summary/page'
// import './App.css' //노트북 전체 화면 시 주석 제거, 개발자 모드 시 주석 처리
function App() {

  return (
    <Router>
      <div className='container max-w-[430px] max-h-[932px]'>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/chatroompage" element={<ChatRoomPage />} />
          <Route path="/summary" element={<SummaryPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
