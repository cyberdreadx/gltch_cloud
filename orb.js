/**
 * GLTCH Orb - Three.js Pulsating Orb Visualization
 * Siri-like pulsating effect when GLTCH is thinking or speaking
 */

class GltchOrb {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Orb container not found:', containerId);
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.orb = null;
        this.particles = null;
        this.clock = new THREE.Clock();
        this.state = 'idle'; // idle, thinking, speaking

        this.init();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const width = this.container.clientWidth || 200;
        const height = this.container.clientHeight || 200;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.z = 5;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Create orb
        this.createOrb();

        // Create particle field
        this.createParticles();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xa855f7, 2, 10);
        pointLight.position.set(0, 0, 3);
        this.scene.add(pointLight);

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    createOrb() {
        // Custom shader for mystic glow effect
        const vertexShader = `
            uniform float uTime;
            uniform float uPulseIntensity;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            // Noise function for organic movement
            float noise(vec3 p) {
                return sin(p.x * 10.0 + uTime) * 
                       sin(p.y * 10.0 + uTime * 0.8) * 
                       sin(p.z * 10.0 + uTime * 1.2) * 0.5 + 0.5;
            }
            
            void main() {
                vNormal = normal;
                vPosition = position;
                
                // Organic pulse displacement
                float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
                float displacement = noise(position + uTime * 0.2) * uPulseIntensity * pulse;
                
                vec3 newPosition = position + normal * displacement * 0.15;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform float uPulseIntensity;
            uniform vec3 uBaseColor;
            uniform vec3 uGlowColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // Fresnel effect for edge glow
                vec3 viewDirection = normalize(cameraPosition - vPosition);
                float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
                
                // Animated color shift
                float colorShift = sin(uTime * 2.0) * 0.5 + 0.5;
                vec3 shiftedGlow = mix(uGlowColor, vec3(0.4, 0.2, 0.8), colorShift * 0.3);
                
                // Pulse glow
                float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
                float glowIntensity = 0.3 + pulse * uPulseIntensity * 0.7;
                
                // Core to edge gradient
                vec3 coreColor = uBaseColor;
                vec3 edgeColor = shiftedGlow * glowIntensity;
                
                vec3 finalColor = mix(coreColor, edgeColor, fresnel);
                
                // Alpha based on fresnel for ethereal look
                float alpha = 0.6 + fresnel * 0.4;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        const geometry = new THREE.SphereGeometry(1, 64, 64);

        this.orbMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uPulseIntensity: { value: 0.3 },
                uBaseColor: { value: new THREE.Color(0x1a0a2e) },
                uGlowColor: { value: new THREE.Color(0xa855f7) }
            },
            transparent: true,
            side: THREE.DoubleSide
        });

        this.orb = new THREE.Mesh(geometry, this.orbMaterial);
        this.scene.add(this.orb);

        // Inner glow sphere
        const innerGeo = new THREE.SphereGeometry(0.7, 32, 32);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0xa855f7,
            transparent: true,
            opacity: 0.2
        });
        const innerOrb = new THREE.Mesh(innerGeo, innerMat);
        this.orb.add(innerOrb);
    }

    createParticles() {
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            // Spherical distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 1.5 + Math.random() * 0.5;

            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xa855f7,
            size: 0.03,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    setState(state) {
        // idle, thinking, speaking
        this.state = state;

        switch (state) {
            case 'thinking':
                this.orbMaterial.uniforms.uPulseIntensity.value = 0.8;
                this.orbMaterial.uniforms.uGlowColor.value.setHex(0x06b6d4); // cyan
                break;
            case 'speaking':
                this.orbMaterial.uniforms.uPulseIntensity.value = 1.0;
                this.orbMaterial.uniforms.uGlowColor.value.setHex(0xa855f7); // purple
                break;
            default: // idle
                this.orbMaterial.uniforms.uPulseIntensity.value = 0.3;
                this.orbMaterial.uniforms.uGlowColor.value.setHex(0xa855f7); // purple
        }
    }

    animate() {
        if (!this.renderer) return;

        requestAnimationFrame(() => this.animate());

        const elapsed = this.clock.getElapsedTime();

        // Update shader uniforms
        if (this.orbMaterial) {
            this.orbMaterial.uniforms.uTime.value = elapsed;
        }

        // Rotate orb slowly
        if (this.orb) {
            this.orb.rotation.y = elapsed * 0.2;
            this.orb.rotation.x = Math.sin(elapsed * 0.3) * 0.1;
        }

        // Rotate particles
        if (this.particles) {
            this.particles.rotation.y = -elapsed * 0.1;
            this.particles.rotation.x = Math.cos(elapsed * 0.2) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.container) return;

        const width = this.container.clientWidth || 200;
        const height = this.container.clientHeight || 200;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Export for use
window.GltchOrb = GltchOrb;
