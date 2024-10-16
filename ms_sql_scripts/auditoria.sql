USE master;
GO

CREATE SERVER AUDIT MiAuditoria
TO FILE (FILEPATH = 'C:\AuditoriaSQL');
GO

CREATE SERVER AUDIT SPECIFICATION MiAuditoriaServidor
FOR SERVER AUDIT MiAuditoria
ADD (FAILED_LOGIN_GROUP),
ADD (SERVER_ROLE_MEMBER_CHANGE_GROUP);
GO

ALTER SERVER AUDIT MiAuditoria WITH (STATE = ON);
GO

ALTER SERVER AUDIT SPECIFICATION MiAuditoriaServidor WITH (STATE = ON);
GO

USE InversionesV2;
GO

CREATE DATABASE AUDIT SPECIFICATION MiAuditoriaBD
FOR SERVER AUDIT MiAuditoria
ADD (SELECT ON OBJECT::Pedidos BY UsuarioMarketing),
ADD (UPDATE ON OBJECT::Pedidos BY UsuarioMarketing),
ADD (SELECT ON OBJECT::Inversiones BY UsuarioMarketing),
ADD (UPDATE ON OBJECT::Inversiones BY UsuarioMarketing);
GO

ALTER DATABASE AUDIT SPECIFICATION MiAuditoriaBD WITH (STATE = ON);
GO
