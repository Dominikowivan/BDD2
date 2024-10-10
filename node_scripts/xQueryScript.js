const { exec } = require('child_process');

// Absolute path to Xidel executable and XML file
const xidelPath = 'C:\\programacion\\Other\\BDD2\\node_scripts\\xidel.exe';
const xmlFilePath = 'C:\\programacion\\Other\\BDD2\\node_scripts\\catalogo.xml';

// Function to execute a Xidel command using the absolute path and display the result
function executeXidelCommand(command, description) {
    console.log(`\n${description}:`);
    // Construct the full command
    const fullCommand = `"${xidelPath}" "${xmlFilePath}" ${command}`;
    exec(fullCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        // Check if there is output in stdout
        if (stdout) {
            console.log(`Result:\n${stdout}`);
        }
        // Check if there is output in stderr
        if (stderr) {
            console.warn(`Stderr:\n${stderr}`);
        }
    });
}

// Define the Xidel commands for each task
const commands = [
    {
        description: 'a. Lista los títulos y precios de los libros cuyo precio sea mayor a 30',
        command: `--xquery "for $libro in /catalogo/libro where $libro/precio > 30 return <libro><titulo>{ $libro/titulo }</titulo><espacio/><precio>{ $libro/precio }</precio></libro>"`
    },
    {
        description: 'b. Genera un nuevo documento XML que contenga solo los libros publicados después del 1 de enero de 2023',
        command: `--xquery "<catalogo>{ for $libro in /catalogo/libro where xs:date($libro/fecha_publicacion) > xs:date('2023-01-01') return $libro }</catalogo>"`
    },
    {
        description: 'c. Cuenta cuántos libros hay en el catálogo',
        command: `--xquery "count(/catalogo/libro)"`
    },
    {
        description: 'd. Crea una lista en formato XML que muestre los títulos de los libros junto con el nombre de su autor, ordenados por precio de menor a mayor',
        command: `--xquery "for $libro in /catalogo/libro order by $libro/precio return <libro><titulo>{ $libro/titulo }</titulo><espacio/> <autor>{ $libro/autor }</autor></libro>"`
    }
];

// Execute each command in sequence
commands.forEach(({ command, description }) => {
    executeXidelCommand(command, description);
});
