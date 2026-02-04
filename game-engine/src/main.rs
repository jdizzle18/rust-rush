use serde::{Deserialize, Serialize};

/// Represents a position on the game grid
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

impl Position {
    pub fn new(x: i32, y: i32) -> Self {
        Position { x, y }
    }

    /// Calculate Manhattan distance to another position
    pub fn manhattan_distance(&self, other: &Position) -> i32 {
        (self.x - other.x).abs() + (self.y - other.y).abs()
    }

    /// Get neighboring positions (up, down, left, right)
    pub fn neighbors(&self) -> Vec<Position> {
        vec![
            Position::new(self.x + 1, self.y),
            Position::new(self.x - 1, self.y),
            Position::new(self.x, self.y + 1),
            Position::new(self.x, self.y - 1),
        ]
    }
}

/// Represents the game grid/map
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Grid {
    pub width: usize,
    pub height: usize,
    /// true = walkable, false = blocked (tower placed)
    cells: Vec<Vec<bool>>,
}

impl Grid {
    pub fn new(width: usize, height: usize) -> Self {
        Grid {
            width,
            height,
            cells: vec![vec![true; width]; height],
        }
    }

    pub fn is_walkable(&self, pos: &Position) -> bool {
        if pos.x < 0 || pos.y < 0 {
            return false;
        }
        let x = pos.x as usize;
        let y = pos.y as usize;
        
        if y >= self.height || x >= self.width {
            return false;
        }
        
        self.cells[y][x]
    }

    pub fn set_walkable(&mut self, pos: &Position, walkable: bool) {
        if pos.x < 0 || pos.y < 0 {
            return;
        }
        let x = pos.x as usize;
        let y = pos.y as usize;
        
        if y < self.height && x < self.width {
            self.cells[y][x] = walkable;
        }
    }
}

/// Tower types
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum TowerType {
    Basic,
    Sniper,
    Splash,
    Slow,
}

/// Tower structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tower {
    pub id: u32,
    pub position: Position,
    pub tower_type: TowerType,
    pub range: f32,
    pub damage: i32,
    pub fire_rate: f32, // attacks per second
    pub last_fire_time: f32,
    pub level: u8,
}

impl Tower {
    pub fn new(id: u32, position: Position, tower_type: TowerType) -> Self {
        let (range, damage, fire_rate) = match tower_type {
            TowerType::Basic => (3.0, 10, 1.0),
            TowerType::Sniper => (6.0, 50, 0.3),
            TowerType::Splash => (2.5, 15, 0.8),
            TowerType::Slow => (3.5, 5, 2.0),
        };

        Tower {
            id,
            position,
            tower_type,
            range,
            damage,
            fire_rate,
            last_fire_time: 0.0,
            level: 1,
        }
    }

    pub fn can_fire(&self, current_time: f32) -> bool {
        current_time - self.last_fire_time >= 1.0 / self.fire_rate
    }

    pub fn distance_to(&self, pos: &Position) -> f32 {
        let dx = (self.position.x - pos.x) as f32;
        let dy = (self.position.y - pos.y) as f32;
        (dx * dx + dy * dy).sqrt()
    }
}

/// Enemy types
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum EnemyType {
    Basic,
    Fast,
    Tank,
    Flying,
    Boss,
}

/// Enemy structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Enemy {
    pub id: u32,
    pub position: Position,
    pub enemy_type: EnemyType,
    pub health: i32,
    pub max_health: i32,
    pub speed: f32,
    pub path: Vec<Position>,
    pub path_index: usize,
    pub gold_reward: i32,
}

impl Enemy {
    pub fn new(id: u32, start_pos: Position, enemy_type: EnemyType) -> Self {
        let (health, speed, gold_reward) = match enemy_type {
            EnemyType::Basic => (100, 1.0, 10),
            EnemyType::Fast => (50, 2.0, 15),
            EnemyType::Tank => (300, 0.5, 25),
            EnemyType::Flying => (80, 1.5, 20),
            EnemyType::Boss => (1000, 0.3, 100),
        };

        Enemy {
            id,
            position: start_pos,
            enemy_type,
            health,
            max_health: health,
            speed,
            path: vec![],
            path_index: 0,
            gold_reward,
        }
    }

    pub fn take_damage(&mut self, damage: i32) {
        self.health = (self.health - damage).max(0);
    }

    pub fn is_alive(&self) -> bool {
        self.health > 0
    }
}

