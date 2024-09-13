-- Insert 50 random records into Ninja table
DECLARE @counter INT = 0;
WHILE @counter < 50
BEGIN
    INSERT INTO Ninja (name, maxWeight, life)
    VALUES (
        LEFT(NEWID(), 10),       -- Generates random string for name
        ABS(CHECKSUM(NEWID()) % 100 + 50),  -- Random maxWeight between 50 and 150
        ABS(CHECKSUM(NEWID()) % 100 + 50)  -- Random life between 50 and 150
    );
    SET @counter = @counter + 1;
END;
GO

-- Insert 50 random records into Item table, linked to random Ninjas
SET @counter = 0;
WHILE @counter < 50
BEGIN
    INSERT INTO Item (name, weight, ninja_id)
    VALUES (
        LEFT(NEWID(), 10),       -- Generates random string for item name
        ABS(CHECKSUM(NEWID()) % 20 + 1),  -- Random weight between 1 and 20
        (SELECT TOP 1 id FROM Ninja ORDER BY NEWID())  -- Random Ninja ID
    );
    SET @counter = @counter + 1;
END;
GO

-- Insert 50 random records into Rank table, linked to random Ninjas
SET @counter = 0;
WHILE @counter < 50
BEGIN
    INSERT INTO [Rank] (rank_name, ninja_id)
    VALUES (
        CASE 
            WHEN ABS(CHECKSUM(NEWID()) % 3) = 0 THEN 'Apprentice'
            WHEN ABS(CHECKSUM(NEWID()) % 3) = 1 THEN 'Practitioner'
            ELSE 'Master'
        END,  -- Randomly assign 'Apprentice', 'Practitioner', or 'Master'
        (SELECT TOP 1 id FROM Ninja ORDER BY NEWID())  -- Random Ninja ID
    );
    SET @counter = @counter + 1;
END;
GO

-- Insert 50 random records into Apprentice table, linked to random Rank
SET @counter = 0;
WHILE @counter < 50
BEGIN
    INSERT INTO Apprentice (skill_level, rank_id)
    VALUES (
        ABS(CHECKSUM(NEWID()) % 100 + 50),  -- Random skill level between 50 and 150
        (SELECT TOP 1 id FROM [Rank] WHERE rank_name = 'Apprentice' ORDER BY NEWID())  -- Random Apprentice Rank ID
    );
    SET @counter = @counter + 1;
END;
GO

-- Insert 50 random records into Practitioner table, linked to random Rank
SET @counter = 0;
WHILE @counter < 50
BEGIN
    INSERT INTO Practitioner (leadership_ability, rank_id)
    VALUES (
        ABS(CHECKSUM(NEWID()) % 100 + 50),  -- Random leadership ability between 50 and 150
        (SELECT TOP 1 id FROM [Rank] WHERE rank_name = 'Practitioner' ORDER BY NEWID())  -- Random Practitioner Rank ID
    );
    SET @counter = @counter + 1;
END;
GO

-- Insert 50 random records into Master table, linked to random Rank
SET @counter = 0;
WHILE @counter < 50
BEGIN
    INSERT INTO Master (strategy_skill, rank_id)
    VALUES (
        ABS(CHECKSUM(NEWID()) % 100 + 50),  -- Random strategy skill between 50 and 150
        (SELECT TOP 1 id FROM [Rank] WHERE rank_name = 'Master' ORDER BY NEWID())  -- Random Master Rank ID
    );
    SET @counter = @counter + 1;
END;
GO
