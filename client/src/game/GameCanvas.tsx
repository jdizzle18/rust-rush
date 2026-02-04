import { useEffect, useRef, useState } from 'react'
import './GameCanvas.css'

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
}

const GameCanvas = ({ isConnected, onPlaceTower, onStartWave }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [selectedTower, setSelectedTower] = useState<string>('basic')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    drawGrid(ctx)

    // Highlight hovered cell
    if (hoveredCell) {
      drawHighlight(ctx, hoveredCell)
    }

  }, [hoveredCell])

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
    if (hoveredCell && isConnected) {
      console.log(`Placing ${selectedTower} tower at (${hoveredCell.x}, ${hoveredCell.y})`)
      onPlaceTower(hoveredCell.x, hoveredCell.y, selectedTower)
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

  return (
    <div className="game-canvas-container">
      <div className="game-info">
        <div className="info-item">
          <span>💰 Gold:</span> <strong>100</strong>
        </div>
        <div className="info-item">
          <span>❤️ Health:</span> <strong>100</strong>
        </div>
        <div className="info-item">
          <span>🌊 Wave:</span> <strong>1</strong>
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
        </button>
        <button 
          className={`tower-btn ${selectedTower === 'sniper' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('sniper')}
        >
          🎯 Sniper Tower
        </button>
        <button 
          className={`tower-btn ${selectedTower === 'splash' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('splash')}
        >
          💥 Splash Tower
        </button>
        <button 
          className={`tower-btn ${selectedTower === 'slow' ? 'selected' : ''}`}
          onClick={() => setSelectedTower('slow')}
        >
          ❄️ Slow Tower
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
      </div>
    </div>
  )
}

export default GameCanvas