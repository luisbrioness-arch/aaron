-- Usuario admin inicial para poder entrar por primera vez.
-- Usuario: admin   Contraseña: demo123
--
-- El hash es un bcrypt real ($2b$, generado con bcryptjs) — PHP verifica
-- hashes $2a$/$2b$ igual que los $2y$ que produce su propio password_hash(),
-- así que login.php lo acepta tal cual, sin pasos extra.
--
-- Cambiar esta contraseña (o borrar este usuario y crear uno nuevo) antes
-- de usar esto en producción de verdad.
INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'admin',
  'admin@aaronprovisiones.cl',
  '$2b$10$kfLG9V317Ys07zVobM9Pr.Q7waOrvLeYBGHWWcVaeoB7QHuyQwXAu',
  'Administrador',
  'admin',
  1
);
