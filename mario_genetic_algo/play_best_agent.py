import argparse
import gym
import gym_super_mario_bros
from nes_py.wrappers import JoypadSpace
from gym_super_mario_bros.actions import RIGHT_ONLY
import pickle
import warnings
import time  # Importar el módulo time

# Suprimir advertencias de RuntimeWarning
warnings.filterwarnings("ignore", category=RuntimeWarning)

# Configurar el entorno
env = gym_super_mario_bros.make('SuperMarioBros-v0')
env = JoypadSpace(env, RIGHT_ONLY)

# Función para ejecutar al agente
def play_agent(genome):
    state = env.reset()
    done = False
    prev_life = None
    for action in genome:
        if done:
            break
        for _ in range(4):  # Asegúrate de usar el mismo FRAME_SKIP
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

# Función principal
def main():
    parser = argparse.ArgumentParser(description='Reproducir un agente específico.')
    parser.add_argument('--agent', type=str, default='best_agent.pkl', help='Archivo del agente a cargar')
    args = parser.parse_args()

    # Cargar el agente especificado
    try:
        with open(args.agent, 'rb') as f:
            agent = pickle.load(f)
        print(f"El agente '{args.agent}' ha sido cargado.")
    except FileNotFoundError:
        print(f"No se encontró el archivo '{args.agent}'. Asegúrate de que el archivo exista.")
        return

    # Ejecutar al agente
    play_agent(agent)

if __name__ == '__main__':
    main()
