import pygame
import sys
import random
import time

# Initialize Pygame
pygame.init()

# Set up some constants
WIDTH = 800
HEIGHT = 600
SPEED = 10
BLOCK_SIZE = 20
WHITE = (255, 255, 255)
RED = (255, 0, 0)

# Set up the display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('Snake Game')

# Set up the snake and food
snake = [(200, 150), (180, 150), (160, 150)]
food = (400, 300)
direction = 'right'

# Set up the score
score = 0

# Main game loop
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_LEFT and direction != 'right':
                direction = 'left'
            elif event.key == pygame.K_RIGHT and direction != 'left':
                direction = 'right'
            elif event.key == pygame.K_UP and direction != 'down':
                direction = 'up'
            elif event.key == pygame.K_DOWN and direction != 'up':
                direction = 'down'

    # Move the snake
    if direction == 'left':
        new_head = (snake[0][0] - BLOCK_SIZE, snake[0][1])
    elif direction == 'right':
        new_head = (snake[0][0] + BLOCK_SIZE, snake[0][1])
    elif direction == 'up':
        new_head = (snake[0][0], snake[0][1] - BLOCK_SIZE)
    else:
        new_head = (snake[0][0], snake[0][1] + BLOCK_SIZE)

    snake.insert(0, new_head)

    # Check for collision with food
    if snake[0] == food:
        score += 1
        food = (random.randint(0, WIDTH - BLOCK_SIZE) // BLOCK_SIZE * BLOCK_SIZE,
                random.randint(0, HEIGHT - BLOCK_SIZE) // BLOCK_SIZE * BLOCK_SIZE)
    else:
        snake.pop()

    # Check for collision with wall or self
    if (snake[0][0] < 0 or snake[0][0] >= WIDTH or
            snake[0][1] < 0 or snake[0][1] >= HEIGHT or
            snake[0] in snake[1:]):
        print(f"Game over! Your score is {score}.")
        pygame.quit()
        sys.exit()

    # Draw everything
    screen.fill(WHITE)
    for pos in snake:
        pygame.draw.rect(screen, RED, (pos[0], pos[1], BLOCK_SIZE, BLOCK_SIZE))
    pygame.draw.rect(screen, WHITE, (*food, BLOCK_SIZE, BLOCK_SIZE))

    # Update the display
    pygame.display.flip()

    # Cap the frame rate
    time.sleep(1 / SPEED)