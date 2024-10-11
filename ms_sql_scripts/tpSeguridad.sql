CREATE DATABASE InversionesV2;
GO

USE InversionesV2;
GO

CREATE TABLE Pedidos (
    PedidoID INT PRIMARY KEY IDENTITY(1,1),
    ClienteID INT NOT NULL,
    FechaPedido DATETIME NOT NULL,
    Estado VARCHAR(50) NOT NULL, -- Por ejemplo: 'En proceso', 'Concluido'
    Monto DECIMAL(18, 2) NOT NULL,
    Descripcion VARCHAR(255),
    FechaUltimaActualizacion DATETIME NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE Inversiones (
    InversionID INT PRIMARY KEY IDENTITY(1,1),
    PedidoID INT NOT NULL FOREIGN KEY REFERENCES Pedidos(PedidoID),
    FechaInicio DATETIME NOT NULL,
    FechaFin DATETIME,
    Estado VARCHAR(50) NOT NULL, -- Por ejemplo: 'Activo', 'Cerrado'
    Ganancia DECIMAL(18, 2),
    Riesgo VARCHAR(50) NOT NULL -- Por ejemplo: 'Alto', 'Medio', 'Bajo'
);
GO

CREATE LOGIN UsuarioMarketing WITH PASSWORD = 'Password123!';
CREATE LOGIN UsuarioAdmin WITH PASSWORD = 'Password123!';
GO

CREATE ROLE Rol_Analista;
CREATE ROLE Rol_Admin;
CREATE ROLE Rol_Reporte;
GO


GRANT SELECT ON Pedidos TO Rol_Analista;
GRANT SELECT ON Inversiones TO Rol_Analista;

GRANT INSERT, UPDATE, DELETE ON Pedidos TO Rol_Admin;
GRANT INSERT, UPDATE, DELETE ON Inversiones TO Rol_Admin;

GRANT SELECT ON Pedidos TO Rol_Reporte;
GO

CREATE USER UsuarioMarketing FOR LOGIN UsuarioMarketing;
CREATE USER UsuarioAdmin FOR LOGIN UsuarioAdmin;
GO

ALTER ROLE Rol_Analista ADD MEMBER UsuarioMarketing;
ALTER ROLE Rol_Admin ADD MEMBER UsuarioAdmin;
ALTER ROLE Rol_Reporte ADD MEMBER UsuarioMarketing;
GO
