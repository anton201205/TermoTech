document.addEventListener('DOMContentLoaded', function () {

    // -------------------------------
    // SISTEMA DE PUNTOS
    // -------------------------------
    let puntos = 3000;
    const valorPunto = 0.10;

    const puntosUsuario = document.getElementById("puntosUsuario");
    const equivalenciaSoles = document.getElementById("equivalenciaSoles");

    function actualizarPuntos() {
        puntosUsuario.textContent = puntos;
        equivalenciaSoles.textContent = "S/. " + (puntos * valorPunto).toFixed(2);
    }
    actualizarPuntos();

    window.modificarPuntos = function (cantidad) {
        puntos += cantidad;
        if (puntos < 0) puntos = 0;

        actualizarPuntos();
        alert("✔ Puntos actualizados. Ahora tienes: " + puntos);
    };

    // ------------------------------------------------------
    // 🛒 CARRITO
    // ------------------------------------------------------
    let carrito = [];
    const listaCarrito = document.getElementById("listaCarrito");
    const totalCarrito = document.getElementById("totalCarrito");

    function agregarAlCarrito(nombre, precio) {
        carrito.push({ nombre, precio });
        actualizarCarritoHTML();
    }

    function actualizarCarritoHTML() {
        listaCarrito.innerHTML = "";
        let total = 0;

        carrito.forEach((item, index) => {
            total += item.precio;
            listaCarrito.innerHTML += `
                <li class="list-group-item d-flex justify-content-between">
                    ${item.nombre} — S/. ${item.precio.toFixed(2)}
                    <button class="btn btn-sm btn-danger" onclick="eliminarItem(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </li>`;
        });

        totalCarrito.textContent = "S/. " + total.toFixed(2);
    }

    window.eliminarItem = function (index) {
        carrito.splice(index, 1);
        actualizarCarritoHTML();
    };

    document.getElementById("vaciarCarrito").addEventListener("click", () => {
        carrito = [];
        actualizarCarritoHTML();
    });

    // ------------------------------------------------------
    // PRODUCTOS PRINCIPALES
    // ------------------------------------------------------
    document.querySelectorAll(".comprarProducto").forEach(btn => {
        btn.addEventListener("click", () => {
            const precio = parseFloat(btn.dataset.precio);

            // Buscar el nombre de forma segura
            let card = btn.closest(".card");     // encuentra la tarjeta contenedora
            let titulo = card.querySelector("h4");

            if (!titulo) {
                alert("❌ Error: No se encontró título del producto.");
                return;
            }

            const nombre = titulo.textContent.trim();

            agregarAlCarrito(nombre, precio);
            alert("✔ Producto añadido: " + nombre);
        });
    });

    // ------------------------------------------------------
    // ACCESORIOS DEL MODAL (AHORA SOLO COMPRAN)
    // ------------------------------------------------------
    document.querySelectorAll(".añadirAccesorio").forEach(btn => {
        btn.addEventListener("click", () => {
            const nombre = btn.dataset.nombre;
            const precio = parseFloat(btn.dataset.precio);

            agregarAlCarrito(nombre, precio);
            alert("✔ Accesorio añadido al carrito");
        });
    });

    // ------------------------------------------------------
    // BOTÓN PAGAR — MUESTRA TOTAL
    // ------------------------------------------------------
    document.getElementById("btnPagar").addEventListener("click", () => {
        const total = carrito.reduce((s, x) => s + x.precio, 0);

        document.getElementById("pagoTotalTexto").textContent = "S/. " + total.toFixed(2);
        document.getElementById("puntosDisponiblesPago").textContent = puntos;
    });

    // Cambio tipo de pago
    document.getElementById("tipoPago").addEventListener("change", function () {
        const mixto = document.getElementById("pagoMixtoContainer");
        (this.value === "mixto") ? mixto.classList.remove("d-none") : mixto.classList.add("d-none");
    });

    // ------------------------------------------------------
    // CONFIRMAR PAGO
    // ------------------------------------------------------
    document.getElementById("confirmarPago").addEventListener("click", () => {
        const total = carrito.reduce((s, x) => s + x.precio, 0);
        const tipo = document.getElementById("tipoPago").value;

        let efectivoPagado = 0;
        let puntosPagados = 0;

        if (tipo === "efectivo") {
            efectivoPagado = total;

        } else if (tipo === "puntos") {
            const costoPuntos = Math.ceil(total / valorPunto);

            if (puntos < costoPuntos) {
                alert("❌ No tienes suficientes puntos");
                return;
            }

            puntos -= costoPuntos;
            puntosPagados = costoPuntos;
            actualizarPuntos();

        } else { // mixto
            const usar = parseInt(document.getElementById("puntosUsar").value);

            if (usar < 0 || usar > puntos) {
                alert("❌ Puntos inválidos.");
                return;
            }

            puntos -= usar;
            puntosPagados = usar;

            const descuento = usar * valorPunto;
            efectivoPagado = total - descuento;
            if (efectivoPagado < 0) efectivoPagado = 0;

            actualizarPuntos();
        }

        alert(
            "🎉 Pago exitoso!\n\n" +
            "💵 Efectivo: S/. " + efectivoPagado.toFixed(2) + "\n" +
            "💎 Puntos usados: " + puntosPagados
        );

        carrito = [];
        actualizarCarritoHTML();
    });

    // ------------------------------------------------------
    // EFECTO NAVBAR
    // ------------------------------------------------------
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // ------------------------------------------------------
    // CONTACTO (si existe)
    // ------------------------------------------------------
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener("submit", function (e) {
            e.preventDefault();
            alert("¡Mensaje enviado!");
            this.reset();
        });
    }

    // ------------------------------------------------------
    // ANIMACIONES
    // ------------------------------------------------------
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.product-card, .feature-box, .customization-card')
        .forEach(el => {
            el.style.opacity = "0";
            el.style.transform = "translateY(30px)";
            el.style.transition = "all .6s ease";
            observer.observe(el);
        });

});
