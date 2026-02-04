export interface Position {
  x: number
  y: number
}

export type TowerType = 'basic' | 'sniper' | 'splash' | 'slow'
export type EnemyType = 'basic' | 'fast' | 'tank' | 'flying' | 'boss'

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
  enemy_type: EnemyType
  health: number
  max_health: number
  speed: number
  path?: Position[]
  path_index?: number
}

export interface GameState {
  towers: Tower[]
  enemies: Enemy[]
  gold: number
  health: number
  wave: number
  game_time: number
  spawn_point?: Position
  goal_point?: Position
}