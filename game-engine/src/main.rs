use serde::{Deserialize, Serialize};

mod pathfinding;
pub use pathfinding::{find_path, find_waypoints};

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

    /// Calculate path to goal using A* pathfinding
    pub fn calculate_path(&mut self, grid: &Grid, goal: Position) -> bool {
        if let Some(path) = find_path(grid, self.position, goal) {
            self.path = path;
            self.path_index = 0;
            true
        } else {
            false
        }
    }

    /// Calculate simplified waypoint path
    pub fn calculate_waypoint_path(&mut self, grid: &Grid, goal: Position) -> bool {
        if let Some(waypoints) = find_waypoints(grid, self.position, goal) {
            self.path = waypoints;
            self.path_index = 0;
            true
        } else {
            false
        }
    }

    /// Get the next position to move toward
    pub fn get_next_position(&self) -> Option<Position> {
        if self.path_index < self.path.len() {
            Some(self.path[self.path_index])
        } else {
            None
        }
    }

    /// Move toward the next waypoint
    pub fn move_along_path(&mut self) -> bool {
        if self.path_index >= self.path.len() {
            return false; // Reached end of path
        }

        let target = self.path[self.path_index];
        
        // If we're at the current waypoint, move to next
        if self.position == target {
            self.path_index += 1;
            return self.path_index < self.path.len();
        }

        // Move toward current waypoint
        // For now, we just snap to the waypoint (will improve with interpolation later)
        self.position = target;
        true
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
    pub spawn_point: Position,
    pub goal_point: Position,
}

impl GameState {
    pub fn new(width: usize, height: usize) -> Self {
        GameState {
            grid: Grid::new(width, height),
            towers: Vec::new(),
            enemies: Vec::new(),
            gold: 100,
            health: 100,
            wave: 1,
            game_time: 0.0,
            next_tower_id: 1,
            next_enemy_id: 1,
            spawn_point: Position::new(0, 0),
            goal_point: Position::new((width - 1) as i32, (height - 1) as i32),
        }
    }

    pub fn add_tower(&mut self, position: Position, tower_type: TowerType) -> Result<u32, String> {
        if !self.grid.is_walkable(&position) {
            return Err("Position is blocked".to_string());
        }

        let tower_id = self.next_tower_id;
        self.next_tower_id += 1;

        let tower = Tower::new(tower_id, position, tower_type);
        self.towers.push(tower);
        
        self.grid.set_walkable(&position, false);

        // Recalculate paths for all enemies
        self.recalculate_enemy_paths();

        Ok(tower_id)
    }

    pub fn remove_tower(&mut self, tower_id: u32) -> Result<(), String> {
        if let Some(index) = self.towers.iter().position(|t| t.id == tower_id) {
            let tower = self.towers.remove(index);
            self.grid.set_walkable(&tower.position, true);
            
            // Recalculate paths for all enemies
            self.recalculate_enemy_paths();
            
            Ok(())
        } else {
            Err("Tower not found".to_string())
        }
    }

    pub fn spawn_enemy(&mut self, enemy_type: EnemyType) -> Result<u32, String> {
        let enemy_id = self.next_enemy_id;
        self.next_enemy_id += 1;

        let mut enemy = Enemy::new(enemy_id, self.spawn_point, enemy_type);
        
        // Calculate initial path
        if !enemy.calculate_waypoint_path(&self.grid, self.goal_point) {
            return Err("Cannot find path to goal".to_string());
        }

        self.enemies.push(enemy);
        Ok(enemy_id)
    }

    /// Recalculate paths for all enemies (call when towers are placed/removed)
    pub fn recalculate_enemy_paths(&mut self) {
        for enemy in &mut self.enemies {
            enemy.calculate_waypoint_path(&self.grid, self.goal_point);
        }
    }

