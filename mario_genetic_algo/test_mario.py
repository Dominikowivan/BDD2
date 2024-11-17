import gym
import gym_super_mario_bros
from nes_py.wrappers import JoypadSpace
from gym_super_mario_bros.actions import RIGHT_ONLY
import numpy as np
import random
import warnings
import pickle
from multiprocessing import Pool, cpu_count, freeze_support
import time  # Importar el módulo time para controlar la velocidad durante la reproducción

# Suprimir advertencias de RuntimeWarning
warnings.filterwarnings("ignore", category=RuntimeWarning)

# Parámetros del juego y algoritmo genético
NUM_ACTIONS = len(RIGHT_ONLY)
POPULATION_SIZE = 50
GENOME_LENGTH = 2500  # Aumentado para mayor control
NUM_GENERATIONS = 300
MUTATION_RATE = 0.05
ELITE_SIZE = 2
FRAME_SKIP = 4

# Crear población inicial
def create_population():
    return [np.random.randint(0, NUM_ACTIONS, GENOME_LENGTH) for _ in range(POPULATION_SIZE)]

# Función para verificar si Mario está en el aire
def is_mario_in_air(env):
    """
    Verifica si Mario está en el aire consultando la RAM del juego.
    """
    ram = env.unwrapped.ram
    action_state = ram[0x001D]
    return action_state != 0  # Si es diferente de 0, Mario está en el aire

# Evaluar el desempeño de un agente
def evaluate_agent(genome):
    # Crear un nuevo entorno local en cada proceso
    env = gym_super_mario_bros.make('SuperMarioBros-v0')
    env = JoypadSpace(env, RIGHT_ONLY)
    state = env.reset()
    done = False
    total_reward = 0
    prev_x_pos = 0
    prev_coins = 0
    prev_score = 0
    prev_life = None  # Para rastrear el número de vidas
    stagnation_counter = 0
    max_stagnation = 50

    # Variables para la recompensa de saltos
    total_jump_distance = 0
    current_air_time = 0
    jump_start_x_pos = None
    min_air_time_for_reward = 5  # Mínimo de frames en el aire para considerar un salto largo
    jump_reward_factor = 1  # Factor de recompensa para los saltos

    for action in genome:
        if done:
            break
        for _ in range(FRAME_SKIP):
            state, reward, done, info = env.step(action)
            total_reward += reward  # Recompensa por avanzar
            if done:
                break

            # Inicializar el número de vidas
            if prev_life is None:
                prev_life = info['life']

            # Verificar si Mario ha muerto
            elif info['life'] < prev_life:
                # Mario ha perdido una vida
                total_reward -= 1000  # Penalizar la muerte
                done = True
                break

            current_x_pos = info['x_pos']
            current_coins = info['coins']
            current_score = info['score']

            # Recompensa por monedas recogidas
            if current_coins > prev_coins:
                total_reward += (current_coins - prev_coins) * 50
                prev_coins = current_coins

            # Recompensa por eliminar enemigos
            if current_score > prev_score:
                score_diff = current_score - prev_score
                total_reward += score_diff
                prev_score = current_score

            # Penalización por retroceder
            if current_x_pos < prev_x_pos:
                total_reward -= 10

            # Recompensa por alcanzar checkpoints
            for checkpoint in [1000, 2000, 3000]:
                if current_x_pos >= checkpoint > prev_x_pos:
                    total_reward += 500

            # Recompensa por velocidad de avance
            x_speed = current_x_pos - prev_x_pos
            total_reward += x_speed * 0.1

            # Penalización por tiempo transcurrido
            total_reward -= 1

            # Rastrear saltos y tiempo en el aire
            if is_mario_in_air(env):
                current_air_time += 1
                if jump_start_x_pos is None:
                    jump_start_x_pos = current_x_pos
            else:
                if current_air_time >= min_air_time_for_reward and current_x_pos > jump_start_x_pos:
                    jump_distance = current_x_pos - jump_start_x_pos
                    total_jump_distance += jump_distance
                current_air_time = 0
                jump_start_x_pos = None

            # Verificar progreso
            if current_x_pos > prev_x_pos:
                stagnation_counter = 0
            else:
                stagnation_counter += 1

            prev_x_pos = current_x_pos

            # Penalizar si no hay progreso
            if stagnation_counter >= max_stagnation:
                total_reward -= 100
                done = True
                break

            # Verificar si completó el nivel
            if info.get('flag_get'):
                total_reward += 10000  # Bonificación por completar el nivel
                total_reward += info['time'] * 10  # Recompensa por tiempo restante
                done = True
                break

        if done:
            break

    # Añadir la recompensa por los saltos
    total_reward += total_jump_distance * jump_reward_factor

    env.close()
    return total_reward

