-- Create the database (SQL Server doesn't support `IF NOT EXISTS` for databases)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'bdd2')
BEGIN
    CREATE DATABASE bdd2;
END;
GO

USE bdd2;
GO

-- Create the Ninja table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Ninja')
BEGIN
    CREATE TABLE Ninja
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        maxWeight INT NOT NULL,
        life INT NOT NULL
    );
END;
GO

-- Create the Item table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Item')
BEGIN
    CREATE TABLE Item
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        weight INT NOT NULL,
        ninja_id INT NULL,
        CONSTRAINT item_ibfk_1 FOREIGN KEY (ninja_id) REFERENCES Ninja (id)
    );
END;
GO

-- Create the index on ninja_id for the Item table
CREATE INDEX idx_ninja_id ON Item (ninja_id);
GO

-- Create the Rank table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Rank')
BEGIN
    CREATE TABLE Rank
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        rank_name NVARCHAR(50) NOT NULL,
        ninja_id INT NULL,
        CONSTRAINT rank_ibfk_1 FOREIGN KEY (ninja_id) REFERENCES Ninja (id)
    );
END;
GO

-- Create the Apprentice table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Apprentice')
BEGIN
    CREATE TABLE Apprentice
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        skill_level INT NOT NULL,
        rank_id INT NULL,
        CONSTRAINT apprentice_ibfk_1 FOREIGN KEY (rank_id) REFERENCES Rank (id)
    );
END;
GO

-- Create the Master table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Master')
BEGIN
    CREATE TABLE Master
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        strategy_skill INT NOT NULL,
        rank_id INT NULL,
        CONSTRAINT master_ibfk_1 FOREIGN KEY (rank_id) REFERENCES Rank (id)
    );
END;
GO

-- Create the Practitioner table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Practitioner')
BEGIN
    CREATE TABLE Practitioner
    (
        id INT IDENTITY(1,1) PRIMARY KEY,
        leadership_ability INT NOT NULL,
        rank_id INT NULL,
        CONSTRAINT practitioner_ibfk_1 FOREIGN KEY (rank_id) REFERENCES Rank (id)
    );
END;
GO

-- Create indexes for rank_id on Apprentice, Master, and Practitioner tables
CREATE INDEX idx_rank_id_apprentice ON Apprentice (rank_id);
CREATE INDEX idx_rank_id_master ON Master (rank_id);
CREATE INDEX idx_rank_id_practitioner ON Practitioner (rank_id);
GO

-- Create the index on ninja_id for the Rank table
CREATE INDEX idx_ninja_id_rank ON Rank (ninja_id);
GO
