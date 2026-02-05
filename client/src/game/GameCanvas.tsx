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
  gameState?: GameState
}

const GameCanvas = ({ 
  isConnected, 
  onPlaceTower, 
  onStartWave, 
  onClearTowers, 
  onSpawnEnemy,
  gameState 
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [selectedTower, setSelectedTower] = useState<TowerType>('basic')

  // Use server state directly - no local state!
  const towers = gameState?.towers || []
  const enemies = gameState?.enemies || []
  const projectiles = gameState?.projectiles || []
  const muzzleFlashes = gameState?.muzzle_flashes || []
  const explosions = gameState?.explosions || []

  // Animation loop - just render, don't update state
  useEffect(() => {
    const animate = () => {
      render()
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [towers, enemies, projectiles, muzzleFlashes, explosions, hoveredCell, selectedTower, gameState])

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

    // Draw tower ranges for active towers
    towers.forEach(tower => {
      if (tower.current_target) {
        drawTowerRange(ctx, tower)
      }
    })

    // Draw projectiles
    projectiles.forEach(projectile => {
      drawProjectile(ctx, projectile)
    })

    // Draw towers
    towers.forEach(tower => {
      drawTower(ctx, tower)
    })

    // Draw enemies
    enemies.forEach(enemy => {
      drawEnemy(ctx, enemy)
    })

    // Draw muzzle flashes
    muzzleFlashes.forEach(flash => {
      drawMuzzleFlash(ctx, flash)
    })

    // Draw explosions
    explosions.forEach(explosion => {
      drawExplosion(ctx, explosion)
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

  const drawTowerRange = (ctx: CanvasRenderingContext2D, tower: Tower) => {
    const x = tower.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = tower.position.y * CELL_SIZE + CELL_SIZE / 2

    ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, tower.range * CELL_SIZE, 0, Math.PI * 2)
    ctx.stroke()
  }

  const drawTower = (ctx: CanvasRenderingContext2D, tower: Tower) => {
    const x = tower.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = tower.position.y * CELL_SIZE + CELL_SIZE / 2

    const colors = {
      basic: '#4CAF50',
      sniper: '#2196F3',
      splash: '#FF9800',
      slow: '#9C27B0'
    }

    // Draw tower body
    ctx.fillStyle = colors[tower.tower_type]
    ctx.beginPath()
    ctx.arc(x, y, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()

    // Draw tower barrel (rotated)
    const rotation = tower.rotation || 0
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    
    // Barrel
    ctx.fillStyle = '#FFF'
    ctx.fillRect(0, -4, CELL_SIZE / 2.5, 8)
    
    // Barrel tip
    ctx.fillStyle = '#CCC'
    ctx.fillRect(CELL_SIZE / 3, -3, CELL_SIZE / 6, 6)
    
    ctx.restore()

    // Draw targeting indicator
    if (tower.current_target) {
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, CELL_SIZE / 2.5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Draw level indicator
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

    // Health bar
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

  const drawProjectile = (ctx: CanvasRenderingContext2D, projectile: any) => {
    const x = projectile.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = projectile.position.y * CELL_SIZE + CELL_SIZE / 2

    // Glowing projectile
    ctx.fillStyle = '#ffff00'
    ctx.shadowBlur = 15
    ctx.shadowColor = '#ffff00'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Trail
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - 10, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const drawMuzzleFlash = (ctx: CanvasRenderingContext2D, flash: any) => {
    const x = flash.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = flash.position.y * CELL_SIZE + CELL_SIZE / 2

    const intensity = Math.min(flash.duration / 0.1, 1)

    ctx.fillStyle = `rgba(255, 255, 150, ${intensity})`
    ctx.shadowBlur = 25
    ctx.shadowColor = '#ffff00'
    ctx.beginPath()
    ctx.arc(x, y, 12 * intensity, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  const drawExplosion = (ctx: CanvasRenderingContext2D, explosion: any) => {
    const x = explosion.position.x * CELL_SIZE + CELL_SIZE / 2
    const y = explosion.position.y * CELL_SIZE + CELL_SIZE / 2

    const progress = 1 - (explosion.duration / 0.3)
    const radius = explosion.radius * CELL_SIZE * (0.5 + progress * 0.5)

    // Outer ring
    ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Inner glow
    ctx.fillStyle = `rgba(255, 200, 0, ${(1 - progress) * 0.7})`
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2)
    ctx.fill()
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
    
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, ranges[towerType] * CELL_SIZE, 0, Math.PI * 2)
    ctx.stroke()
  }

  const isCellOccupied = (pos: Position): boolean => {
    return towers.some(t => t.position.x === pos.x && t.position.y === pos.y)
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
      onPlaceTower(hoveredCell.x, hoveredCell.y, selectedTower)
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
          <span>💰 Gold:</span> <strong>{gameState?.gold ?? 200}</strong>
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
          onClick={onStartWave}
          disabled={!isConnected}
        >
          Start Wave
        </button>
        <button 
          className="btn btn-success"
          onClick={onSpawnEnemy}
          disabled={!isConnected}
        >
          🦀 Spawn Test Enemy
        </button>
        <button 
          className="btn btn-danger"
          onClick={onClearTowers}
          disabled={!isConnected}
        >
          Clear All
        </button>
      </div>

      <div className="info-box">
        <p>
          <strong>Towers:</strong> {towers.length} | 
          <strong> Enemies:</strong> {enemies.length} |
          <strong> Projectiles:</strong> {projectiles.length}
        </p>
        <p className="hint">
          💡 Towers will automatically shoot enemies in range! 🎯
        </p>
      </div>
    </div>
  )
}

export default GameCanvas