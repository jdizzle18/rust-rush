use macroquad::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

mod pathfinding;
use pathfinding::find_waypoints;

const CELL_SIZE: f32 = 40.0;
const GRID_WIDTH: i32 = 20;
const GRID_HEIGHT: i32 = 15;

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

impl Position {
    pub fn new(x: i32, y: i32) -> Self {
        Position { x, y }
    }

    pub fn to_world(&self) -> (f32, f32) {
        (self.x as f32 * CELL_SIZE, self.y as f32 * CELL_SIZE)
    }

    pub fn from_world(x: f32, y: f32) -> Self {
        Position {
            x: (x / CELL_SIZE).floor() as i32,
            y: (y / CELL_SIZE).floor() as i32,
        }
    }

    pub fn manhattan_distance(&self, other: &Position) -> i32 {
        (self.x - other.x).abs() + (self.y - other.y).abs()
    }

    pub fn distance(&self, other: &Position) -> f32 {
        let dx = (self.x - other.x) as f32;
        let dy = (self.y - other.y) as f32;
        (dx * dx + dy * dy).sqrt()
    }

    pub fn neighbors(&self) -> Vec<Position> {
        vec![
            Position::new(self.x + 1, self.y),
            Position::new(self.x - 1, self.y),
            Position::new(self.x, self.y + 1),
            Position::new(self.x, self.y - 1),
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Grid {
    width: i32,
    height: i32,
    walkable: HashMap<Position, bool>,
}

impl Grid {
    pub fn new(width: i32, height: i32) -> Self {
        Grid {
            width,
            height,
            walkable: HashMap::new(),
        }
    }

    pub fn is_walkable(&self, pos: &Position) -> bool {
        if pos.x < 0 || pos.x >= self.width || pos.y < 0 || pos.y >= self.height {
            return false;
        }
        *self.walkable.get(pos).unwrap_or(&true)
    }

    pub fn set_walkable(&mut self, pos: &Position, walkable: bool) {
        self.walkable.insert(*pos, walkable);
    }
}

// ============================================================================
// TOWER SYSTEM
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum TowerType {
    Basic,
    Sniper,
    Splash,
    Slow,
}

impl TowerType {
    pub fn cost(&self) -> i32 {
        match self {
            TowerType::Basic => 50,
            TowerType::Sniper => 100,
            TowerType::Splash => 75,
            TowerType::Slow => 60,
        }
    }

    pub fn range(&self) -> f32 {
        match self {
            TowerType::Basic => 3.0,
            TowerType::Sniper => 6.0,
            TowerType::Splash => 2.5,
            TowerType::Slow => 3.5,
        }
    }

    pub fn damage(&self) -> i32 {
        match self {
            TowerType::Basic => 10,
            TowerType::Sniper => 50,
            TowerType::Splash => 15,
            TowerType::Slow => 5,
        }
    }

    pub fn fire_rate(&self) -> f32 {
        match self {
            TowerType::Basic => 1.0,
            TowerType::Sniper => 0.3,
            TowerType::Splash => 0.8,
            TowerType::Slow => 2.0,
        }
    }

    pub fn color(&self) -> Color {
        match self {
            TowerType::Basic => BLUE,
            TowerType::Sniper => RED,
            TowerType::Splash => ORANGE,
            TowerType::Slow => SKYBLUE,
        }
    }

    pub fn projectile_speed(&self) -> f32 {
        match self {
            TowerType::Basic => 300.0,
            TowerType::Sniper => 600.0,
            TowerType::Splash => 200.0,
            TowerType::Slow => 250.0,
        }
    }

    pub fn projectile_color(&self) -> Color {
        match self {
            TowerType::Basic => YELLOW,
            TowerType::Sniper => RED,
            TowerType::Splash => ORANGE,
            TowerType::Slow => Color::from_rgba(100, 200, 255, 255),
        }
    }

    pub fn splash_radius(&self) -> f32 {
        match self {
            TowerType::Splash => 1.5,
            _ => 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tower {
    pub id: u32,
    pub tower_type: TowerType,
    pub position: Position,
    #[serde(skip)]
    pub cooldown_remaining: f32,
    #[serde(skip)]
    pub target_id: Option<u32>,
    #[serde(skip)]
    pub rotation: f32, // Rotation angle in radians
}

impl Tower {
    pub fn new(id: u32, tower_type: TowerType, position: Position) -> Self {
        Tower {
            id,
            tower_type,
            position,
            cooldown_remaining: 0.0,
            target_id: None,
            rotation: 0.0,
        }
    }

    pub fn can_shoot(&self) -> bool {
        self.cooldown_remaining <= 0.0
    }

    pub fn update(&mut self, delta: f32) {
        if self.cooldown_remaining > 0.0 {
            self.cooldown_remaining -= delta;
        }
    }

    pub fn shoot(&mut self) {
        self.cooldown_remaining = 1.0 / self.tower_type.fire_rate();
    }

    pub fn world_position(&self) -> (f32, f32) {
        let (x, y) = self.position.to_world();
        (x + CELL_SIZE / 2.0, y + CELL_SIZE / 2.0)
    }
}

// ============================================================================
// PROJECTILE SYSTEM
// ============================================================================

#[derive(Debug, Clone)]
pub struct Projectile {
    pub id: u32,
    pub tower_type: TowerType,
    pub x: f32,
    pub y: f32,
    pub target_id: u32,
    pub target_x: f32,
    pub target_y: f32,
    pub damage: i32,
    pub speed: f32,
    pub lifetime: f32, // For safety, remove after X seconds
}

impl Projectile {
    pub fn new(
        id: u32,
        tower_type: TowerType,
        start_x: f32,
        start_y: f32,
        target_id: u32,
        target_x: f32,
        target_y: f32,
    ) -> Self {
        Projectile {
            id,
            tower_type,
            x: start_x,
            y: start_y,
            target_id,
            target_x,
            target_y,
            damage: tower_type.damage(),
            speed: tower_type.projectile_speed(),
            lifetime: 5.0, // 5 seconds max
        }
    }

    pub fn update(&mut self, delta: f32, enemy_pos: Option<(f32, f32)>) -> bool {
        self.lifetime -= delta;
        
        // Update target position if enemy moved
        if let Some((new_x, new_y)) = enemy_pos {
            self.target_x = new_x;
            self.target_y = new_y;
        }

        // Calculate direction to target
        let dx = self.target_x - self.x;
        let dy = self.target_y - self.y;
        let distance = (dx * dx + dy * dy).sqrt();

        // Check if reached target
        if distance < 5.0 || self.lifetime <= 0.0 {
            return false; // Projectile should be removed
        }

        // Move toward target
        let move_distance = self.speed * delta;
        if move_distance >= distance {
            self.x = self.target_x;
            self.y = self.target_y;
            return false; // Reached target
        }

        let direction_x = dx / distance;
        let direction_y = dy / distance;
        
        self.x += direction_x * move_distance;
        self.y += direction_y * move_distance;

        true // Continue moving
    }

    pub fn has_hit(&self) -> bool {
        let dx = self.target_x - self.x;
        let dy = self.target_y - self.y;
        let distance = (dx * dx + dy * dy).sqrt();
        distance < 10.0
    }
}

// ============================================================================
// ENEMY SYSTEM
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Enemy {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub path: Vec<Position>,
    pub current_waypoint: usize,
    pub speed: f32,
    pub health: i32,
    pub max_health: i32,
    #[serde(skip)]
    pub slow_duration: f32, // Time remaining slowed
    #[serde(skip)]
    pub slow_multiplier: f32, // Speed multiplier when slowed
}

impl Enemy {
    pub fn new(id: u32, start: Position, goal: Position, grid: &Grid) -> Option<Self> {
        let path = find_waypoints(grid, start, goal)?;
        let (x, y) = start.to_world();
        
        Some(Enemy {
            id,
            x: x + CELL_SIZE / 2.0,
            y: y + CELL_SIZE / 2.0,
            path,
            current_waypoint: 0,
            speed: 50.0,
            health: 100,
            max_health: 100,
            slow_duration: 0.0,
            slow_multiplier: 1.0,
        })
    }

    pub fn update(&mut self, delta: f32) -> bool {
        // Update slow effect
        if self.slow_duration > 0.0 {
            self.slow_duration -= delta;
            if self.slow_duration <= 0.0 {
                self.slow_multiplier = 1.0;
            }
        }

        if self.current_waypoint >= self.path.len() {
            return false; // Reached goal
        }

        let waypoint = &self.path[self.current_waypoint];
        let (target_x, target_y) = waypoint.to_world();
        let target_x = target_x + CELL_SIZE / 2.0;
        let target_y = target_y + CELL_SIZE / 2.0;

        let dx = target_x - self.x;
        let dy = target_y - self.y;
        let distance = (dx * dx + dy * dy).sqrt();

        if distance < 2.0 {
            self.current_waypoint += 1;
            return self.current_waypoint < self.path.len();
        }

        let effective_speed = self.speed * self.slow_multiplier;
        let move_distance = effective_speed * delta;
        let direction_x = dx / distance;
        let direction_y = dy / distance;

        self.x += direction_x * move_distance;
        self.y += direction_y * move_distance;

        true
    }

    pub fn recalculate_path(&mut self, grid: &Grid, goal: Position) {
        let current_pos = Position::from_world(self.x, self.y);
        if let Some(new_path) = find_waypoints(grid, current_pos, goal) {
            self.path = new_path;
            self.current_waypoint = 0;
        }
    }

    pub fn take_damage(&mut self, damage: i32) {
        self.health = (self.health - damage).max(0);
    }

    pub fn is_alive(&self) -> bool {
        self.health > 0
    }

    pub fn apply_slow(&mut self, duration: f32, multiplier: f32) {
        self.slow_duration = duration;
        self.slow_multiplier = multiplier;
    }
}

// ============================================================================
// EFFECTS SYSTEM
// ============================================================================

#[derive(Debug, Clone)]
pub struct MuzzleFlash {
    pub x: f32,
    pub y: f32,
    pub color: Color,
    pub lifetime: f32,
    pub max_lifetime: f32,
}

impl MuzzleFlash {
    pub fn new(x: f32, y: f32, color: Color) -> Self {
        MuzzleFlash {
            x,
            y,
            color,
            lifetime: 0.1,
            max_lifetime: 0.1,
        }
    }

    pub fn update(&mut self, delta: f32) -> bool {
        self.lifetime -= delta;
        self.lifetime > 0.0
    }

    pub fn alpha(&self) -> f32 {
        self.lifetime / self.max_lifetime
    }
}

#[derive(Debug, Clone)]
pub struct ExplosionEffect {
    pub x: f32,
    pub y: f32,
    pub radius: f32,
    pub max_radius: f32,
    pub color: Color,
    pub lifetime: f32,
    pub max_lifetime: f32,
}

impl ExplosionEffect {
    pub fn new(x: f32, y: f32, radius: f32, color: Color) -> Self {
        ExplosionEffect {
            x,
            y,
            radius: 0.0,
            max_radius: radius * CELL_SIZE,
            color,
            lifetime: 0.3,
            max_lifetime: 0.3,
        }
    }

    pub fn update(&mut self, delta: f32) -> bool {
        self.lifetime -= delta;
        let progress = 1.0 - (self.lifetime / self.max_lifetime);
        self.radius = self.max_radius * progress;
        self.lifetime > 0.0
    }

    pub fn alpha(&self) -> f32 {
        self.lifetime / self.max_lifetime
    }
}

// ============================================================================
// GAME STATE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub grid: Grid,
    pub towers: HashMap<u32, Tower>,
    pub enemies: HashMap<u32, Enemy>,
    pub spawn_point: Position,
    pub goal_point: Position,
    pub next_tower_id: u32,
    pub next_enemy_id: u32,
    pub gold: i32,
    pub health: i32,
    pub paused: bool,
}

impl GameState {
    pub fn new() -> Self {
        GameState {
            grid: Grid::new(GRID_WIDTH, GRID_HEIGHT),
            towers: HashMap::new(),
            enemies: HashMap::new(),
            spawn_point: Position::new(0, 7),
            goal_point: Position::new(19, 7),
            next_tower_id: 0,
            next_enemy_id: 0,
            gold: 200,
            health: 20,
            paused: false,
        }
    }

    pub fn place_tower(&mut self, tower_type: TowerType, position: Position) -> bool {
        if self.gold < tower_type.cost() {
            return false;
        }

        if !self.grid.is_walkable(&position) {
            return false;
        }

        let tower = Tower::new(self.next_tower_id, tower_type, position);
        self.towers.insert(self.next_tower_id, tower);
        self.next_tower_id += 1;
        self.gold -= tower_type.cost();
        self.grid.set_walkable(&position, false);

        // Recalculate paths for all enemies
        for enemy in self.enemies.values_mut() {
            enemy.recalculate_path(&self.grid, self.goal_point);
        }

        true
    }

    pub fn spawn_enemy(&mut self) -> bool {
        if let Some(enemy) = Enemy::new(
            self.next_enemy_id,
            self.spawn_point,
            self.goal_point,
            &self.grid,
        ) {
            self.enemies.insert(self.next_enemy_id, enemy);
            self.next_enemy_id += 1;
            true
        } else {
            false
        }
    }

    pub fn clear_all(&mut self) {
        for tower in self.towers.values() {
            self.grid.set_walkable(&tower.position, true);
        }
        self.towers.clear();
        self.enemies.clear();
    }
}

// ============================================================================
// GAME LOGIC WITH SHOOTING
// ============================================================================

pub struct Game {
    pub state: GameState,
    pub projectiles: HashMap<u32, Projectile>,
    pub next_projectile_id: u32,
    pub muzzle_flashes: Vec<MuzzleFlash>,
    pub explosions: Vec<ExplosionEffect>,
}

impl Game {
    pub fn new() -> Self {
        Game {
            state: GameState::new(),
            projectiles: HashMap::new(),
            next_projectile_id: 0,
            muzzle_flashes: Vec::new(),
            explosions: Vec::new(),
        }
    }

    pub fn update(&mut self, delta: f32) {
        if self.state.paused {
            return;
        }

        // Update towers
        self.update_towers(delta);

        // Update projectiles
        self.update_projectiles(delta);

        // Update enemies
        self.update_enemies(delta);

        // Update effects
        self.update_effects(delta);
    }

    fn update_towers(&mut self, delta: f32) {
        let mut new_projectiles = Vec::new();
        let mut new_flashes = Vec::new();

        // Collect tower IDs and positions first to avoid borrow issues
        let tower_data: Vec<(u32, TowerType, f32, f32, bool)> = self.state.towers
            .values()
            .map(|tower| {
                let (x, y) = tower.world_position();
                (tower.id, tower.tower_type, x, y, tower.can_shoot())
            })
            .collect();

        // Update tower cooldowns
        for tower in self.state.towers.values_mut() {
            tower.update(delta);
        }

        // Find targets and shoot
        for (tower_id, tower_type, tower_x, tower_y, can_shoot) in tower_data {
            if !can_shoot {
                continue;
            }

            // Find target in range
            if let Some(target) = self.find_target_for_tower_at(tower_x, tower_y, tower_type) {
                // Update tower rotation and shoot
                if let Some(tower) = self.state.towers.get_mut(&tower_id) {
                    let dx = target.x - tower_x;
                    let dy = target.y - tower_y;
                    tower.rotation = dy.atan2(dx);
                    tower.target_id = Some(target.id);
                    tower.shoot();
                }

                // Create projectile
                let projectile = Projectile::new(
                    self.next_projectile_id,
                    tower_type,
                    tower_x,
                    tower_y,
                    target.id,
                    target.x,
                    target.y,
                );
                new_projectiles.push((self.next_projectile_id, projectile));
                self.next_projectile_id += 1;

                // Create muzzle flash
                new_flashes.push(MuzzleFlash::new(
                    tower_x,
                    tower_y,
                    tower_type.projectile_color(),
                ));
            } else {
                // Clear target if none found
                if let Some(tower) = self.state.towers.get_mut(&tower_id) {
                    tower.target_id = None;
                }
            }
        }

        // Add new projectiles
        for (id, projectile) in new_projectiles {
            self.projectiles.insert(id, projectile);
        }

        // Add new flashes
        self.muzzle_flashes.extend(new_flashes);
    }

    fn find_target_for_tower_at(&self, tower_x: f32, tower_y: f32, tower_type: TowerType) -> Option<Enemy> {
        let range = tower_type.range() * CELL_SIZE;

        self.state
            .enemies
            .values()
            .filter(|enemy| {
                let dx = enemy.x - tower_x;
                let dy = enemy.y - tower_y;
                let distance = (dx * dx + dy * dy).sqrt();
                distance <= range && enemy.is_alive()
            })
            .max_by(|a, b| {
                // Target enemy furthest along path (closest to goal)
                a.current_waypoint.cmp(&b.current_waypoint)
            })
            .cloned()
    }

    fn update_projectiles(&mut self, delta: f32) {
        let mut projectiles_to_remove = Vec::new();
        let mut hits = Vec::new();

        for (id, projectile) in self.projectiles.iter_mut() {
            let enemy_pos = self.state.enemies
                .get(&projectile.target_id)
                .map(|e| (e.x, e.y));

            let still_active = projectile.update(delta, enemy_pos);

            if !still_active || projectile.has_hit() {
                // Record hit before removing projectile
                if let Some(enemy) = self.state.enemies.get(&projectile.target_id) {
                    hits.push((
                        projectile.target_id,
                        projectile.damage,
                        projectile.tower_type,
                        enemy.x,
                        enemy.y,
                    ));
                }
                projectiles_to_remove.push(*id);
            }
        }

        // Remove finished projectiles
        for id in projectiles_to_remove {
            self.projectiles.remove(&id);
        }

        // Apply damage
        for (enemy_id, damage, tower_type, hit_x, hit_y) in hits {
            self.apply_damage(enemy_id, damage, tower_type, hit_x, hit_y);
        }
    }

    fn apply_damage(&mut self, enemy_id: u32, damage: i32, tower_type: TowerType, hit_x: f32, hit_y: f32) {
        match tower_type {
            TowerType::Splash => {
                // Splash damage to nearby enemies
                let splash_radius = tower_type.splash_radius() * CELL_SIZE;
                let enemies_to_damage: Vec<u32> = self.state.enemies
                    .iter()
                    .filter(|(_, enemy)| {
                        let dx = enemy.x - hit_x;
                        let dy = enemy.y - hit_y;
                        let distance = (dx * dx + dy * dy).sqrt();
                        distance <= splash_radius
                    })
                    .map(|(id, _)| *id)
                    .collect();

                for id in enemies_to_damage {
                    if let Some(enemy) = self.state.enemies.get_mut(&id) {
                        enemy.take_damage(damage);
                    }
                }

                // Create explosion effect
                self.explosions.push(ExplosionEffect::new(
                    hit_x,
                    hit_y,
                    tower_type.splash_radius(),
                    ORANGE,
                ));
            }
            TowerType::Slow => {
                // Apply slow effect
                if let Some(enemy) = self.state.enemies.get_mut(&enemy_id) {
                    enemy.take_damage(damage);
                    enemy.apply_slow(2.0, 0.5); // Slow for 2 seconds at 50% speed
                }
            }
            _ => {
                // Regular single-target damage
                if let Some(enemy) = self.state.enemies.get_mut(&enemy_id) {
                    enemy.take_damage(damage);
                }
            }
        }

        // Remove dead enemies
        let mut enemies_to_remove = Vec::new();
        for (id, enemy) in self.state.enemies.iter() {
            if !enemy.is_alive() {
                enemies_to_remove.push(*id);
            }
        }

        for id in enemies_to_remove {
            self.state.enemies.remove(&id);
            self.state.gold += 10; // Reward for killing enemy
        }
    }

    fn update_enemies(&mut self, delta: f32) {
        let mut enemies_to_remove = Vec::new();

        for (id, enemy) in self.state.enemies.iter_mut() {
            let still_moving = enemy.update(delta);
            if !still_moving {
                // Enemy reached goal
                enemies_to_remove.push(*id);
                self.state.health -= 1;
            }
        }

        for id in enemies_to_remove {
            self.state.enemies.remove(&id);
        }
    }

    fn update_effects(&mut self, delta: f32) {
        // Update muzzle flashes
        self.muzzle_flashes.retain_mut(|flash| flash.update(delta));

        // Update explosions
        self.explosions.retain_mut(|explosion| explosion.update(delta));
    }
}

// ============================================================================
// RENDERING
// ============================================================================

pub fn render_game(game: &Game) {
    // Draw grid
    for x in 0..GRID_WIDTH {
        for y in 0..GRID_HEIGHT {
            let pos = Position::new(x, y);
            let (wx, wy) = pos.to_world();
            
            let color = if !game.state.grid.is_walkable(&pos) {
                Color::from_rgba(60, 60, 60, 255)  // Darker gray for towers
            } else if pos == game.state.spawn_point {
                Color::from_rgba(50, 150, 50, 255)  // Darker green for spawn
            } else if pos == game.state.goal_point {
                Color::from_rgba(150, 50, 50, 255)  // Darker red for goal
            } else {
                Color::from_rgba(30, 30, 30, 255)  // Dark gray for walkable
            };
            
            draw_rectangle(wx, wy, CELL_SIZE, CELL_SIZE, color);
            draw_rectangle_lines(wx, wy, CELL_SIZE, CELL_SIZE, 1.0, Color::from_rgba(50, 50, 50, 255));
        }
    }

    // Draw towers
    for tower in game.state.towers.values() {
        let (x, y) = tower.position.to_world();
        let center_x = x + CELL_SIZE / 2.0;
        let center_y = y + CELL_SIZE / 2.0;
        
        // Draw range circle (subtle)
        draw_circle_lines(
            center_x,
            center_y,
            tower.tower_type.range() * CELL_SIZE,
            1.0,
            Color::from_rgba(100, 100, 100, 50),
        );
        
        // Draw tower base
        draw_circle(center_x, center_y, CELL_SIZE * 0.4, tower.tower_type.color());
        
        // Draw tower barrel/cannon (rotated)
        let barrel_length = CELL_SIZE * 0.5;
        let barrel_end_x = center_x + barrel_length * tower.rotation.cos();
        let barrel_end_y = center_y + barrel_length * tower.rotation.sin();
        draw_line(center_x, center_y, barrel_end_x, barrel_end_y, 4.0, DARKGRAY);
        
        // Draw cooldown indicator
        if tower.cooldown_remaining > 0.0 {
            let cooldown_ratio = tower.cooldown_remaining / (1.0 / tower.tower_type.fire_rate());
            let _angle = cooldown_ratio * std::f32::consts::PI * 2.0;
            draw_circle_lines(center_x, center_y, CELL_SIZE * 0.3, 2.0, YELLOW);
        }
    }

    // Draw projectiles
    for projectile in game.projectiles.values() {
        draw_circle(
            projectile.x,
            projectile.y,
            5.0,
            projectile.tower_type.projectile_color(),
        );
        
        // Draw trail effect
        let dx = projectile.target_x - projectile.x;
        let dy = projectile.target_y - projectile.y;
        let distance = (dx * dx + dy * dy).sqrt();
        if distance > 0.0 {
            let trail_length = 10.0;
            let trail_x = projectile.x - (dx / distance) * trail_length;
            let trail_y = projectile.y - (dy / distance) * trail_length;
            
            let mut trail_color = projectile.tower_type.projectile_color();
            trail_color.a = 0.3;
            draw_line(projectile.x, projectile.y, trail_x, trail_y, 3.0, trail_color);
        }
    }

    // Draw muzzle flashes
    for flash in &game.muzzle_flashes {
        let mut color = flash.color;
        color.a = flash.alpha();
        draw_circle(flash.x, flash.y, 8.0, color);
    }

    // Draw explosions
    for explosion in &game.explosions {
        let mut color = explosion.color;
        color.a = explosion.alpha() * 0.5;
        draw_circle_lines(explosion.x, explosion.y, explosion.radius, 3.0, color);
    }

    // Draw enemies
    for enemy in game.state.enemies.values() {
        // Draw enemy body
        let base_color = RED;
        let color = if enemy.slow_duration > 0.0 {
            SKYBLUE // Show when slowed
        } else {
            base_color
        };
        
        draw_circle(enemy.x, enemy.y, CELL_SIZE * 0.3, color);
        
        // Draw health bar
        let health_ratio = enemy.health as f32 / enemy.max_health as f32;
        let bar_width = CELL_SIZE * 0.6;
        let bar_height = 4.0;
        let bar_x = enemy.x - bar_width / 2.0;
        let bar_y = enemy.y - CELL_SIZE * 0.5;
        
        draw_rectangle(bar_x, bar_y, bar_width, bar_height, DARKGRAY);
        draw_rectangle(
            bar_x,
            bar_y,
            bar_width * health_ratio,
            bar_height,
            if health_ratio > 0.5 { GREEN } else { ORANGE },
        );
    }

    // Draw UI
    draw_text(
        &format!("Gold: ${}", game.state.gold),
        10.0,
        25.0,
        30.0,
        GOLD,
    );
    draw_text(
        &format!("Health: {}", game.state.health),
        10.0,
        55.0,
        30.0,
        RED,
    );
    draw_text(
        &format!("Enemies: {}", game.state.enemies.len()),
        10.0,
        85.0,
        30.0,
        WHITE,
    );
    draw_text(
        &format!("Towers: {}", game.state.towers.len()),
        10.0,
        115.0,
        30.0,
        WHITE,
    );

    if game.state.paused {
        draw_text("PAUSED", 400.0, 300.0, 60.0, YELLOW);
    }
}

#[macroquad::main("Rust Rush")]
async fn main() {
    let mut game = Game::new();
    
    loop {
        let delta = get_frame_time();

        // Handle input
        if is_key_pressed(KeyCode::Space) {
            game.state.paused = !game.state.paused;
        }

        if is_key_pressed(KeyCode::E) {
            game.state.spawn_enemy();
        }

        if is_mouse_button_pressed(MouseButton::Left) {
            let (mx, my) = mouse_position();
            let pos = Position::from_world(mx, my);
            game.state.place_tower(TowerType::Basic, pos);
        }

        // Update game
        game.update(delta);

        // Render
        clear_background(BLACK);
        render_game(&game);

        next_frame().await;
    }
}