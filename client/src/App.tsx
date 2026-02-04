import { useState } from 'react'
import './App.css'
import GameCanvas from './game/GameCanvas'

function App() {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className="App">
      <header className="App-header">
        <h1>🦀 Rust Rush</h1>
        <div className="status">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>
      
      <main>
        <GameCanvas />
      </main>

      <footer>
        <p>Built with Rust 🦀, Go 🐹, and React ⚛️</p>
      </footer>
    </div>
  )
}

export default App
