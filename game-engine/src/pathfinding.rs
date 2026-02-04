use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

use crate::{Grid, Position};

/// Node used in A* pathfinding
#[derive(Debug, Clone, Eq, PartialEq)]
struct Node {
    position: Position,
    g_cost: i32, // Cost from start to this node
    h_cost: i32, // Heuristic cost from this node to goal
    parent: Option<Position>,
}

impl Node {
    fn new(position: Position, g_cost: i32, h_cost: i32, parent: Option<Position>) -> Self {
        Node {
            position,
            g_cost,
            h_cost,
            parent,
        }
    }

    /// Total cost (f_cost = g_cost + h_cost)
    fn f_cost(&self) -> i32 {
        self.g_cost + self.h_cost
    }
}

// Implement Ord for BinaryHeap (min-heap based on f_cost)
impl Ord for Node {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse ordering for min-heap
        other.f_cost().cmp(&self.f_cost())
            .then_with(|| other.h_cost.cmp(&self.h_cost))
    }
}

impl PartialOrd for Node {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// Find the shortest path from start to goal using A* algorithm
pub fn find_path(grid: &Grid, start: Position, goal: Position) -> Option<Vec<Position>> {
    // Check if start and goal are valid
    if !grid.is_walkable(&start) || !grid.is_walkable(&goal) {
        return None;
    }

    let mut open_set = BinaryHeap::new();
    let mut closed_set = HashSet::new();
    let mut came_from: HashMap<Position, Position> = HashMap::new();
    let mut g_scores: HashMap<Position, i32> = HashMap::new();

    // Initialize start node
    let start_h = heuristic(&start, &goal);
    open_set.push(Node::new(start, 0, start_h, None));
    g_scores.insert(start, 0);

    while let Some(current) = open_set.pop() {
        let current_pos = current.position;

        // Goal reached!
        if current_pos == goal {
            return Some(reconstruct_path(&came_from, current_pos));
        }

        // Skip if already evaluated
        if closed_set.contains(&current_pos) {
            continue;
        }

        closed_set.insert(current_pos);

        // Check all neighbors
        for neighbor_pos in current_pos.neighbors() {
            // Skip if not walkable or already evaluated
            if !grid.is_walkable(&neighbor_pos) || closed_set.contains(&neighbor_pos) {
                continue;
            }

            // Calculate tentative g_score
            let tentative_g = current.g_cost + 1; // Assuming cost of 1 per step

            // Check if this path to neighbor is better
            let is_better = match g_scores.get(&neighbor_pos) {
                Some(&existing_g) => tentative_g < existing_g,
                None => true,
            };

            if is_better {
                // This path is the best so far
                came_from.insert(neighbor_pos, current_pos);
                g_scores.insert(neighbor_pos, tentative_g);

                let h = heuristic(&neighbor_pos, &goal);
                open_set.push(Node::new(neighbor_pos, tentative_g, h, Some(current_pos)));
            }
        }
    }

    // No path found
    None
}

/// Manhattan distance heuristic
fn heuristic(pos: &Position, goal: &Position) -> i32 {
    pos.manhattan_distance(goal)
}

/// Reconstruct the path from start to goal
fn reconstruct_path(came_from: &HashMap<Position, Position>, mut current: Position) -> Vec<Position> {
    let mut path = vec![current];

    while let Some(&parent) = came_from.get(&current) {
        path.push(parent);
        current = parent;
    }

    path.reverse();
    path
}

/// Find path and return as list of waypoints (simplified version)
/// This version returns key waypoints, not every single step
pub fn find_waypoints(grid: &Grid, start: Position, goal: Position) -> Option<Vec<Position>> {
    let full_path = find_path(grid, start, goal)?;
    
    if full_path.len() <= 2 {
        return Some(full_path);
    }

    // Simplify path by removing unnecessary waypoints
    // Keep start, end, and points where direction changes
    let mut waypoints = vec![full_path[0]];
    
    for i in 1..full_path.len() - 1 {
        let prev = full_path[i - 1];
        let current = full_path[i];
        let next = full_path[i + 1];
        
        // Calculate direction vectors
        let dir1 = (current.x - prev.x, current.y - prev.y);
        let dir2 = (next.x - current.x, next.y - current.y);
        
        // If direction changes, this is a waypoint
        if dir1 != dir2 {
            waypoints.push(current);
        }
    }
    
    waypoints.push(*full_path.last().unwrap());
    Some(waypoints)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_straight_path() {
        let grid = Grid::new(10, 10);
        let start = Position::new(0, 0);
        let goal = Position::new(5, 0);

        let path = find_path(&grid, start, goal).unwrap();
        assert_eq!(path.len(), 6); // 0,0 -> 1,0 -> 2,0 -> 3,0 -> 4,0 -> 5,0
        assert_eq!(path[0], start);
        assert_eq!(path[5], goal);
    }

    #[test]
    fn test_diagonal_path() {
        let grid = Grid::new(10, 10);
        let start = Position::new(0, 0);
        let goal = Position::new(3, 3);

        let path = find_path(&grid, start, goal).unwrap();
        assert!(path.len() >= 7); // Manhattan path length
        assert_eq!(path[0], start);
        assert_eq!(*path.last().unwrap(), goal);
    }

    #[test]
    fn test_path_around_obstacle() {
        let mut grid = Grid::new(10, 10);
        
        // Create a wall
        grid.set_walkable(&Position::new(2, 0), false);
        grid.set_walkable(&Position::new(2, 1), false);
        grid.set_walkable(&Position::new(2, 2), false);

        let start = Position::new(0, 1);
        let goal = Position::new(4, 1);

        let path = find_path(&grid, start, goal).unwrap();
        
        // Path should go around the wall
        assert!(path.len() > 5); // Longer than straight path
        assert_eq!(path[0], start);
        assert_eq!(*path.last().unwrap(), goal);
        
        // Verify path doesn't go through blocked cells
        for pos in &path {
            assert!(grid.is_walkable(pos), "Path goes through blocked cell: {:?}", pos);
        }
    }

    #[test]
    fn test_no_path_completely_blocked() {
        let mut grid = Grid::new(10, 10);
        
        // Create a complete wall blocking the path
        for y in 0..10 {
            grid.set_walkable(&Position::new(5, y), false);
        }

        let start = Position::new(0, 5);
        let goal = Position::new(9, 5);

        let path = find_path(&grid, start, goal);
        assert!(path.is_none());
    }

    #[test]
    fn test_start_blocked() {
        let mut grid = Grid::new(10, 10);
        grid.set_walkable(&Position::new(0, 0), false);

        let start = Position::new(0, 0);
        let goal = Position::new(5, 5);

        let path = find_path(&grid, start, goal);
        assert!(path.is_none());
    }

    #[test]
    fn test_goal_blocked() {
        let mut grid = Grid::new(10, 10);
        grid.set_walkable(&Position::new(5, 5), false);

        let start = Position::new(0, 0);
        let goal = Position::new(5, 5);

        let path = find_path(&grid, start, goal);
        assert!(path.is_none());
    }

    #[test]
    fn test_waypoints_straight_line() {
        let grid = Grid::new(10, 10);
        let start = Position::new(0, 0);
        let goal = Position::new(5, 0);

        let waypoints = find_waypoints(&grid, start, goal).unwrap();
        
        // Straight line should only have start and end
        assert_eq!(waypoints.len(), 2);
        assert_eq!(waypoints[0], start);
        assert_eq!(waypoints[1], goal);
    }

    #[test]
    fn test_waypoints_around_corner() {
        let mut grid = Grid::new(10, 10);
        
        // Create an obstacle forcing a corner
        grid.set_walkable(&Position::new(2, 1), false);
        grid.set_walkable(&Position::new(2, 2), false);

        let start = Position::new(0, 2);
        let goal = Position::new(4, 2);

        let waypoints = find_waypoints(&grid, start, goal).unwrap();
        
        // Should have waypoints at direction changes
        assert!(waypoints.len() >= 2);
        assert_eq!(waypoints[0], start);
        assert_eq!(*waypoints.last().unwrap(), goal);
    }

    #[test]
    fn test_heuristic_manhattan() {
        let pos1 = Position::new(0, 0);
        let pos2 = Position::new(3, 4);
        
        assert_eq!(heuristic(&pos1, &pos2), 7);
    }
}
