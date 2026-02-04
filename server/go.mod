module rust-rush/server

go 1.21

require (
	github.com/gorilla/websocket v1.5.1
	github.com/joho/godotenv v1.5.1
)

require golang.org/x/net v0.17.0 // indirect

replace rust-rush/server/internal/game => ./internal/game

replace rust-rush/server/internal/websocket => ./internal/websocket
