document.addEventListener('DOMContentLoaded', function () {
    // Verificar si estamos en la página correcta
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Variables globales para el 3D
    const textureLoader = new THREE.TextureLoader();
    let decalMesh = null;

    // --- 1. CONFIGURACIÓN DE LA ESCENA ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 18);

    // Configuración del Renderizador (Iluminación simplificada, sin sombras)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;

    // --- 2. ILUMINACIÓN (Añadimos una luz direccional suave para MeshStandardMaterial) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // --- 3. CONSTRUCCIÓN DEL TERMO MEJORADO ---
    const thermosGroup = new THREE.Group();

    // A. Materiales (Actualizados a MeshStandardMaterial)
    const metalnessInput = document.getElementById('metalness-input');
    const initialMetalness = metalnessInput ? parseFloat(metalnessInput.value) : 0.6; // Valor por defecto si no existe el input

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2ecc71,
        metalness: initialMetalness / 2, // Menos metálico que la tapa
        roughness: 0.5,
    });

    const lidMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: initialMetalness, // Aspecto metálico inicial
        roughness: 1.0 - initialMetalness, // Liso
    });

    // B. Geometría del Cuerpo Principal (Cilindro)
    const bodyHeight = 10;
    const bodyRadius = 2.5;
    const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 64);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = false;
    thermosGroup.add(bodyMesh);

    // C. Geometría de la Base (para un toque sutil)
    const baseGeometry = new THREE.SphereGeometry(bodyRadius, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.1);
    const baseMesh = new THREE.Mesh(baseGeometry, bodyMaterial);
    baseMesh.position.y = -bodyHeight / 2;
    thermosGroup.add(baseMesh);

    // D. Geometría de la Tapa (¡MEJORADA: Ahora tiene una cima plana!)
    const neckHeight = 0.5;
    const neckRadius = bodyRadius * 0.8;
    const neckY = bodyHeight / 2 + neckHeight / 2;
    const capTopY = bodyHeight / 2 + neckHeight; // Altura base de la tapa

    // 1. Cuello
    const neckGeometry = new THREE.CylinderGeometry(neckRadius, neckRadius, neckHeight, 64);
    const neckMesh = new THREE.Mesh(neckGeometry, lidMaterial);
    neckMesh.position.y = neckY;
    thermosGroup.add(neckMesh);

    // 2. Parte principal de la tapa (Más cilíndrica y plana)
    const capHeight = 1.0;
    const capRadius = bodyRadius * 1.05;
    const capGeometry = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 64, 1, false, 0, Math.PI * 2);
    const capMesh = new THREE.Mesh(capGeometry, lidMaterial);
    const capMeshY = capTopY + capHeight / 2;
    capMesh.position.y = capMeshY;
    thermosGroup.add(capMesh);

    // **Nueva altura total de la tapa (para el LCD):**
    const lcdBaseY = capTopY + capHeight;

    // E. Pantalla LCD MEJORADA (Ahora Circular en la Tapa Plana)
    const screenRadius = capRadius * 0.6; // Tamaño ajustado a la tapa plana
    const screenGeometry = new THREE.PlaneGeometry(screenRadius * 2, screenRadius * 2);
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 512;
    const screenContext = screenCanvas.getContext('2d');

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    const screenMaterial = new THREE.MeshBasicMaterial({
        map: screenTexture,
        side: THREE.FrontSide,
        emissive: 0x00ffff,
        emissiveIntensity: 2.5,
        transparent: true,
    });

    function updateScreenTexture(text) {
        const size = 512;
        const center = size / 2;
        const radius = size * 0.45;

        screenContext.clearRect(0, 0, size, size);

        screenContext.beginPath();
        screenContext.arc(center, center, radius, 0, Math.PI * 2);
        screenContext.fillStyle = '#000000';
        screenContext.fill();

        screenContext.lineWidth = 10;
        screenContext.strokeStyle = '#004444';
        screenContext.stroke();

        screenContext.fillStyle = '#00ffff';
        screenContext.font = 'bold 150px "DS-Digital", monospace';
        screenContext.textAlign = 'center';
        screenContext.textBaseline = 'middle';
        screenContext.fillText(text.toUpperCase(), center, center);

        if (screenMaterial.map) screenMaterial.map.needsUpdate = true;
    }

    updateScreenTexture("24°C");

    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);

    screenMesh.rotation.x = -Math.PI / 2; // Gira para que el plano mire hacia arriba
    // Posición Y: Justo encima de la cima plana de la tapa
    screenMesh.position.y = lcdBaseY + 0.01; // El 0.01 es para evitar Z-fighting

    thermosGroup.add(screenMesh);

    scene.add(thermosGroup);
    document.getElementById('loading-text').style.display = 'none';

    // --- 4. FUNCIÓN PARA APLICAR ENVOLTURA (WRAP) DE IMAGEN/TEXTURA (FUNCIÓN UNIFICADA) ---
    function applyBodyWrap(source, isFile, repeatTexture = false) {
        if (decalMesh) {
            thermosGroup.remove(decalMesh);
            decalMesh.geometry.dispose();
            decalMesh.material.dispose();
            decalMesh = null;
        }

        if (!source) {
            bodyMaterial.map = null;
            bodyMaterial.needsUpdate = true;
            document.getElementById('remove-decal-btn').disabled = true;
            return;
        }

        let url = source;
        if (isFile) {
            url = URL.createObjectURL(source);
        }

        textureLoader.load(url, function (texture) {
            if (repeatTexture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(2, 2);
            } else {
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.set(1, 1);
            }

            bodyMaterial.map = texture;
            bodyMaterial.needsUpdate = true;
            document.getElementById('remove-decal-btn').disabled = false;

            if (isFile) {
                URL.revokeObjectURL(url);
            }
        }, undefined, function (err) {
            console.error('Error al cargar la textura.', err);
            bodyMaterial.map = null;
            bodyMaterial.needsUpdate = true;
            document.getElementById('remove-decal-btn').disabled = true;
        });
    }

    // --- 5. ANIMACIÓN ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // --- 6. INTERACTIVIDAD (Event Listeners) ---

    // 6.1 Paleta de Colores del Cuerpo
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('input', function () {
            bodyMaterial.color.set(this.value);
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        });
    }

    // 6.2 Colores Preestablecidos del Cuerpo
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            colorBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const color = this.getAttribute('data-color');
            bodyMaterial.color.set(color);
            if (colorPicker) colorPicker.value = color;
        });
    });

    // 6.2.1 NUEVOS: Paleta y Colores Preestablecidos de la Tapa
    const lidColorPicker = document.getElementById('lid-color-picker');
    const lidColorBtns = document.querySelectorAll('.lid-color-btn');

    if (lidColorPicker) {
        lidColorPicker.addEventListener('input', function () {
            lidMaterial.color.set(this.value);
            document.querySelectorAll('.lid-color-btn').forEach(b => b.classList.remove('active'));
        });
    }

    lidColorBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            lidColorBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const color = this.getAttribute('data-color');
            lidMaterial.color.set(color);
            if (lidColorPicker) lidColorPicker.value = color;
        });
    });
    // FIN NUEVOS

    // 6.3 Cambio de Texto LCD
    const textInput = document.getElementById('lcd-text-input');
    textInput.addEventListener('input', function () {
        updateScreenTexture(this.value);
    });

    // 6.4 Cambio de Acabado (Metalness) - AHORA FUNCIONA CON MESHSTANDARDMATERIAL
    if (metalnessInput) {
        metalnessInput.addEventListener('change', function () {
            const metalnessValue = parseFloat(this.value);

            // Asignar el valor de metalness a la tapa y al cuerpo
            lidMaterial.metalness = metalnessValue;
            lidMaterial.roughness = 1.0 - metalnessValue;

            // El cuerpo es menos metálico
            bodyMaterial.metalness = metalnessValue / 2;
            bodyMaterial.roughness = 0.5; // El cuerpo se mantiene semi-rugoso

            lidMaterial.needsUpdate = true;
            bodyMaterial.needsUpdate = true;
        });
    }

    // 6.5 Aplicar Diseño (Patrones/Texturas repetitivas)
    const designInput = document.getElementById('design-input');
    // Nota: 'design-input' no existe en el HTML proporcionado, pero mantengo la lógica.
    if (designInput) {
        designInput.addEventListener('change', function () {
            const pattern = this.value;
            switch (pattern) {
                case 'none':
                    applyBodyWrap(null, false);
                    break;
                case 'stripes':
                    applyBodyWrap('https://i.imgur.com/g8o3b4G.png', false, true);
                    break;
                case 'dots':
                    applyBodyWrap('https://i.imgur.com/W2N3N0A.png', false, true);
                    break;
            }
        });
    }

    // 6.6 Subir Imagen del Usuario
    const imageUploadInput = document.getElementById('image-upload');
    const removeDecalBtn = document.getElementById('remove-decal-btn');

    imageUploadInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            applyBodyWrap(file, true, false);
        }
    });

    // 6.7 Quitar Diseño Subido
    removeDecalBtn.addEventListener('click', function () {
        applyBodyWrap(null, false);
        imageUploadInput.value = '';
    });

    // 6.8 Responsividad
    window.addEventListener('resize', function () {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
});