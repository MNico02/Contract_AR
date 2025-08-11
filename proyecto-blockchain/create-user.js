import bcrypt from 'bcrypt';

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Password hash:', hash);
    console.log('\nSQL para crear usuario:');
    console.log(`INSERT INTO usuarios (email, password_hash, nombre, apellido, telefono, rol_id) 
VALUES ('admin@example.com', '${hash}', 'Admin', 'Sistema', '123456789', 1);`);
});