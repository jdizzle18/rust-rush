import { useEffect, useState, useRef } from 'react'
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
    spawn_point: { x: 0, y: 7 },
    goal_point: { x: 19, y: 7 },
  })
  
  // Track when paths are recalculated
  const pathUpdateCounter = useRef(0)

  useEffect(() => {
    if (status.isConnected) {
      sendMessage({
        type: 'join_room',
        room_id: 'game-1',
      })
    }
  }, [status.isConnected, sendMessage])

  useEffect(() => {
    if (lastMessage) {
      console.log('Processing message:', lastMessage.type)
      
      switch (lastMessage.type) {
        case 'game_state':
          console.log('Game state update:', lastMessage.payload)
          
          if (lastMessage.payload) {
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
              
              // Add tower and recalculate all enemy paths
              setGameState(prev => {
                const newTowers = [...prev.towers, newTower]
                const updatedEnemies = recalculateEnemyPaths(
                  prev.enemies,
                  newTowers,
                  prev.spawn_point || { x: 0, y: 7 },
                  prev.goal_point || { x: 19, y: 7 }
                )
                
                // Force path update by incrementing counter
                pathUpdateCounter.current += 1
                
                return {
                  ...prev,
                  towers: newTowers,
                  enemies: updatedEnemies
                }
              })
            } else if (lastMessage.payload.action === 'enemy_spawned' && lastMessage.payload.enemy) {
              const enemy = lastMessage.payload.enemy
              const newEnemy = {
                id: enemy.id || Date.now(),
                position: enemy.position || gameState.spawn_point || { x: 0, y: 7 },
                enemy_type: enemy.enemy_type || 'basic',
                health: enemy.health || 100,
                max_health: enemy.max_health || 100,
                speed: enemy.speed || 2.0,
                path: enemy.path || [
                  { x: 0, y: 7 },
                  { x: 19, y: 7 }
                ],
                path_index: 0
              }
              
              console.log('Adding enemy:', newEnemy)
              
              setGameState(prev => ({
                ...prev,
                enemies: [...prev.enemies, newEnemy]
              }))
            } else {
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
  }, [lastMessage, gameState.spawn_point])

  // Recalculate paths for all enemies when towers change
  const recalculateEnemyPaths = (enemies: any[], towers: any[], spawn: any, goal: any) => {
    return enemies.map(enemy => {
      // Calculate new path from current position to goal
      const currentPos = {
        x: Math.round(enemy.position.x),
        y: Math.round(enemy.position.y)
      }
      
      const newPath = generatePathAroundTowers(
        currentPos,
        goal,
        towers,
        []
      )
      
      // If no path found, keep enemy stuck with empty path
      if (!newPath) {
        console.log(`Enemy ${enemy.id} is now trapped!`)
        return {
          ...enemy,
          path: [currentPos], // Stay at current position
          path_index: 0
        }
      }
      
      console.log(`Recalculated path for enemy ${enemy.id} from (${currentPos.x}, ${currentPos.y}), new path length: ${newPath.length}`)
      
      return {
        ...enemy,
        path: newPath,
        path_index: 0
      }
    })
  }

  // Better pathfinding around towers using BFS
  const generatePathAroundTowers = (start: any, goal: any, towers: any[], enemies: any[]) => {
    if (towers.length === 0) {
      return [start, goal]
    }
    
    // Create grid to track blocked cells
    const blocked = new Set<string>()
    towers.forEach(t => {
      blocked.add(`${t.position.x},${t.position.y}`)
    })
    
    // Simple BFS pathfinding
    const queue: any[] = [{ pos: start, path: [start] }]
    const visited = new Set<string>()
    visited.add(`${start.x},${start.y}`)
    
    while (queue.length > 0) {
      const { pos, path } = queue.shift()!
      
      // Check if reached goal
      if (pos.x === goal.x && pos.y === goal.y) {
        return path
      }
      
      // Try all 4 directions
      const neighbors = [
        { x: pos.x + 1, y: pos.y },
        { x: pos.x - 1, y: pos.y },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x, y: pos.y - 1 }
      ]
      
      for (const next of neighbors) {
        const key = `${next.x},${next.y}`
        
        // Check bounds
        if (next.x < 0 || next.x >= 20 || next.y < 0 || next.y >= 15) {
          continue
        }
        
        // Check if blocked or visited
        if (blocked.has(key) || visited.has(key)) {
          continue
        }
        
        visited.add(key)
        queue.push({ pos: next, path: [...path, next] })
      }
    }
    
    // No path found - return null instead of a straight line
    console.warn('No path found! Enemy is trapped.')
    return null
  }

  const handleSpawnTestEnemy = () => {
    // Generate path avoiding towers
    const path = generatePathAroundTowers(
      gameState.spawn_point || { x: 0, y: 7 },
      gameState.goal_point || { x: 19, y: 7 },
      gameState.towers,
      gameState.enemies
    )
    
    // Don't spawn if no path exists
    if (!path) {
      console.warn('Cannot spawn enemy - path is blocked!')
      alert('Cannot spawn enemy! Path is completely blocked by towers.')
      return
    }
    
    // Stagger spawn position slightly if there are already enemies
    const spawnOffset = gameState.enemies.length * 0.3
    const spawnPos = {
      x: (gameState.spawn_point?.x || 0) - spawnOffset,
      y: gameState.spawn_point?.y || 7
    }
    
    const testEnemy = {
      id: Date.now(),
      position: { ...spawnPos },
      enemy_type: 'basic' as const,
      health: 100,
      max_health: 100,
      speed: 2.0,
      path: path,
      path_index: 0
    }
    
    console.log('Spawning test enemy with path:', testEnemy.path)
    
    setGameState(prev => ({
      ...prev,
      enemies: [...prev.enemies, testEnemy]
    }))
    
    // Also send to server (if implemented)
    sendMessage({
      type: 'spawn_enemy',
      payload: { enemy_type: 'basic' }
    })
  }

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
          pathUpdateTrigger={pathUpdateCounter.current}
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
            setGameState(prev => ({
              ...prev,
              towers: [],
              enemies: []
            }))
          }}
          onSpawnEnemy={handleSpawnTestEnemy}
        />
      </main>

      <footer>
        <p>Built with Rust 🦀, Go 🐹, and React ⚛️</p>
      </footer>
    </div>
  )
}

export default App