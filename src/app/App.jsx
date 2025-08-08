import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Page from './main/page'
import ChatRoomPage from './chatroom/page'
function App() {

  return (
    <Router>
      <div className='container min-w-[430px] mx-auto'>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/chatroompage" element={<ChatRoomPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
