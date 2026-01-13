# Generador de Rejillas de Cardano (tamaño Post-it)

Esta web crea una [rejilla de Cardano](https://es.wikipedia.org/wiki/Rejilla_de_Cardano) de la manera más complicada posible: generando un STL para imprimir en 3D, del tamaño exacto de un Post-it.

El proyecto surge de la necesidad de crear una tarjeta de felicitación con un mensaje secreto, que tuviera una parte física, no teniendo acceso a una impresora "normal", ni un cricut, ni nada parecido, solo una impresora 3D.



## Estructura del proyecto

- `index.html`: la página con principal, con las explicaciones y un botón de generar y descargar STL.  
- `main.js`: la lógica para generar la rejilla (con semilla), construir la geometría y descargar el STL.  
- También un fichero de estilos `styles.css` mínimo y una imagen por ahí.



## Cómo se usa

1. Abre la web.
2. Pulsa **“Generar y descargar STL”**.
3. Se descargará un archivo tipo `cardano_seed_1971.stl`
4. Imprime el STL en tu impresora 3D.
5. Pon la rejilla encima de un Post-it y escribe tus mensajes de agente secreto primerizo.



## Cómo funciona por dentro 

- Como la rejilla se rota cuatro veces, sólo tenemos que preocuparnos de distribuir un cuarto de los agujeros. A cada posición de ese cuadrante de `NUM_HOLES/2 x NUM_HOLES/2` elementos le asignamos una rotación aleatoria.
- A partir de esas rotaciones se calculan las posiciones finales de los agujeros en una rejilla `NUM_HOLES x NUM_HOLES`. 
- Luego se construye la pieza 3D:
  - una base (cuboid),
  - se restan los “cutters” de los agujeros,
  - y se resta un “frame” interior. 
- Finalmente se serializa a **STL binario** y se descarga como blob desde el navegador.

**Importante**: El orden de las operaciones geométricas es relevante si queremos evitar vértices abirtos.



## Tech

El sistema está montado con:

- Vanilla Javascript 
- `@jscad/modeling` para la geometría
- `@jscad/stl-serializer` para exportar a STL
- Bootstrap 5.3.8 para la UI
- Bootstrap icons para los iconos del footer

En la web se cargan vía **importmap** desde CDN, para no depender de un servidor de Node.




