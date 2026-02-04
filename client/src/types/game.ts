export interface Position {
  x: number
  y: number
}

export type TowerType = 'basic' | 'sniper' | 'splash' | 'slow'

export interface Tower {
  id: number
  position: Position
  tower_type: TowerType
  level: number
  range: number
}

export interface Enemy {
  id: number
  position: Position
  enemy_type: string
  health: number
  max_health: number
}

export interface GameState {
  towers: Tower[]
  enemies: Enemy[]
  gold: number
  health: number
  wave: number
  game_time: number
}