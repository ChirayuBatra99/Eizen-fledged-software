import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'

import Users from './pages/Users'
import Order from './pages/Order'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Users />} />
        <Route path="/order/:customer_id/:name" element={<Order />} />
      </Routes>
    </Router>
     
    </>
  )
}

export default App
