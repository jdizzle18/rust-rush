import { useEffect } from 'react'
import './App.css'
import GameCanvas from './game/GameCanvas'
import { useWebSocket } from './hooks/useWebSocket'

// WebSocket URL - connects to Go server
const WS_URL = 'ws://localhost:8080/ws'

function App() {
  const { status, lastMessage, sendMessage } = useWebSocket(WS_URL)

  useEffect(() => {
    if (status.isConnected) {
      // Join a game room when connected
      sendMessage({
        type: 'join_room',
        room_id: 'game-1',
      })
    }
  }, [status.isConnected, sendMessage])

  useEffect(() => {
    if (lastMessage) {
      console.log('Processing message:', lastMessage.type)
      
      // Handle different message types
      switch (lastMessage.type) {
        case 'game_state':
          console.log('Game state update:', lastMessage.payload)
          break
        case 'join_room':
          console.log('Joined room successfully')
          break
        default:
          console.log('Unknown message type:', lastMessage.type)
      }
    }
  }, [lastMessage])

  return (
    <div className="App">
      <header className="App-header">
        <h1>🦀 Rust Rush</h1>
        <div className="status">
          Status: {status.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          {status.error && <span className="error"> ({status.error})</span>}
        </div>
      </header>
      
      <main>
        <GameCanvas 
          isConnected={status.isConnected}
          onPlaceTower={(x, y, towerType) => {
            sendMessage({
              type: 'place_tower',
              payload: { x, y, tower_type: towerType }
            })
          }}
          onStartWave={() => {
            sendMessage({
              type: 'start_wave'
            })
          }}
        />
      </main>

      <footer>
        <p>Built with Rust 🦀, Go 🐹, and React ⚛️</p>
      </footer>
    </div>
  )
}

export default App