import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Page from './main/page'
import ChatRoomPage from './chatroom/page'
import SummaryPage from './summary/page'
import './App.css'
function App() {

  return (
    <Router>
      <div className='container flex items-center justify-center max-w-[430px] max-h-[932px] mx-auto'>
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