/// Main game state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub grid: Grid,
    pub towers: Vec<Tower>,
    pub enemies: Vec<Enemy>,
    pub gold: i32,
    pub health: i32,
    pub wave: u32,
    pub game_time: f32,
    pub next_tower_id: u32,
    pub next_enemy_id: u32,
}

impl GameState {
    pub fn new(width: usize, height: usize) -> Self {
        GameState {
            grid: Grid::new(width, height),
            towers: Vec::new(),
            enemies: Vec::new(),
            gold: 100, // Starting gold
            health: 100, // Starting health
            wave: 1,
            game_time: 0.0,
            next_tower_id: 1,
            next_enemy_id: 1,
        }
    }

    pub fn add_tower(&mut self, position: Position, tower_type: TowerType) -> Result<u32, String> {
        // Check if position is valid and walkable
        if !self.grid.is_walkable(&position) {
            return Err("Position is blocked".to_string());
        }

        // Check if we have enough gold (simplified - no tower costs yet)
        let tower_id = self.next_tower_id;
        self.next_tower_id += 1;

        let tower = Tower::new(tower_id, position, tower_type);
        self.towers.push(tower);
        
        // Mark position as blocked
        self.grid.set_walkable(&position, false);

        Ok(tower_id)
    }

    pub fn remove_tower(&mut self, tower_id: u32) -> Result<(), String> {
        if let Some(index) = self.towers.iter().position(|t| t.id == tower_id) {
            let tower = self.towers.remove(index);
            // Mark position as walkable again
            self.grid.set_walkable(&tower.position, true);
            Ok(())
        } else {
            Err("Tower not found".to_string())
        }
    }

    pub fn spawn_enemy(&mut self, start_pos: Position, enemy_type: EnemyType) -> u32 {
        let enemy_id = self.next_enemy_id;
        self.next_enemy_id += 1;

        let enemy = Enemy::new(enemy_id, start_pos, enemy_type);
        self.enemies.push(enemy);

        enemy_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_position_manhattan_distance() {
        let pos1 = Position::new(0, 0);
        let pos2 = Position::new(3, 4);
        assert_eq!(pos1.manhattan_distance(&pos2), 7);
    }

    #[test]
    fn test_grid_walkable() {
        let mut grid = Grid::new(10, 10);
        let pos = Position::new(5, 5);
        
        assert!(grid.is_walkable(&pos));
        
        grid.set_walkable(&pos, false);
        assert!(!grid.is_walkable(&pos));
    }

    #[test]
    fn test_tower_creation() {
        let tower = Tower::new(1, Position::new(5, 5), TowerType::Basic);
        assert_eq!(tower.range, 3.0);
        assert_eq!(tower.damage, 10);
    }

    #[test]
    fn test_add_remove_tower() {
        let mut game = GameState::new(10, 10);
        let pos = Position::new(5, 5);
        
        let tower_id = game.add_tower(pos, TowerType::Basic).unwrap();
        assert_eq!(game.towers.len(), 1);
        assert!(!game.grid.is_walkable(&pos));
        
        game.remove_tower(tower_id).unwrap();
        assert_eq!(game.towers.len(), 0);
        assert!(game.grid.is_walkable(&pos));
    }

    #[test]
    fn test_enemy_takes_damage() {
        let mut enemy = Enemy::new(1, Position::new(0, 0), EnemyType::Basic);
        assert_eq!(enemy.health, 100);
        
        enemy.take_damage(30);
        assert_eq!(enemy.health, 70);
        assert!(enemy.is_alive());
        
        enemy.take_damage(80);
        assert_eq!(enemy.health, 0);
        assert!(!enemy.is_alive());
    }
}

fn main() {
    println!("Rust Rush Game Engine");
    println!("=====================");
    
    // Example: Create a game
    let mut game = GameState::new(20, 15);
    println!("Created game grid: {}x{}", game.grid.width, game.grid.height);
    
    // Add a tower
    match game.add_tower(Position::new(5, 5), TowerType::Basic) {
        Ok(id) => println!("Added tower with ID: {}", id),
        Err(e) => println!("Failed to add tower: {}", e),
    }
    
    // Spawn an enemy
    let enemy_id = game.spawn_enemy(Position::new(0, 0), EnemyType::Basic);
    println!("Spawned enemy with ID: {}", enemy_id);
    
    println!("\nGame state:");
    println!("  Gold: {}", game.gold);
    println!("  Health: {}", game.health);
    println!("  Towers: {}", game.towers.len());
    println!("  Enemies: {}", game.enemies.len());
}
