import { useEffect, useRef, useState } from 'react'
import './GameCanvas.css'
import { Tower, TowerType, GameState } from '../types/game'

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
  gameState?: GameState
}

const GameCanvas = ({ isConnected, onPlaceTower, onStartWave, onClearTowers, gameState }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [selectedTower, setSelectedTower] = useState<TowerType>('basic')
  const [localTowers, setLocalTowers] = useState<Tower[]>([])

  // Update local towers from game state
  useEffect(() => {
    if (gameState?.towers) {
      setLocalTowers(gameState.towers)
    }
  }, [gameState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    drawGrid(ctx)

    // Draw towers
    localTowers.forEach(tower => {
      drawTower(ctx, tower)
    })

    // Highlight hovered cell
    if (hoveredCell && !isCellOccupied(hoveredCell)) {
      drawHighlight(ctx, hoveredCell)
      drawTowerPreview(ctx, hoveredCell, selectedTower)
    }

  }, [hoveredCell, localTowers, selectedTower])

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1

    // Draw vertical lines
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE, 0)
      ctx.lineTo(x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE)
      ctx.lineTo(GRID_WIDTH * CELL_SIZE, y * CELL_SIZE)
      ctx.stroke()
    }
  }

  const drawHighlight = (ctx: CanvasRenderingContext2D, pos: Position) => {
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)'
    ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
  }

  const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower) => {
    const x = tower.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = tower.position.y * CELL_SIZE + CELL_SIZE / 2

    // Draw range circle (semi-transparent)
    if (hoveredCell && hoveredCell.x === tower.position.x && hoveredCell.y === tower.position.y) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, tower.range * CELL_SIZE, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Tower colors based on type
    const colors = {
      basic: '#4CAF50',
      sniper: '#2196F3',
      splash: '#FF9800',
      slow: '#9C27B0'
    }

    // Draw tower base (circle)
    ctx.fillStyle = colors[tower.tower_type]
    ctx.beginPath()
    ctx.arc(x, y, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()

    // Draw tower top (smaller circle)
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.arc(x, y - 5, CELL_SIZE / 5, 0, Math.PI * 2)
    ctx.fill()

    // Draw level indicator
    if (tower.level > 1) {
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(tower.level.toString(), x, y + CELL_SIZE / 3 + 10)
    }
  }

  const drawTowerPreview = (ctx: CanvasRenderingContext2D, pos: Position, towerType: TowerType) => {
    const x = pos.x * CELL_SIZE + CELL_SIZE / 2
    const y = pos.y * CELL_SIZE + CELL_SIZE / 2

    // Tower colors based on type
    const colors = {
      basic: '#4CAF50',
      sniper: '#2196F3',
      splash: '#FF9800',
      slow: '#9C27B0'
    }

    // Draw preview (semi-transparent)
    ctx.globalAlpha = 0.5
    ctx.fillStyle = colors[towerType]
    ctx.beginPath()
    ctx.arc(x, y, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0

    // Draw range preview
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

      {/* Tower selection */}
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
        <button className="btn btn-secondary">Pause</button>
        <button 
          className="btn btn-danger"
          onClick={() => {
            setLocalTowers([])
            onClearTowers()
          }}
        >
          Clear Towers
        </button>
      </div>

      <div className="info-box">
        <p>
          <strong>Towers:</strong> {localTowers.length} placed
        </p>
        <p className="hint">
          💡 Hover over a tower to see its range
        </p>
      </div>
    </div>
  )
}

export default GameCanvas