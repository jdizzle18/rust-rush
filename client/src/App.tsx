import { useEffect, useState } from 'react'
import './App.css'
import GameCanvas from './game/GameCanvas'
import { useWebSocket } from './hooks/useWebSocket'
import { GameState } from './types/game'

// WebSocket URL - connects to Go server
const WS_URL = 'ws://localhost:8080/ws'

function App() {
  const { status, lastMessage, sendMessage } = useWebSocket(WS_URL)
  const [gameState, setGameState] = useState<GameState>({
    towers: [],
    enemies: [],
    gold: 100,
    health: 100,
    wave: 1,
    game_time: 0,
  })

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
          
          // Update game state from server
          if (lastMessage.payload) {
            // Handle tower_placed action
            if (lastMessage.payload.action === 'tower_placed' && lastMessage.payload.tower) {
              const tower = lastMessage.payload.tower
              const newTower = {
                id: Date.now(),
                position: { x: tower.x, y: tower.y },
                tower_type: tower.tower_type,
                level: 1,
                range: tower.tower_type === 'sniper' ? 6.0 : 
                       tower.tower_type === 'splash' ? 2.5 : 
                       tower.tower_type === 'slow' ? 3.5 : 3.0
              }
              
              setGameState(prev => ({
                ...prev,
                towers: [...prev.towers, newTower]
              }))
            } else {
              // Handle full game state updates
              setGameState(prev => ({
                ...prev,
                ...lastMessage.payload
              }))
            }
          }
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
          gameState={gameState}
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
          onClearTowers={() => {
            // Clear local game state
            setGameState(prev => ({
              ...prev,
              towers: []
            }))
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