# Selección por torneo
def tournament_selection(population, fitnesses, k=3):
    selected = []
    while len(selected) < POPULATION_SIZE // 2:
        participants = random.sample(list(zip(population, fitnesses)), k)
        winner = max(participants, key=lambda x: x[1])[0]
        selected.append(winner)
    return selected

# Cruce de dos padres
def crossover(parent1, parent2):
    crossover_point = np.random.randint(1, GENOME_LENGTH - 1)
    child1 = np.concatenate((parent1[:crossover_point], parent2[crossover_point:]))
    child2 = np.concatenate((parent2[:crossover_point], parent1[crossover_point:]))
    return child1, child2

# Mutación de un genoma
def mutate(genome):
    for i in range(len(genome)):
        if np.random.rand() < MUTATION_RATE:
            genome[i] = np.random.randint(0, NUM_ACTIONS)
    return genome

# Función para evaluar la población en paralelo
def evaluate_population(population):
    with Pool(processes=cpu_count()) as pool:
        fitnesses = pool.map(evaluate_agent, population)
    return fitnesses

# Función para ejecutar al agente
def play_agent(genome):
    env = gym_super_mario_bros.make('SuperMarioBros-v0')
    env = JoypadSpace(env, RIGHT_ONLY)
    state = env.reset()
    done = False
    prev_life = None
    for action in genome:
        if done:
            break
        for _ in range(FRAME_SKIP):
            state, reward, done, info = env.step(action)
            env.render()
            time.sleep(1/60)  # Mantener la velocidad normal del juego

            # Inicializar el número de vidas
            if prev_life is None:
                prev_life = info['life']

            # Verificar si Mario ha muerto
            elif info['life'] < prev_life:
                print("Mario ha perdido una vida.")
                done = True
                break

            # Verificar si Mario ha completado el nivel
            if info.get('flag_get'):
                print("¡Mario ha completado el nivel!")
                done = True
                break

            if done:
                break
    env.close()

# Función para guardar agentes
def save_agent(agent, generation):
    filename = f'agent_gen_{generation}.pkl'
    with open(filename, 'wb') as f:
        pickle.dump(agent, f)
    print(f"El agente de la generación {generation} ha sido guardado en '{filename}'.")

# Función principal
def main():
    # Inicializar el mejor agente global
    best_agent_overall = None
    best_fitness_overall = float('-inf')

    # Ciclo evolutivo
    population = create_population()

    for generation in range(NUM_GENERATIONS):
        print(f"\nGeneración {generation+1}")

        # Evaluar aptitud de cada agente en paralelo
        fitnesses = evaluate_population(population)

        # Mostrar aptitudes
        for i, fitness in enumerate(fitnesses):
            print(f"Aptitud del agente {i+1}/{POPULATION_SIZE}: {fitness}")

        # Encontrar el mejor agente de la generación
        best_fitness = max(fitnesses)
        best_agent_index = np.argmax(fitnesses)
        best_agent_gen = population[best_agent_index]
        print(f"Mejor aptitud en la generación {generation+1}: {best_fitness}")

        # Actualizar el mejor agente global si es necesario
        if best_fitness > best_fitness_overall:
            best_fitness_overall = best_fitness
            best_agent_overall = best_agent_gen
            print(f"Nuevo mejor agente global con aptitud: {best_fitness_overall}")

        # Guardar el agente de la primera generación
        if generation == 0:
            save_agent(best_agent_gen, generation+1)

        # Guardar el agente cada 10 generaciones
        if (generation + 1) % 10 == 0:
            save_agent(best_agent_gen, generation+1)

        # Seleccionar padres
        parents = tournament_selection(population, fitnesses)

        # Aplicar elitismo
        elites = [population[i] for i in np.argsort(fitnesses)[-ELITE_SIZE:]]

        # Generar nueva población
        new_population = elites.copy()
        while len(new_population) < POPULATION_SIZE:
            parent1, parent2 = random.sample(parents, 2)
            child1, child2 = crossover(parent1, parent2)
            child1 = mutate(child1)
            child2 = mutate(child2)
            new_population.extend([child1, child2])

        # Asegurarse de que la nueva población no exceda el tamaño definido
        population = new_population[:POPULATION_SIZE]

    # Al final, usar el mejor agente global
    print(f"\nEl mejor agente final tiene una aptitud de: {best_fitness_overall}")

    # Guardar el agente de la última generación
    save_agent(best_agent_gen, 'final')

    # Guardar el mejor agente global
    with open('best_agent.pkl', 'wb') as f:
        pickle.dump(best_agent_overall, f)
    print("El mejor agente global ha sido guardado en 'best_agent.pkl'.")

    # Ejecutar al mejor agente global
    play_agent(best_agent_overall)

# Punto de entrada del programa
if __name__ == '__main__':
    freeze_support()  # Necesario en Windows para 'multiprocessing'
    main()
