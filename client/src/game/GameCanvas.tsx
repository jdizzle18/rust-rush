import { useEffect, useRef, useState } from 'react'
import './GameCanvas.css'
import { Tower, TowerType, Enemy, GameState } from '../types/game'

const GRID_WIDTH = 20
const GRID_HEIGHT = 15
const CELL_SIZE = 40

interface Position {
  x: number
  y: number
}

interface GameCanvasProps {
  isConnected: boolean
  onPlaceTower: (x: number, y: number, towerType: string) => void
  onStartWave: () => void
  onClearTowers: () => void
  onSpawnEnemy?: () => void
  pathUpdateTrigger?: number
  gameState?: GameState
}

const GameCanvas = ({ 
  isConnected, 
  onPlaceTower, 
  onStartWave, 
  onClearTowers, 
  onSpawnEnemy,
  pathUpdateTrigger,
  gameState 
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [selectedTower, setSelectedTower] = useState<TowerType>('basic')
  const [localTowers, setLocalTowers] = useState<Tower[]>([])
  const [localEnemies, setLocalEnemies] = useState<Enemy[]>([])
  const [isPaused, setIsPaused] = useState(false)

  // Update local towers immediately
  useEffect(() => {
    if (gameState?.towers) {
      setLocalTowers(gameState.towers)
    }
  }, [gameState?.towers])

  // Sync enemies when count changes OR when paths are recalculated
  useEffect(() => {
    if (gameState?.enemies) {
      // If a new enemy was added, add it to local state
      if (gameState.enemies.length > localEnemies.length) {
        const newEnemies = gameState.enemies.filter(
          gEnemy => !localEnemies.some(lEnemy => lEnemy.id === gEnemy.id)
        )
        setLocalEnemies(prev => [...prev, ...newEnemies])
      }
      // If enemies were cleared
      else if (gameState.enemies.length === 0 && localEnemies.length > 0) {
        setLocalEnemies([])
      }
      // If paths were recalculated - merge new paths with current positions
      else if (pathUpdateTrigger !== undefined && gameState.enemies.length === localEnemies.length) {
        setLocalEnemies(prev => 
          prev.map(localEnemy => {
            const updatedEnemy = gameState.enemies.find(e => e.id === localEnemy.id)
            if (updatedEnemy && updatedEnemy.path) {
              // Find the closest point on the new path to the enemy's current position
              let closestIndex = 0
              let closestDistance = Infinity
              
              for (let i = 0; i < updatedEnemy.path.length; i++) {
                const pathPoint = updatedEnemy.path[i]
                const dx = pathPoint.x - localEnemy.position.x
                const dy = pathPoint.y - localEnemy.position.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                if (distance < closestDistance) {
                  closestDistance = distance
                  closestIndex = i
                }
              }
              
              console.log(`Enemy ${localEnemy.id} at (${localEnemy.position.x.toFixed(2)}, ${localEnemy.position.y.toFixed(2)}) - closest path index: ${closestIndex}`)
              
              // Keep the animated position, use new path starting from closest point
              return {
                ...localEnemy,
                path: updatedEnemy.path,
                path_index: closestIndex
              }
            }
            return localEnemy
          })
        )
      }
    }
  }, [gameState?.enemies?.length, pathUpdateTrigger])

  // Animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000
      lastTimeRef.current = currentTime

      if (deltaTime > 0 && deltaTime < 0.1 && !isPaused) {
        updateEnemies(deltaTime)
      }

      render()

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [localTowers, localEnemies, hoveredCell, selectedTower, gameState, isPaused])

  const updateEnemies = (deltaTime: number) => {
    setLocalEnemies(prevEnemies => {
      const updatedEnemies = prevEnemies.map(enemy => {
        if (!enemy.path || enemy.path.length === 0) {
          return enemy
        }

        const pathIndex = enemy.path_index ?? 0
        if (pathIndex >= enemy.path.length) {
          return enemy
        }

        const target = enemy.path[pathIndex]
        const targetX = target.x
        const targetY = target.y

        const dx = targetX - enemy.position.x
        const dy = targetY - enemy.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 0.1) {
          return {
            ...enemy,
            position: { x: targetX, y: targetY },
            path_index: pathIndex + 1
          }
        }

        const speed = enemy.speed
        const moveDistance = speed * deltaTime
        const ratio = Math.min(moveDistance / distance, 1)

        return {
          ...enemy,
          position: {
            x: enemy.position.x + dx * ratio,
            y: enemy.position.y + dy * ratio
          }
        }
      })

      // Remove enemies that reached the end
      return updatedEnemies.filter(enemy => {
        const pathIndex = enemy.path_index ?? 0
        return pathIndex < (enemy.path?.length ?? 0)
      })
    })
  }

  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawGrid(ctx)

    if (gameState?.spawn_point) {
      drawSpawnPoint(ctx, gameState.spawn_point)
    }
    if (gameState?.goal_point) {
      drawGoalPoint(ctx, gameState.goal_point)
    }

    localTowers.forEach(tower => {
      drawTower(ctx, tower)
    })

    localEnemies.forEach(enemy => {
      drawEnemy(ctx, enemy)
    })

    if (hoveredCell && !isCellOccupied(hoveredCell)) {
      drawHighlight(ctx, hoveredCell)
      drawTowerPreview(ctx, hoveredCell, selectedTower)
    }
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1

    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE, 0)
      ctx.lineTo(x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE)
      ctx.stroke()
    }

    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE)
      ctx.lineTo(GRID_WIDTH * CELL_SIZE, y * CELL_SIZE)
      ctx.stroke()
    }
  }

  const drawSpawnPoint = (ctx: CanvasRenderingContext2D, pos: Position) => {
    const x = pos.x * CELL_SIZE + CELL_SIZE / 2
    const y = pos.y * CELL_SIZE + CELL_SIZE / 2

    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)'
    ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)

    ctx.fillStyle = '#ff6464'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('S', x, y)
  }

  const drawGoalPoint = (ctx: CanvasRenderingContext2D, pos: Position) => {
    const x = pos.x * CELL_SIZE + CELL_SIZE / 2
    const y = pos.y * CELL_SIZE + CELL_SIZE / 2

    ctx.fillStyle = 'rgba(100, 255, 100, 0.3)'
    ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)

    ctx.fillStyle = '#64ff64'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('G', x, y)
  }

  const drawHighlight = (ctx: CanvasRenderingContext2D, pos: Position) => {
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)'
    ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
  }

  const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower) => {
    const x = tower.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = tower.position.y * CELL_SIZE + CELL_SIZE / 2

    if (hoveredCell && hoveredCell.x === tower.position.x && hoveredCell.y === tower.position.y) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, tower.range * CELL_SIZE, 0, Math.PI * 2)
      ctx.stroke()
    }

    const colors = {
      basic: '#4CAF50',
      sniper: '#2196F3',
      splash: '#FF9800',
      slow: '#9C27B0'
    }

    ctx.fillStyle = colors[tower.tower_type]
    ctx.beginPath()
    ctx.arc(x, y, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.arc(x, y - 5, CELL_SIZE / 5, 0, Math.PI * 2)
    ctx.fill()

    if (tower.level > 1) {
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(tower.level.toString(), x, y + CELL_SIZE / 3 + 10)
    }
  }

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    const x = enemy.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = enemy.position.y * CELL_SIZE + CELL_SIZE / 2

    const colors = {
      basic: '#ff4444',
      fast: '#ff9944',
      tank: '#994444',
      flying: '#44ff99',
      boss: '#ff0000'
    }

    const sizes = {
      basic: CELL_SIZE / 4,
      fast: CELL_SIZE / 5,
      tank: CELL_SIZE / 2.5,
      flying: CELL_SIZE / 4.5,
      boss: CELL_SIZE / 2
    }

    ctx.fillStyle = colors[enemy.enemy_type]
    ctx.beginPath()
    ctx.arc(x, y, sizes[enemy.enemy_type], 0, Math.PI * 2)
    ctx.fill()

    const barWidth = CELL_SIZE * 0.8
    const barHeight = 4
    const barX = x - barWidth / 2
    const barY = y - sizes[enemy.enemy_type] - 8

    ctx.fillStyle = '#ff0000'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    const healthRatio = enemy.health / enemy.max_health
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight)

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }

  const drawTowerPreview = (ctx: CanvasRenderingContext2D, pos: Position, towerType: TowerType) => {
    const x = pos.x * CELL_SIZE + CELL_SIZE / 2
    const y = pos.y * CELL_SIZE + CELL_SIZE / 2

    const colors = {
      basic: '#4CAF50',
      sniper: '#2196F3',
      splash: '#FF9800',
      slow: '#9C27B0'
    }

    ctx.globalAlpha = 0.5
    ctx.fillStyle = colors[towerType]
    ctx.beginPath()
    ctx.arc(x, y, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0

    const ranges = {
      basic: 3.0,
      sniper: 6.0,
      splash: 2.5,
      slow: 3.5
    }
    
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, ranges[towerType] * CELL_SIZE, 0, Math.PI * 2)
    ctx.stroke()
  }

  const isCellOccupied = (pos: Position): boolean => {
    return localTowers.some(t => t.position.x === pos.x && t.position.y === pos.y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      setHoveredCell({ x, y })
    } else {
      setHoveredCell(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredCell(null)
  }

  const handleClick = () => {
    if (hoveredCell && isConnected && !isCellOccupied(hoveredCell)) {
      console.log(`Placing ${selectedTower} tower at (${hoveredCell.x}, ${hoveredCell.y})`)
      onPlaceTower(hoveredCell.x, hoveredCell.y, selectedTower)
    } else if (isCellOccupied(hoveredCell!)) {
      console.log('Cell already occupied')
    } else if (!isConnected) {
      console.log('Not connected to server')
    }
  }

  const handleStartWave = () => {
    if (isConnected) {
      console.log('Starting wave')
      onStartWave()
    }
  }

  const handleSpawnEnemy = () => {
    if (isConnected && onSpawnEnemy) {
      console.log('Spawning test enemy')
      onSpawnEnemy()
    }
  }

  const getTowerCost = (towerType: TowerType): number => {
    const costs = {
      basic: 50,
      sniper: 100,
      splash: 75,
      slow: 60
    }
    return costs[towerType]
  }

  return (
    <div className="game-canvas-container">
      <div className="game-info">
        <div className="info-item">
          <span>💰 Gold:</span> <strong>{gameState?.gold ?? 100}</strong>
        </div>
        <div className="info-item">
          <span>❤️ Health:</span> <strong>{gameState?.health ?? 100}</strong>
        </div>
        <div className="info-item">
          <span>🌊 Wave:</span> <strong>{gameState?.wave ?? 1}</strong>
        </div>
        <div className="info-item">
          <span>🔌 Server:</span> 
          <strong className={isConnected ? 'connected' : 'disconnected'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </strong>
        </div>
      </div>

      <div className="tower-selection">
        <button 
          className={`tower-btn ${selectedTower === 'basic' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('basic')}
        >
          🗼 Basic Tower
          <span className="cost">${getTowerCost('basic')}</span>
        </button>
        <button 
          className={`tower-btn ${selectedTower === 'sniper' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('sniper')}
        >
          🎯 Sniper Tower
          <span className="cost">${getTowerCost('sniper')}</span>
        </button>
        <button 
          className={`tower-btn ${selectedTower === 'splash' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('splash')}
        >
          💥 Splash Tower
          <span className="cost">${getTowerCost('splash')}</span>
        </button>
        <button 
          className={`tower-btn ${selectedTower === 'slow' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('slow')}
        >
          ❄️ Slow Tower
          <span className="cost">${getTowerCost('slow')}</span>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_WIDTH * CELL_SIZE}
        height={GRID_HEIGHT * CELL_SIZE}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      <div className="controls">
        <button 
          className="btn btn-primary" 
          onClick={handleStartWave}
          disabled={!isConnected}
        >
          Start Wave
        </button>
        <button 
          className="btn btn-success"
          onClick={handleSpawnEnemy}
          disabled={!isConnected}
        >
          🦀 Spawn Test Enemy
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        <button 
          className="btn btn-danger"
          onClick={() => {
            setLocalTowers([])
            setLocalEnemies([])
            onClearTowers()
          }}
        >
          Clear All
        </button>
      </div>

      <div className="info-box">
        <p>
          <strong>Towers:</strong> {localTowers.length} placed | 
          <strong> Enemies:</strong> {localEnemies.length} active
          {isPaused && <strong style={{color: '#ff9800'}}> | ⏸️ PAUSED</strong>}
        </p>
        <p className="hint">
          💡 Place towers, then spawn enemies to watch them navigate around!
        </p>
      </div>
    </div>
  )
}

export default GameCanvas