    /// Update game logic (call this every frame)
    pub fn update(&mut self, delta_time: f32) {
        self.game_time += delta_time;

        // Move enemies
        let mut enemies_to_remove = Vec::new();
        for (i, enemy) in self.enemies.iter_mut().enumerate() {
            if !enemy.move_along_path() {
                // Enemy reached the goal
                self.health -= 1;
                enemies_to_remove.push(i);
            }
        }

        // Remove enemies that reached the goal (in reverse to maintain indices)
        for i in enemies_to_remove.into_iter().rev() {
            self.enemies.remove(i);
        }
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

    #[test]
    fn test_enemy_pathfinding() {
        let grid = Grid::new(10, 10);
        let mut enemy = Enemy::new(1, Position::new(0, 0), EnemyType::Basic);
        
        let goal = Position::new(5, 5);
        assert!(enemy.calculate_path(&grid, goal));
        assert!(!enemy.path.is_empty());
        assert_eq!(enemy.path[0], Position::new(0, 0));
        assert_eq!(*enemy.path.last().unwrap(), goal);
    }
    
    
    #[test]
    fn test_enemy_path_around_tower() {
        let mut game = GameState::new(10, 10);
        game.spawn_point = Position::new(0, 5);
        game.goal_point = Position::new(9, 5);
    
        // Place towers to block straight path
        game.add_tower(Position::new(5, 5), TowerType::Basic).unwrap();
        game.add_tower(Position::new(5, 4), TowerType::Basic).unwrap();
        game.add_tower(Position::new(5, 6), TowerType::Basic).unwrap();
        
        // Spawn enemy - should find path around towers
        let enemy_id = game.spawn_enemy(EnemyType::Basic).unwrap();
        
        let enemy = game.enemies.iter().find(|e| e.id == enemy_id).unwrap();
        assert!(!enemy.path.is_empty());
        
        // Path should have multiple waypoints (not a straight line)
        assert!(enemy.path.len() >= 3, "Path should have at least 3 waypoints");
        
        // Verify start and end points
        assert_eq!(enemy.path[0], game.spawn_point);
        assert_eq!(*enemy.path.last().unwrap(), game.goal_point);
    }

    #[test]
    fn test_no_path_available() {
        let mut game = GameState::new(10, 10);
        game.spawn_point = Position::new(0, 5);
        game.goal_point = Position::new(9, 5);
        
        // Create complete wall
        for y in 0..10 {
            game.add_tower(Position::new(5, y), TowerType::Basic).unwrap();
        }
        
        // Should fail to spawn enemy (no path)
        let result = game.spawn_enemy(EnemyType::Basic);
        assert!(result.is_err());
    }
}

fn main() {
    println!("Rust Rush Game Engine with A* Pathfinding");
    println!("==========================================");
    
    let mut game = GameState::new(20, 15);
    println!("Created game grid: {}x{}", game.grid.width, game.grid.height);
    
    // Set spawn and goal
    game.spawn_point = Position::new(0, 7);
    game.goal_point = Position::new(19, 7);
    println!("Spawn: {:?}, Goal: {:?}", game.spawn_point, game.goal_point);
    
    // Spawn an enemy without obstacles
    println!("\n--- Test 1: Straight path ---");
    match game.spawn_enemy(EnemyType::Basic) {
        Ok(id) => {
            let enemy = game.enemies.iter().find(|e| e.id == id).unwrap();
            println!("Enemy {} spawned with path length: {}", id, enemy.path.len());
            println!("Path: {:?}", enemy.path);
        }
        Err(e) => println!("Failed to spawn enemy: {}", e),
    }
    
    // Clear enemies
    game.enemies.clear();
    
    // Add some towers to create obstacles
    println!("\n--- Test 2: Path around towers ---");
    game.add_tower(Position::new(10, 7), TowerType::Basic).unwrap();
    game.add_tower(Position::new(10, 6), TowerType::Basic).unwrap();
    game.add_tower(Position::new(10, 8), TowerType::Basic).unwrap();
    println!("Placed 3 towers at x=10");
    
    // Spawn enemy - should pathfind around towers
    match game.spawn_enemy(EnemyType::Fast) {
        Ok(id) => {
            let enemy = game.enemies.iter().find(|e| e.id == id).unwrap();
            println!("Enemy {} found path around towers: {} waypoints", id, enemy.path.len());
            println!("Path: {:?}", enemy.path);
        }
        Err(e) => println!("Failed to spawn enemy: {}", e),
    }
    
    println!("\n--- Game Statistics ---");
    println!("Towers: {}", game.towers.len());
    println!("Enemies: {}", game.enemies.len());
    println!("Gold: {}", game.gold);
    println!("Health: {}", game.health);
    
    println!("\nA* Pathfinding working! ✅");
}
