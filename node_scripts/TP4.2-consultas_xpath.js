const fs = require('fs');
const xpath = require('xpath');
const dom = require('xmldom').DOMParser;
const xml2js = require('xml2js');

// Lee el archivo XML
const xml = fs.readFileSync('catalogo.xml', 'utf-8');

// Convierte el XML a un objeto DOM
const doc = new dom().parseFromString(xml);

// Función para extraer los autores
function extraerAutores() {
    const autores = xpath.select("//autor/text()", doc);
    return autores.map(autor => autor.nodeValue);
}

// Función para obtener los títulos de los libros publicados en 2023
function obtenerTitulos2023() {
    const titulos = xpath.select("//libro[fecha_publicacion[starts-with(text(),'2023')]]/titulo/text()", doc);
    return titulos.map(titulo => titulo.nodeValue);
}

// Función para obtener el precio del libro con id="3"
function obtenerPrecioLibro3() {
    const precio = xpath.select("//libro[@id='3']/precio/text()", doc);
    return precio.length ? precio[0].nodeValue : null;
}

// Función para encontrar los títulos de libros publicados por "Editorial ABC"
function obtenerTitulosEditorialABC() {
    const titulos = xpath.select("//libro[editorial='Editorial ABC']/titulo/text()", doc);
    return titulos.map(titulo => titulo.nodeValue);
}

// Ejecuta las funciones y muestra los resultados
console.log("Autores en el catálogo:", extraerAutores());
console.log("Libros publicados en 2023:", obtenerTitulos2023());
console.log("Precio del libro con id=3:", obtenerPrecioLibro3());
console.log("Libros de la Editorial ABC:", obtenerTitulosEditorialABC());

