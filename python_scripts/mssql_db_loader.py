import pyodbc
from faker import Faker
import random


conn = None
fake = Faker()
num_records = 50
database_server = input("Indicar el nombre del servidor de base de datos MSSQL: ")
try:
    conn_string = 'DRIVER={SQL Server};' + f'SERVER={database_server};' 
    conn = pyodbc.connect(conn_string, autocommit=True)
    print("Conexión exitosa a la base de datos.")

    cursor = conn.cursor()

    # Crear la base de datos si no existe:
    cursor.execute("IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'BBDD2') CREATE DATABASE BBDD2;")
    conn.commit()

    cursor.execute("USE BBDD2;")

    bands_table = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Band' AND xtype='U')
            CREATE TABLE Band (
                BandID INT PRIMARY KEY IDENTITY(1,1),
                Name VARCHAR(100) NOT NULL,
                Genre VARCHAR(50),
                AmountOfListeners INT
            );"""
    countries_table = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Country' AND xtype='U')
            CREATE TABLE Country (
                CountryID INT PRIMARY KEY IDENTITY(1,1),
                Name VARCHAR(100) NOT NULL
            );"""
    artists_table = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Artist' AND xtype='U')
            CREATE TABLE Artist (
                ArtistID INT PRIMARY KEY IDENTITY(1,1),
                FirstName VARCHAR(50) NOT NULL,
                LastName VARCHAR(50) NOT NULL,
                BandID INT NOT NULL,
                FOREIGN KEY (BandID) REFERENCES Band(BandID)
            );"""
    instruments_table = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Instrument' AND xtype='U')
            CREATE TABLE Instrument (
                InstrumentID INT PRIMARY KEY IDENTITY(1,1),
                Name VARCHAR(50) NOT NULL,
                Color VARCHAR(30),
                Type VARCHAR(50),
                ArtistID INT NOT NULL,
                FOREIGN KEY (ArtistID) REFERENCES Artist(ArtistID)
            );"""
    played_in_table = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PlayedIn' AND xtype='U')
            CREATE TABLE PlayedIn (
                BandID INT NOT NULL,
                CountryID INT NOT NULL,
                Date DATE NOT NULL,
                PRIMARY KEY (BandID, CountryID),
                FOREIGN KEY (BandID) REFERENCES Band(BandID),
                FOREIGN KEY (CountryID) REFERENCES Country(CountryID)
            );"""
    
    print("Creando las tablas...")
    for table in (bands_table, countries_table, artists_table, instruments_table, played_in_table):
        cursor.execute(table)
        conn.commit()
    print("Tablas creadas!")

    print("Insertando 50 registros aleatorios por tabla...")

    # --- 1. Inserción de datos en la tabla Country ---
    for _ in range(num_records):
        country_name = fake.country()
        cursor.execute("INSERT INTO Country (Name) VALUES (?)", country_name)

    # --- 2. Inserción de datos en la tabla Band ---
    genres = ['Rock', 'Jazz', 'Pop', 'Metal', 'Folk', 'Electronic', 'Soul', 'Hip Hop', 'Indie', 'Classical']
    for _ in range(num_records):
        band_name = fake.company()
        genre = random.choice(genres)
        listeners = random.randint(10000, 200000)
        cursor.execute("INSERT INTO Band (Name, Genre, AmountOfListeners) VALUES (?, ?, ?)", band_name, genre, listeners)

    # --- 3. Inserción de datos en la tabla Artist ---
    for _ in range(num_records):
        first_name = fake.first_name()
        last_name = fake.last_name()
        # Las bandas ya fueron creadas, es por eso que podemos asumir que los BandID van del 1 al 50:
        band_id = random.randint(1, num_records)
        cursor.execute("INSERT INTO Artist (FirstName, LastName, BandID) VALUES (?, ?, ?)", first_name, last_name, band_id)

    # --- 4. Inserción de datos en la tabla Instrument ---
    instrument_types = ['String', 'Percussion', 'Brass', 'Woodwind', 'Electronic']
    instrument_colors = ['Red', 'Blue', 'Black', 'White', 'Gold', 'Silver', 'Brown', 'Green', 'Yellow', 'Purple']
    instrument_names = ['Guitar', 'Drums', 'Bass', 'Keyboard', 'Saxophone', 'Trumpet', 'Violin', 'Flute', 'Cello', 'Clarinet']
    for _ in range(num_records):
        instrument_name = random.choice(instrument_names)
        color = random.choice(instrument_colors)
        instrument_type = random.choice(instrument_types)
        # Lo mismo que para las bandas y sus artistas:
        artist_id = random.randint(1, num_records)
        cursor.execute("INSERT INTO Instrument (Name, Color, Type, ArtistID) VALUES (?, ?, ?, ?)", instrument_name, color, instrument_type, artist_id)

    # --- 5. Inserción de datos en la tabla PlayedIn ---
    inserted_combinations = set()
    inserted_count = 0
    while inserted_count < num_records:
        band_id = random.randint(1, num_records)
        country_id = random.randint(1, num_records)
        combination = (band_id, country_id)

        if combination not in inserted_combinations:
            date = fake.date_between(start_date='-3y', end_date='today').strftime('%Y-%m-%d')
            cursor.execute("INSERT INTO PlayedIn (BandID, CountryID, Date) VALUES (?, ?, ?)", band_id, country_id, date)
            inserted_combinations.add(combination)
            inserted_count += 1

    conn.commit()
    cursor.close()
    print("Registros insertados!")

except pyodbc.Error as e:
    print("Error al intentar conectar a la base de datos:")
    print(e)
finally:
    if conn:
        print("Cerrando la conexión.")
        conn.close()
